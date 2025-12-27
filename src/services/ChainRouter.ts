
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
        chain: string; // Added chain identifier
    }[];
    recentActivity: RealActivity[];
    providerUsed: 'Moralis' | 'Cache' | 'Simulated';
    chainIcon: string;
    timestamp: number;
    isSimulated?: boolean;
}

// --- PERFORMANCE ENGINE ---

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

// --- SIMULATION ENGINE (FALLBACK) ---
const generateSimulatedData = (chain: string, address: string): PortfolioData => {
    const isSolana = chain.toLowerCase() === 'solana';
    const assets = [];
    let totalUsd = 0;

    if (isSolana) {
        assets.push({ symbol: 'SOL', balance: '142.5 SOL', value: '$24,520.40', price: '$172.40', logo: 'https://cryptologos.cc/logos/solana-sol-logo.png', address: 'So11111111111111111111111111111111111111112', chain: 'Solana' });
        assets.push({ symbol: 'USDC', balance: '5,420 USDC', value: '$5,420.00', price: '$1.00', logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', chain: 'Solana' });
        assets.push({ symbol: 'BONK', balance: '15.4M BONK', value: '$420.00', price: '$0.000024', logo: 'https://cryptologos.cc/logos/bonk1-bonk-logo.png', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', chain: 'Solana' });
        totalUsd = 30360.40;
    } else {
        assets.push({ symbol: 'ETH', balance: '4.2 ETH', value: '$12,420.50', price: '$2,950.20', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', chain: 'Ethereum' });
        assets.push({ symbol: 'USDT', balance: '8,500 USDT', value: '$8,500.00', price: '$1.00', logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', chain: 'Ethereum' });
        assets.push({ symbol: 'LINK', balance: '150 LINK', value: '$2,100.00', price: '$14.00', logo: 'https://cryptologos.cc/logos/chainlink-link-logo.png', address: '0x514910771af9ca656af840dff83e8264ecf986ca', chain: 'Ethereum' });
        totalUsd = 23020.50;
    }

    const activity: RealActivity[] = [
        { type: 'Buy', val: '10.5', asset: isSolana ? 'SOL' : 'ETH', desc: 'Bought on DEX', time: '2m ago', color: 'text-primary-green', usd: '$1,800', hash: '0x...sim1', wallet: address, tag: 'Simulation' },
        { type: 'Sell', val: '5000', asset: isSolana ? 'USDC' : 'USDT', desc: 'Sold for Profit', time: '4h ago', color: 'text-primary-red', usd: '$5,000', hash: '0x...sim2', wallet: address, tag: 'Simulation' },
        { type: 'Transfer', val: '500', asset: isSolana ? 'BONK' : 'LINK', desc: 'Received from CEX', time: '1d ago', color: 'text-text-light', usd: '$150', hash: '0x...sim3', wallet: address, tag: 'Simulation' }
    ];

    let chainIcon = 'https://cryptologos.cc/logos/ethereum-eth-logo.png';
    if (isSolana) chainIcon = 'https://cryptologos.cc/logos/solana-sol-logo.png';

    return {
        netWorth: `$${totalUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
        rawNetWorth: totalUsd,
        assets: assets,
        recentActivity: activity,
        providerUsed: 'Simulated',
        chainIcon,
        timestamp: Date.now(),
        isSimulated: true
    };
};

// --- MORALIS PROVIDER INTEGRATION ---

const fetchFromMoralis = async (chain: string, address: string): Promise<PortfolioData> => {
    
    // EVM Chains for Aggregation
    const EVM_CHAINS = ['Ethereum', 'BSC', 'Base', 'Polygon', 'Avalanche'];
    
    try {
        let balances: WalletBalance[] = [];
        let history: RealActivity[] = [];
        let isMultiChain = false;

        if (chain === 'All Chains' && address.startsWith('0x')) {
            isMultiChain = true;
            // 1. Fetch Balances from ALL chains in parallel
            // We intentionally don't fail if one chain fails
            const balancePromises = EVM_CHAINS.map(async (c) => {
                try {
                    const res = await MoralisService.getWalletBalances(address, c);
                    // Tag each balance with its chain
                    return res.map(b => ({ ...b, _chain: c }));
                } catch (e) {
                    return [];
                }
            });
            
            const results = await Promise.all(balancePromises);
            // Flatten
            balances = results.flat();

            // 2. Fetch Activity (Limit to top 3 chains to save bandwidth or just Ethereum/BSC/Base)
            // Fetching history for all 5 might be slow, let's do top 3 likely ones
            const historyPromises = ['Ethereum', 'Base', 'BSC'].map(c => MoralisService.getWalletTokenTransfers(address, c));
            const historyResults = await Promise.all(historyPromises);
            history = historyResults.flat().sort((a, b) => {
                // Approximate sort if time format is standardized, otherwise just concat
                return 0; 
            });

        } else {
            // Single Chain Fetch
            const balancesPromise = MoralisService.getWalletBalances(address, chain);
            const historyPromise = MoralisService.getWalletTokenTransfers(address, chain);
            [balances, history] = await Promise.all([balancesPromise, historyPromise]);
            
            // Tag logic for single chain
            balances = balances.map(b => ({ ...b, _chain: chain }));
        }
        
        // --- FALLBACK TRIGGER ---
        if ((!balances || balances.length === 0) && (!history || history.length === 0)) {
            console.warn("Wallet empty or API limit reached. Switching to Simulation Mode.");
            return generateSimulatedData(chain === 'All Chains' ? 'Ethereum' : chain, address);
        }
        
        let totalUsd = 0;
        const assets = balances.map((b: any) => {
            // Robust parsing
            const decimals = parseInt(b.decimals) || 18;
            const rawBalance = b.balance || '0';
            let bal = 0;
            try {
                bal = parseFloat(rawBalance) / Math.pow(10, decimals);
            } catch (e) { bal = 0; }

            // Price & Value Calculation
            let value = 0;
            let price = 0;
            
            if (b.usd_value) {
                // Moralis often provides pre-calculated USD value
                value = parseFloat(b.usd_value);
                if (bal > 0) price = value / bal;
            } else if (b.price_usd) {
                // If only price per token is available
                price = parseFloat(b.price_usd);
                value = bal * price;
            }
            
            // Safety Check
            if (isNaN(value)) value = 0;
            if (isNaN(price)) price = 0;
            
            totalUsd += value;

            return {
                symbol: b.symbol,
                balance: `${bal.toLocaleString(undefined, {maximumFractionDigits: 4})} ${b.symbol}`,
                value: `$${value.toLocaleString(undefined, {maximumFractionDigits: 2})}`,
                price: `$${price.toLocaleString(undefined, {maximumFractionDigits: 4})}`,
                logo: b.logo || `https://ui-avatars.com/api/?name=${b.symbol}&background=random`,
                address: b.token_address,
                chain: b._chain // Internal tag
            };
        }).sort((a, b) => parseFloat(b.value.replace('$','').replace(',','')) - parseFloat(a.value.replace('$','').replace(',','')));

        // Determine Chain Icon
        let chainIcon = 'https://cryptologos.cc/logos/ethereum-eth-logo.png';
        if (chain.toLowerCase() === 'solana') chainIcon = 'https://cryptologos.cc/logos/solana-sol-logo.png';
        if (chain === 'All Chains') chainIcon = 'https://cryptologos.cc/logos/ethereum-eth-logo.png'; // Use Eth as generic for now, or a globe icon in UI

        return {
            netWorth: `$${totalUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
            rawNetWorth: totalUsd,
            providerUsed: 'Moralis',
            timestamp: Date.now(),
            chainIcon: chainIcon,
            assets: assets,
            recentActivity: history
        };

    } catch (e) {
        console.error("API Error, returning simulated data:", e);
        return generateSimulatedData(chain, address);
    }
};

export const ChainRouter = {
    fetchPortfolio: async (chain: string, address: string): Promise<PortfolioData> => {
        // Normalize key for caching
        const normalizedChain = chain.toLowerCase();
        const requestKey = `moralis_${normalizedChain}_${address}`;

        return cacheManager.getOrFetch(requestKey, async () => {
            return fetchFromMoralis(chain, address);
        });
    }
};
