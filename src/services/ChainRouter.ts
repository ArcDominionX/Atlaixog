
import { MoralisService, WalletBalance, RealActivity } from './MoralisService';

export type ChainType = 'Solana' | 'Ethereum' | 'BSC' | 'Polygon' | 'Avalanche' | 'Base' | 'Arbitrum' | 'Optimism' | 'All Chains';

export interface PortfolioData {
    netWorth: string;
    rawNetWorth: number;
    assets: {
        symbol: string;
        balance: string;
        value: string;
        price: string;
        logo: string;
        address: string;
        chain: string; 
    }[];
    recentActivity: RealActivity[];
    providerUsed: 'Moralis' | 'Cache';
    chainIcon: string;
    timestamp: number;
}

// --- HELPERS ---
const safeFloat = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const parsed = parseFloat(val);
    if (isNaN(parsed) || !isFinite(parsed)) return 0;
    return parsed;
};

const safeInt = (val: any, defaultVal = 18): number => {
    if (val === null || val === undefined) return defaultVal;
    const parsed = parseInt(val);
    if (isNaN(parsed) || !isFinite(parsed)) return defaultVal;
    return parsed;
};

class SmartCache {
    private cache = new Map<string, { data: any; expiry: number }>();
    private pendingRequests = new Map<string, Promise<any>>();
    private TTL = 60 * 1000; 

    async getOrFetch(key: string, fetcher: () => Promise<any>): Promise<any> {
        const now = Date.now();
        if (this.cache.has(key)) {
            const entry = this.cache.get(key)!;
            if (entry.expiry > now) {
                return { ...entry.data, providerUsed: 'Cache' };
            }
        }

        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key);
        }

        const promise = fetcher().then((data) => {
            this.cache.set(key, { data, expiry: Date.now() + this.TTL });
            this.pendingRequests.delete(key);
            return data;
        }).catch(err => {
            this.pendingRequests.delete(key);
            throw err;
        });

        this.pendingRequests.set(key, promise);
        return promise;
    }
}

const cacheManager = new SmartCache();

// --- PRICE ENRICHMENT ENGINES ---

const enrichWithJupiter = async (tokens: WalletBalance[]): Promise<Map<string, number>> => {
    const priceMap = new Map<string, number>();
    const targets = tokens.filter(t => 
        (t.chain?.toLowerCase() === 'solana' || !t.chain) && 
        t.token_address && 
        t.token_address.length > 30 
    );

    if (targets.length === 0) return priceMap;

    const chunks = [];
    for (let i = 0; i < targets.length; i += 100) {
        chunks.push(targets.slice(i, i + 100));
    }

    try {
        const fetchPromises = chunks.map(chunk => {
            const ids = chunk.map(t => t.token_address).join(',');
            return fetch(`https://api.jup.ag/price/v2?ids=${ids}`)
                .then(r => r.json())
                .catch(() => ({ data: {} }));
        });

        const results = await Promise.all(fetchPromises);

        results.forEach(res => {
            if (res && res.data) {
                Object.keys(res.data).forEach(addr => {
                    const priceData = res.data[addr];
                    if (priceData && priceData.price) {
                        priceMap.set(addr, safeFloat(priceData.price));
                    }
                });
            }
        });
    } catch (e) {
        console.warn("Jupiter price fetch failed:", e);
    }

    return priceMap;
};

const enrichWithDexScreener = async (tokens: WalletBalance[]): Promise<Map<string, number>> => {
    const priceMap = new Map<string, number>();
    const targets = tokens.filter(t => 
        t.token_address && 
        t.token_address.startsWith('0x') && 
        (!t.price_usd || t.price_usd === 0)
    );

    if (targets.length === 0) return priceMap;

    const chunks = [];
    for (let i = 0; i < targets.length; i += 30) {
        chunks.push(targets.slice(i, i + 30));
    }

    try {
        const fetchPromises = chunks.map(chunk => {
            const addresses = chunk.map(t => t.token_address).join(',');
            return fetch(`https://api.dexscreener.com/latest/dex/tokens/${addresses}`)
                .then(r => r.json())
                .catch(() => ({ pairs: [] }));
        });

        const results = await Promise.all(fetchPromises);
        
        results.forEach(data => {
            if (data && data.pairs) {
                data.pairs.forEach((pair: any) => {
                    const addr = pair.baseToken.address.toLowerCase();
                    if (!priceMap.has(addr) || (pair.liquidity?.usd > 10000)) {
                        const p = safeFloat(pair.priceUsd);
                        priceMap.set(addr, p);
                        priceMap.set(pair.baseToken.address, p);
                    }
                });
            }
        });
    } catch (e) {
        console.warn("DexScreener price fetch failed:", e);
    }

    return priceMap;
};

const fetchFromMoralis = async (chain: string, address: string): Promise<PortfolioData> => {
    const EVM_CHAINS = ['Ethereum', 'BSC', 'Base', 'Polygon', 'Avalanche'];
    let chainIcon = 'https://cryptologos.cc/logos/ethereum-eth-logo.png';
    if (chain.toLowerCase() === 'solana') chainIcon = 'https://cryptologos.cc/logos/solana-sol-logo.png';
    
    try {
        let balances: WalletBalance[] = [];
        let history: RealActivity[] = [];

        if (chain === 'All Chains' && address.startsWith('0x')) {
            const balancePromises = EVM_CHAINS.map(async (c) => {
                try {
                    const res = await MoralisService.getWalletBalances(address, c);
                    return res.map(b => ({ ...b, chain: c })); 
                } catch (e) { return []; }
            });
            const results = await Promise.all(balancePromises);
            balances = results.flat();
            
            const historyPromises = ['Ethereum', 'Base'].map(c => MoralisService.getWalletTokenTransfers(address, c));
            const historyResults = await Promise.all(historyPromises);
            history = historyResults.flat();

        } else {
            const balancesPromise = MoralisService.getWalletBalances(address, chain);
            const historyPromise = MoralisService.getWalletTokenTransfers(address, chain);
            [balances, history] = await Promise.all([balancesPromise, historyPromise]);
            balances = balances.map(b => ({ ...b, chain: chain }));
        }
        
        // STRICT MODE: NO SIMULATION. Return empty if nothing found.
        if ((!balances || balances.length === 0) && (!history || history.length === 0)) {
            return {
                netWorth: 'N/A',
                rawNetWorth: 0,
                assets: [],
                recentActivity: [],
                providerUsed: 'Moralis',
                chainIcon,
                timestamp: Date.now()
            };
        }

        let solanaPrices = new Map<string, number>();
        let evmPrices = new Map<string, number>();

        const solanaTokens = balances.filter(b => b.chain?.toLowerCase() === 'solana' || (!b.chain && !b.token_address.startsWith('0x')));
        const evmTokens = balances.filter(b => b.token_address.startsWith('0x'));

        const [solPrices, dexPrices] = await Promise.all([
            enrichWithJupiter(solanaTokens),
            enrichWithDexScreener(evmTokens)
        ]);
        
        solanaPrices = solPrices;
        evmPrices = dexPrices;

        let totalUsd = 0;
        
        const assets = balances.map((b: any) => {
            const decimals = safeInt(b.decimals, 18);
            const rawBalanceStr = b.balance || b.amount || '0';
            let bal = 0;
            const parsedRaw = parseFloat(rawBalanceStr);
            if (!isNaN(parsedRaw) && isFinite(parsedRaw)) {
                bal = parsedRaw / Math.pow(10, decimals);
            }
            if (!isFinite(bal) || bal > 1e15) bal = 0;

            // --- PRICING ENGINE ---
            let price = 0;
            
            // 1. Prefer Moralis if reliable
            if (b.price_usd && b.price_usd > 0) {
                price = safeFloat(b.price_usd);
            } 
            // 2. Fallback to Jupiter (Solana)
            else if (solanaPrices.has(b.token_address)) {
                price = solanaPrices.get(b.token_address) || 0;
            }
            // 3. Fallback to DexScreener (EVM)
            else if (evmPrices.has(b.token_address) || evmPrices.has(b.token_address.toLowerCase())) {
                price = evmPrices.get(b.token_address) || evmPrices.get(b.token_address.toLowerCase()) || 0;
            }
            // 4. Last resort: implied value
            else if (b.usd_value && b.usd_value > 0 && bal > 0) {
                price = safeFloat(b.usd_value) / bal;
            }

            // --- VALUE CALCULATION ---
            let value = bal * price;
            if (isNaN(value) || !isFinite(value)) value = 0;
            
            totalUsd += value;

            // Strict display logic: "N/A" if price/value missing
            const priceStr = price > 0 ? `$${price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}` : 'N/A';
            const valueStr = price > 0 ? `$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 'N/A';

            return {
                symbol: b.symbol || 'UNK',
                balance: `${bal.toLocaleString(undefined, {maximumFractionDigits: 4})} ${b.symbol}`,
                value: valueStr,
                price: priceStr,
                logo: b.logo || `https://ui-avatars.com/api/?name=${b.symbol}&background=random`,
                address: b.token_address,
                chain: b.chain,
                rawValue: value
            };
        })
        .filter(a => a.rawValue > 0 || (a.balance !== '0' && a.balance.includes(' '))) 
        .sort((a, b) => b.rawValue - a.rawValue);

        
        const cleanAssets = assets.map(({rawValue, ...rest}) => rest);

        return {
            netWorth: totalUsd > 0 ? `$${totalUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 'N/A',
            rawNetWorth: totalUsd,
            providerUsed: 'Moralis',
            timestamp: Date.now(),
            chainIcon: chainIcon,
            assets: cleanAssets,
            recentActivity: history.sort((a, b) => 0) 
        };

    } catch (e) {
        console.error("API Error, returning N/A state:", e);
        // STRICT MODE: NO SIMULATION. Return N/A.
        return {
            netWorth: 'N/A',
            rawNetWorth: 0,
            assets: [],
            recentActivity: [],
            providerUsed: 'Moralis',
            chainIcon: chainIcon,
            timestamp: Date.now()
        };
    }
};

export const ChainRouter = {
    fetchPortfolio: async (chain: string, address: string): Promise<PortfolioData> => {
        const normalizedChain = chain.toLowerCase();
        const requestKey = `moralis_${normalizedChain}_${address}`;

        return cacheManager.getOrFetch(requestKey, async () => {
            return fetchFromMoralis(chain, address);
        });
    }
};
