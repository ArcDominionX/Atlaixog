
import { MarketCoin } from '../types';

// Mock Data to simulate Database Content
const MOCK_MARKET_DATA: MarketCoin[] = [
    {id: 1, chain: 'bitcoin', name: 'Bitcoin', ticker: 'BTC', price: '$83,913.68', h1: '-0.28%', h24: '+2.57%', d7: '-12.39%', cap: '$1.67T', dexBuy: '$9.55M', dexSell: '$1.73M', dexFlow: 80, img: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', trend: 'Bullish'},
    {id: 2, chain: 'ethereum', name: 'Ethereum', ticker: 'ETH', price: '$2,717.22', h1: '-0.45%', h24: '+1.17%', d7: '-13.77%', cap: '$327B', dexBuy: '$7.12M', dexSell: '$0', dexFlow: 95, img: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', trend: 'Bearish'},
    {id: 3, chain: 'ethereum', name: 'Tether', ticker: 'USDT', price: '$0.99', h1: '+0.03%', h24: '+0.06%', d7: '+0.01%', cap: '$184B', dexBuy: '$48.32M', dexSell: '$43.61M', dexFlow: 55, img: 'https://cryptologos.cc/logos/tether-usdt-logo.png', trend: 'Bullish'},
    {id: 4, chain: 'xrp', name: 'XRP', ticker: 'XRP', price: '$1.91', h1: '-0.27%', h24: '+0.79%', d7: '-15.32%', cap: '$115B', dexBuy: '$2.41M', dexSell: '$250.14K', dexFlow: 70, img: 'https://cryptologos.cc/logos/xrp-xrp-logo.png', trend: 'Bearish'},
    {id: 5, chain: 'bnb', name: 'BNB', ticker: 'BNB', price: '$817', h1: '+0.02%', h24: '+1.04%', d7: '-12.32%', cap: '$112B', dexBuy: '$11.82M', dexSell: '$9.84M', dexFlow: 60, img: 'https://cryptologos.cc/logos/bnb-bnb-logo.png', trend: 'Bearish'},
    {id: 6, chain: 'solana', name: 'Solana', ticker: 'SOL', price: '$126.61', h1: '+1.20%', h24: '+4.57%', d7: '-5.39%', cap: '$58B', dexBuy: '$15.55M', dexSell: '$12.73M', dexFlow: 85, img: 'https://cryptologos.cc/logos/solana-sol-logo.png', trend: 'Bullish'},
    {id: 7, chain: 'cardano', name: 'Cardano', ticker: 'ADA', price: '$0.45', h1: '-0.10%', h24: '+0.57%', d7: '-10.39%', cap: '$15B', dexBuy: '$1.55M', dexSell: '$1.23M', dexFlow: 40, img: 'https://cryptologos.cc/logos/cardano-ada-logo.png', trend: 'Bearish'},
    {id: 8, chain: 'avalanche', name: 'Avalanche', ticker: 'AVAX', price: '$39.36', h1: '+0.50%', h24: '+2.17%', d7: '-8.39%', cap: '$14B', dexBuy: '$5.55M', dexSell: '$4.23M', dexFlow: 65, img: 'https://cryptologos.cc/logos/avalanche-avax-logo.png', trend: 'Bullish'},
    {id: 9, chain: 'dogecoin', name: 'Dogecoin', ticker: 'DOGE', price: '$0.15', h1: '-0.50%', h24: '+5.57%', d7: '-12.39%', cap: '$21B', dexBuy: '$12.55M', dexSell: '$10.73M', dexFlow: 75, img: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png', trend: 'Bullish'},
    {id: 10, chain: 'polkadot', name: 'Polkadot', ticker: 'DOT', price: '$7.80', h1: '+0.28%', h24: '+1.17%', d7: '-15.39%', cap: '$11B', dexBuy: '$3.55M', dexSell: '$3.73M', dexFlow: 45, img: 'https://cryptologos.cc/logos/polkadot-dot-logo.png', trend: 'Bearish'},
];

interface Cache {
    marketData: {
        data: MarketCoin[];
        timestamp: number;
    } | null;
}

const cache: Cache = {
    marketData: null
};

// 30 seconds fresh, but we can serve stale data up to 5 minutes
const CACHE_FRESH_DURATION = 30000; 

export const DatabaseService = {
    /**
     * Stale-While-Revalidate Implementation.
     * 1. If cache is fresh, return immediately.
     * 2. If cache exists but is stale, return it immediately BUT trigger a fetch in background.
     * 3. If no cache, wait for fetch.
     */
    getMarketData: async (): Promise<{ data: MarketCoin[], source: 'DB_SHARD_1' | 'CACHE' | 'STALE', latency: number }> => {
        const start = performance.now();
        
        // 1. Check Cache
        if (cache.marketData) {
            const age = Date.now() - cache.marketData.timestamp;
            
            // If data is fresh (< 30s), return it
            if (age < CACHE_FRESH_DURATION) {
                return {
                    data: cache.marketData.data,
                    source: 'CACHE',
                    latency: Math.round(performance.now() - start)
                };
            }
            
            // If data is stale (old but usable), return it but trigger revalidation
            console.log(`[DB] Data is stale (${Math.round(age/1000)}s old). Serving immediately, revalidating in background.`);
            
            // Background Fetch (Fire and Forget)
            DatabaseService.forceRefresh();

            return {
                data: cache.marketData.data,
                source: 'STALE',
                latency: Math.round(performance.now() - start)
            };
        }

        // 2. Cold Load (Simulate DB Call)
        return await DatabaseService.forceRefresh(start);
    },

    /**
     * Actual API fetcher
     */
    forceRefresh: async (startTime: number = performance.now()) => {
        // In a real app: await supabase.from('market_data_shard').select('*');
        await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network latency

        // Update Cache
        cache.marketData = {
            data: MOCK_MARKET_DATA,
            timestamp: Date.now()
        };

        const end = performance.now();
        return {
            data: MOCK_MARKET_DATA,
            source: 'DB_SHARD_1' as const,
            latency: Math.round(end - startTime)
        };
    },

    getUserPreferences: async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return { theme: 'dark', notifications: true };
    }
};
