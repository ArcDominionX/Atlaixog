
import { MarketCoin } from '../types';
import { createClient } from '@supabase/supabase-js';
import { APP_CONFIG } from '../config';

// --- INITIALIZE SUPABASE ---
const supabase = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseServiceKey);

// Using DexScreener Public API
const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex/search';

// --- STRATEGY 1: LIQUIDITY ANCHOR REQUIREMENTS ---
const REQUIREMENTS = {
    MIN_LIQUIDITY_USD: 50000,    // REDUCED to $50k as requested
    MIN_VOLUME_24H: 10000,       // Reduced to catch early movers
    MIN_TXNS_24H: 25,            // Lower barrier for entry
    MIN_FDV: 5000,               // Allow micro-caps
    MAX_AGE_HOURS_FOR_NEW: 168   // 7 Days
};

// --- EXCLUSION LIST ---
// We exclude the anchors themselves so we only see the tokens trading AGAINST them.
const EXCLUDED_SYMBOLS = [
    'SOL', 'WSOL', 'ETH', 'WETH', 'BTC', 'WBTC', 'BNB', 'WBNB', 
    'USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'USDS', 'EURC', 'STETH', 'USDe', 'FDUSD',
    'RWA', 'TEST', 'DEBUG', 'WSTETH', 'CBETH', 'RETH', 'WRAPPED', 'MSOL', 'JITOSOL', 'SLERF'
];

// --- CHAIN & LIQUIDITY ANCHORS ---
// This list forces the API to scan specific chains by looking for their base money.
const TARGET_QUERIES = [
    // 1. SOLANA (Dominant Chain)
    'SOL', 
    'RAY',   // Raydium Pairs
    'PUMP',  // Pump.fun Pairs

    // 2. BSC (Binance Smart Chain)
    'WBNB',  // The main pair for 99% of BSC tokens
    'BSC',   // Text search for BSC chain

    // 3. BASE & ETHEREUM (Shared Liquidity)
    'WETH',  // Covers Ethereum AND Base (since Base uses WETH)
    'BASE',  // Explicit text search for Base chain
    'BRETT', // Top Base meme (often anchors other Base tokens)

    // 4. Universal Stables (DeFi on all chains)
    'USDC',
    'USDT'
];

// Helpers
const formatCurrency = (value: number) => {
    if (!value && value !== 0) return '$0.00';
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
};

const formatPrice = (price: string | number) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return '$0.00';
    if (num < 0.0001) return `$${num.toExponential(2)}`;
    if (num < 1.00) return `$${num.toFixed(6)}`;
    return `$${num.toFixed(2)}`;
};

const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

const getChainId = (chainId: string) => {
    if (chainId === 'solana') return 'solana';
    if (chainId === 'ethereum') return 'ethereum';
    if (chainId === 'bsc') return 'bsc';
    if (chainId === 'base') return 'base';
    return 'ethereum'; 
};

// API Response Types
interface DexPair {
    chainId: string;
    dexId: string;
    url: string;
    pairAddress: string;
    baseToken: { address: string; name: string; symbol: string; };
    quoteToken: { symbol: string; };
    priceUsd: string;
    priceChange: { h1: number; h24: number; h6: number; };
    liquidity?: { usd: number; };
    fdv?: number;
    volume: { h24: number; };
    txns: { h24: { buys: number; sells: number; } };
    pairCreatedAt?: number;
    info?: { imageUrl?: string; };
}

// Memory Cache to prevent API spamming
interface Cache {
    marketData: { data: MarketCoin[]; timestamp: number; } | null;
}
const cache: Cache = { marketData: null };
const CACHE_FRESH_DURATION = 15000; // 15s cache for "Live" feel

// --- ROBUST FETCH STRATEGY ---
const fetchWithFallbacks = async (query: string): Promise<any> => {
    const directUrl = `${DEXSCREENER_API_URL}?q=${query}`;
    try {
        const response = await fetch(directUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data || { pairs: [] };
    } catch (err) {
        return { pairs: [] };
    }
};

export const DatabaseService = {
    getMarketData: async (force: boolean = false): Promise<{ data: MarketCoin[], source: 'LIVE_API' | 'CACHE', latency: number }> => {
        const start = performance.now();
        
        // Serve from cache if fresh and not forced
        if (!force && cache.marketData) {
            const age = Date.now() - cache.marketData.timestamp;
            if (age < CACHE_FRESH_DURATION) {
                return {
                    data: cache.marketData.data,
                    source: 'CACHE',
                    latency: Math.round(performance.now() - start)
                };
            }
        }

        return await DatabaseService.forceRefresh(start);
    },

    forceRefresh: async (startTime: number = performance.now()): Promise<{ data: MarketCoin[], source: 'LIVE_API' | 'CACHE', latency: number }> => {
        try {
            // 1. Parallel Fetch of All Chain Anchors
            const results = await Promise.all(
                TARGET_QUERIES.map(q => fetchWithFallbacks(q))
            );

            let rawPairs: DexPair[] = [];
            results.forEach(result => {
                if (result && result.pairs) {
                    rawPairs = [...rawPairs, ...result.pairs];
                }
            });

            if (rawPairs.length === 0) throw new Error("No pairs returned");

            // 2. DEDUPLICATION
            rawPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

            const seenSymbols = new Set<string>();
            const bestPairs: DexPair[] = [];

            for (const p of rawPairs) {
                 const symbol = p.baseToken.symbol.toUpperCase();
                 
                 // Exclude anchors
                 if (EXCLUDED_SYMBOLS.includes(symbol)) continue;

                 if (seenSymbols.has(symbol)) continue;

                 // Must have logo
                 if (!p.info?.imageUrl) continue;

                 seenSymbols.add(symbol);
                 bestPairs.push(p);
            }

            // 3. APPLY $50k FILTER & CHAIN CHECK
            const filteredPairs = bestPairs.filter((p: DexPair) => {
                const liq = p.liquidity?.usd || 0;
                const vol = p.volume.h24 || 0;
                const txns = (p.txns?.h24?.buys || 0) + (p.txns?.h24?.sells || 0);

                if (liq < REQUIREMENTS.MIN_LIQUIDITY_USD) return false;
                if (vol < REQUIREMENTS.MIN_VOLUME_24H) return false;
                
                // Allow major chains
                const validChains = ['solana', 'ethereum', 'bsc', 'base'];
                if (!validChains.includes(p.chainId)) return false;

                return true;
            });

            // 4. Map to UI Model
            const processedData: MarketCoin[] = filteredPairs.map((pair, index) => {
                const buys = pair.txns?.h24?.buys || 0;
                const sells = pair.txns?.h24?.sells || 0;
                const totalTxns = buys + sells;
                
                const flowRatio = totalTxns > 0 ? (buys / totalTxns) : 0.5;
                const dexFlowScore = Math.round(flowRatio * 100);
                const estimatedNetFlow = (pair.volume.h24 * (flowRatio - 0.5)); 
                const netFlowStr = (estimatedNetFlow >= 0 ? '+' : '-') + formatCurrency(Math.abs(estimatedNetFlow));

                // Signals
                let signal: MarketCoin['signal'] = 'None';
                const priceChangeH1 = pair.priceChange?.h1 || 0;
                const priceChangeH24 = pair.priceChange?.h24 || 0;
                const ageHours = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) / (1000 * 60 * 60) : 999;
                
                if (ageHours < REQUIREMENTS.MAX_AGE_HOURS_FOR_NEW) signal = 'Volume Spike';
                else if (priceChangeH1 > 15) signal = 'Breakout';
                else if (buys > sells * 1.5) signal = 'Accumulation';

                const trend: MarketCoin['trend'] = priceChangeH24 >= 0 ? 'Bullish' : 'Bearish';
                const riskLevel: MarketCoin['riskLevel'] = (pair.liquidity?.usd || 0) < 100000 ? 'High' : 'Medium';
                const smartMoneySignal: MarketCoin['smartMoneySignal'] = estimatedNetFlow > 50000 ? 'Inflow' : estimatedNetFlow < -50000 ? 'Outflow' : 'Neutral';
                
                return {
                    id: index,
                    name: pair.baseToken.name,
                    ticker: pair.baseToken.symbol,
                    price: formatPrice(pair.priceUsd),
                    h1: `${(priceChangeH1).toFixed(2)}%`,
                    h24: `${(priceChangeH24).toFixed(2)}%`,
                    d7: `${(pair.priceChange?.h6 || 0).toFixed(2)}%`,
                    cap: formatCurrency(pair.fdv || pair.liquidity?.usd || 0),
                    liquidity: formatCurrency(pair.liquidity?.usd || 0),
                    volume24h: formatCurrency(pair.volume.h24),
                    dexBuys: buys.toString(),
                    dexSells: sells.toString(),
                    dexFlow: dexFlowScore,
                    netFlow: netFlowStr,
                    smartMoney: smartMoneySignal === 'Inflow' ? 'Inflow' : 'Neutral',
                    smartMoneySignal,
                    signal,
                    riskLevel,
                    age: pair.pairCreatedAt ? getTimeAgo(pair.pairCreatedAt) : 'Unknown',
                    createdTimestamp: pair.pairCreatedAt || Date.now(),
                    img: pair.info?.imageUrl || `https://ui-avatars.com/api/?name=${pair.baseToken.name}&background=random`,
                    trend,
                    chain: getChainId(pair.chainId),
                    address: pair.baseToken.address,
                    pairAddress: pair.pairAddress
                };
            });

            // 5. Sort: Newest + High Volume
            const sortedData = processedData.sort((a, b) => {
                // Priority to New Tokens
                if (a.createdTimestamp > Date.now() - (86400000 * 2)) return 1; // Prioritize < 48h
                // Then Volume
                const volA = parseFloat(a.volume24h.replace(/[$,KMB]/g, ''));
                const volB = parseFloat(b.volume24h.replace(/[$,KMB]/g, ''));
                return volB - volA;
            });

            // Ensure we return up to 100 items
            const finalData = sortedData.slice(0, 100);
            cache.marketData = { data: finalData, timestamp: Date.now() };

            return {
                data: finalData,
                source: 'LIVE_API',
                latency: Math.round(performance.now() - startTime)
            };

        } catch (error) {
            console.error("Critical: Data fetch failed.", error);
            return { data: [], source: 'CACHE', latency: 0 };
        }
    },

    getTokenDetails: async (query: string): Promise<any> => {
        const result = await fetchWithFallbacks(query);
        if (result && result.pairs && result.pairs.length > 0) {
            return result.pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        }
        return null;
    },
    
    // Background Check (Called by App.tsx)
    checkAndTriggerIngestion: async () => {
        if (!cache.marketData || (Date.now() - cache.marketData.timestamp > CACHE_FRESH_DURATION)) {
            await DatabaseService.forceRefresh();
        }
    }
};
