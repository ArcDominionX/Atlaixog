
import { MoralisService, WalletBalance, RealActivity } from './MoralisService';

export type ChainType = 'Solana' | 'Ethereum' | 'BSC' | 'Polygon' | 'Avalanche' | 'Base' | 'Arbitrum' | 'Optimism' | 'All Chains';

export interface PortfolioData {
    netWorth: string;
    rawNetWorth: number; // Added for charts
    assets: {
        symbol: string;
        balance: string;
        value: string;
        price: string;
        logo: string;
    }[];
    recentActivity: RealActivity[];
    providerUsed: 'Moralis' | 'Cache';
    chainIcon: string;
    timestamp: number;
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

// --- MORALIS PROVIDER INTEGRATION ---

/**
 * Universal fetcher that routes all requests to the Moralis Data API.
 */
const fetchFromMoralis = async (chain: string, address: string): Promise<PortfolioData> => {
    
    // 1. Fetch Real Balances
    const balances: WalletBalance[] = await MoralisService.getWalletBalances(address, chain);
    
    // 2. Fetch Real Activity
    // Uses the MoralisService which handles API calls or falls back to simulation if key is invalid
    const history: RealActivity[] = await MoralisService.getWalletTokenTransfers(address, chain);
    
    let totalUsd = 0;
    const assets = balances.map(b => {
        const decimals = b.decimals || 18;
        const bal = parseFloat(b.balance) / Math.pow(10, decimals);
        // Estimate price if missing (fallback logic)
        const price = b.price_usd || (b.usd_value && bal > 0 ? b.usd_value / bal : 0);
        const value = b.usd_value || (bal * price);
        
        totalUsd += value;

        return {
            symbol: b.symbol,
            balance: `${bal.toLocaleString(undefined, {maximumFractionDigits: 4})} ${b.symbol}`,
            value: `$${value.toLocaleString(undefined, {maximumFractionDigits: 2})}`,
            price: `$${price.toLocaleString(undefined, {maximumFractionDigits: 4})}`,
            logo: b.logo || `https://ui-avatars.com/api/?name=${b.symbol}&background=random`
        };
    }).sort((a, b) => parseFloat(b.value.replace('$','').replace(',','')) - parseFloat(a.value.replace('$','').replace(',','')));

    // Determine Chain Icon
    let chainIcon = 'https://cryptologos.cc/logos/ethereum-eth-logo.png';
    if (chain.toLowerCase() === 'solana') chainIcon = 'https://cryptologos.cc/logos/solana-sol-logo.png';
    if (chain.toLowerCase() === 'bsc') chainIcon = 'https://cryptologos.cc/logos/bnb-bnb-logo.png';

    return {
        netWorth: `$${totalUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
        rawNetWorth: totalUsd,
        providerUsed: 'Moralis',
        timestamp: Date.now(),
        chainIcon: chainIcon,
        assets: assets,
        recentActivity: history
    };
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
