
export type ChainType = 'Solana' | 'Ethereum' | 'BSC' | 'Polygon' | 'Avalanche' | 'Base' | 'Arbitrum' | 'Optimism' | 'All Chains';

export interface PortfolioData {
    netWorth: string;
    assets: {
        symbol: string;
        balance: string;
        value: string;
        price: string;
        logo: string;
    }[];
    recentActivity: {
        type: string;
        desc: string;
        time: string;
        hash: string;
    }[];
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
 * Moralis automatically handles chain switching via its 'chain' parameter.
 */
const fetchFromMoralis = async (chain: string, address: string): Promise<PortfolioData> => {
    // Simulate API Network Latency
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const normalizedChain = chain.toLowerCase();
    
    // Default Data Structure (to be populated by real API response)
    let chainIcon = 'https://cryptologos.cc/logos/ethereum-eth-logo.png';
    let netWorth = '$0.00';
    let assets = [];
    let activity = [];

    // Simulate different responses based on chain input
    if (normalizedChain.includes('solana')) {
        chainIcon = 'https://cryptologos.cc/logos/solana-sol-logo.png';
        netWorth = '$45,200.00';
        assets = [
            { symbol: 'SOL', balance: '250 SOL', value: '$36,250', price: '$145.00', logo: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
            { symbol: 'JUP', balance: '5,000 JUP', value: '$5,500', price: '$1.10', logo: 'https://cryptologos.cc/logos/jupiter-ag-jup-logo.png' },
            { symbol: 'BONK', balance: '150M BONK', value: '$3,450', price: '$0.000023', logo: 'https://cryptologos.cc/logos/bonk1-bonk-logo.png' }
        ];
        activity = [
            { type: 'SWAP', desc: 'Swapped SOL for USDC', time: '10 mins ago', hash: '5x...9z' },
            { type: 'TRANSFER', desc: 'Received 10 SOL', time: '2 hours ago', hash: '2a...b1' }
        ];
    } else if (normalizedChain.includes('bsc') || normalizedChain.includes('bnb')) {
        chainIcon = 'https://cryptologos.cc/logos/bnb-bnb-logo.png';
        netWorth = '$62,800.00';
        assets = [
            { symbol: 'BNB', balance: '85 BNB', value: '$51,000', price: '$600', logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
            { symbol: 'CAKE', balance: '3,500 CAKE', value: '$10,500', price: '$3.00', logo: 'https://cryptologos.cc/logos/pancakeswap-cake-logo.png' }
        ];
        activity = [
             { type: 'STAKE', desc: 'Staked BNB in Vault', time: '1 day ago', hash: '0x...88a' }
        ];
    } else {
        // Ethereum / EVM Default
        chainIcon = 'https://cryptologos.cc/logos/ethereum-eth-logo.png';
        netWorth = '$210,000.00';
        assets = [
            { symbol: 'ETH', balance: '45 ETH', value: '$139,500', price: '$3,100', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
            { symbol: 'USDT', balance: '50,000 USDT', value: '$50,000', price: '$1.00', logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
            { symbol: 'UNI', balance: '2,500 UNI', value: '$20,500', price: '$8.20', logo: 'https://cryptologos.cc/logos/uniswap-uni-logo.png' }
        ];
        activity = [
            { type: 'APPROVE', desc: 'Approved USDT for Swap', time: '5 mins ago', hash: '0x...11b' },
            { type: 'SWAP', desc: 'Swapped ETH for USDT', time: '12 mins ago', hash: '0x...df8' }
        ];
    }

    return {
        netWorth: netWorth,
        providerUsed: 'Moralis',
        timestamp: Date.now(),
        chainIcon: chainIcon,
        assets: assets,
        recentActivity: activity
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
