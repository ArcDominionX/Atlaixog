
import { MarketCoin } from '../types';
import { createClient } from '@supabase/supabase-js';
import { APP_CONFIG } from '../config';

// --- INITIALIZE SUPABASE ---
const supabase = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey);

// Using DexScreener Public API
const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex/search';

// --- RESEARCH & GEM REQUIREMENTS ---
const REQUIREMENTS = {
    // LOWERED THRESHOLD: Real "Alpha" often starts at $10k-$15k liquidity (e.g. Pump.fun migrations)
    MIN_LIQUIDITY_USD: 10000,    
    // LOWERED THRESHOLD: Ensure we catch early movers
    MIN_VOLUME_24H: 5000,       
    MIN_TXNS_24H: 10,            
    MIN_FDV: 2000,               
    MAX_AGE_HOURS_FOR_NEW: 48    
};

// --- EXCLUSION LIST ---
// We filter these out as "Primary" tokens, but we look for tokens TRADING AGAINST them.
const EXCLUDED_SYMBOLS = [
    'SOL', 'WSOL', 'ETH', 'WETH', 'BTC', 'WBTC', 'BNB', 'WBNB', 
    'USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'USDS', 'EURC', 'STETH', 
    'USDE', 'FDUSD', 'WRAPPED', 'MSOL', 'JITOSOL', 'SLERF'
];

// --- DISCOVERY QUERIES ---
// Expanded list to cast a wider net for new pairs.
// DexScreener search is fuzzy, so generic terms help find new pairs.
const TARGET_QUERIES = [
    // Ecosystems
    'SOL', 'BASE', 'BSC', 'ETH', 'ARBITRUM', 'POLYGON',
    // Trending Tickers (Finds pairs sharing the name)
    'PUMP', 'RAY', 'WIF', 'BONK', 'PEPE', 'MOG', 'POPCAT', 'GOAT', 'MOODENG', 'ACT', 'PNUT',
    'VIRTUAL', 'SPX', 'GIGA', 'FWOG', 'TRUMP', 'MELANIA', 'TURBO', 'NEIRO',
    // Generic Alpha Terms (Finds "Baby...", "Super...", "AI...")
    'AI', 'AGENT', 'MEME', 'CAT', 'DOG', 'INU', 'ELON', 'PEPE', 'BETA', 'SAFE', 'MOON', 'DAO', 'GAMING', 'DEPIN'
];

// --- SMART ROTATION STATE ---
let currentQueryIndex = 0;
const BATCH_SIZE_BACKGROUND = 4; // Requests per background tick
const BATCH_SIZE_FULL = 6; // Concurrent requests for full refresh

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

interface Cache {
    marketData: { data: MarketCoin[]; timestamp: number; } | null;
}
const cache: Cache = { marketData: null };
const CACHE_FRESH_DURATION = 30000; // 30s cache

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

// Helper to batch promises
const chunkArray = (arr: string[], size: number) => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
    );
};

export const DatabaseService = {
    /**
     * Main data fetching function.
     * @param force - Ignore cache and fetch live
     * @param partial - If true, only scan a subset of queries (Background Mode)
     */
    getMarketData: async (force: boolean = false, partial: boolean = false): Promise<{ data: MarketCoin[], source: 'LIVE_API' | 'CACHE' | 'SUPABASE', latency: number }> => {
        const start = performance.now();
        
        // Serve from cache if fresh AND we are not in partial background mode
        if (!force && !partial && cache.marketData) {
            const age = Date.now() - cache.marketData.timestamp;
            if (age < CACHE_FRESH_DURATION) {
                return {
                    data: cache.marketData.data,
                    source: 'CACHE',
                    latency: Math.round(performance.now() - start)
                };
            }
        }

        try {
            // Step 1: Get History from Supabase (Background of previous scans)
            const dbPromise = DatabaseService.fetchFromSupabase();
            
            // Step 2: Live Fetch Logic
            // Determine which queries to run
            let queriesToRun: string[] = [];
            
            if (partial) {
                // INCREMENTAL SCAN: Only pick the next batch
                const end = Math.min(currentQueryIndex + BATCH_SIZE_BACKGROUND, TARGET_QUERIES.length);
                queriesToRun = TARGET_QUERIES.slice(currentQueryIndex, end);
                
                // Update index for next time (Wrap around)
                currentQueryIndex = end >= TARGET_QUERIES.length ? 0 : end;
            } else {
                // FULL SCAN (Initial Load)
                queriesToRun = TARGET_QUERIES;
            }

            // Execute Live Fetch
            const chunks = chunkArray(queriesToRun, BATCH_SIZE_FULL);
            let apiResults: any[] = [];
            
            for (const chunk of chunks) {
                const chunkResults = await Promise.all(chunk.map(q => fetchWithFallbacks(q)));
                apiResults = [...apiResults, ...chunkResults];
                if (!partial) await new Promise(r => setTimeout(r, 50)); // Tiny delay to prevent rate limits
            }

            let rawPairs: DexPair[] = [];
            apiResults.forEach(result => {
                if (result && result.pairs) {
                    rawPairs = [...rawPairs, ...result.pairs];
                }
            });

            // Step 3: Filter & Cleanup
            const seenSymbols = new Set<string>();
            const bestPairs: DexPair[] = [];

            // Sort raw pairs by liquidity first to prioritize the "real" pair
            rawPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

            for (const p of rawPairs) {
                 const symbol = p.baseToken.symbol.toUpperCase();
                 
                 // Filter logic
                 if (EXCLUDED_SYMBOLS.includes(symbol)) continue; 
                 if (seenSymbols.has(symbol)) continue;
                 // Note: Removed Strict Image Check. Some brand new alpha doesn't have a logo yet.
                 // if (!p.info?.imageUrl) continue;
                 
                 seenSymbols.add(symbol);
                 bestPairs.push(p);
            }

            const liveFilteredPairs = bestPairs.filter((p: DexPair) => {
                const liq = p.liquidity?.usd || 0;
                const vol = p.volume.h24 || 0;
                // Relaxed Filters
                if (liq < REQUIREMENTS.MIN_LIQUIDITY_USD) return false;
                if (vol < REQUIREMENTS.MIN_VOLUME_24H) return false;
                
                const validChains = ['solana', 'ethereum', 'bsc', 'base'];
                if (!validChains.includes(p.chainId)) return false;
                return true;
            });

            const liveTokens: MarketCoin[] = liveFilteredPairs.map(p => DatabaseService.transformPair(p));

            // Step 4: MERGE Logic
            const dbTokens = await dbPromise;
            const tokenMap = new Map<string, MarketCoin>();
            
            // 1. Fill map with DB History
            dbTokens.forEach(t => tokenMap.set(t.address, t));
            
            // 2. Overwrite with Live Data found in this scan (Live data is fresher)
            liveTokens.forEach(t => tokenMap.set(t.address, t));
            
            const mergedList = Array.from(tokenMap.values());

            // Step 5: Sorting Strategy
            // We want NEW tokens, but also HIGH VOLUME tokens. 
            const sortedData = mergedList.sort((a, b) => {
                // If created in last 24h, give massive boost
                const now = Date.now();
                const isNewA = (now - a.createdTimestamp) < 86400000;
                const isNewB = (now - b.createdTimestamp) < 86400000;

                if (isNewA && !isNewB) return -1;
                if (!isNewA && isNewB) return 1;

                // Otherwise sort by Volume
                const volA = parseFloat(a.volume24h.replace(/[$,KMB]/g, '')) * (a.volume24h.includes('M') ? 1000000 : a.volume24h.includes('K') ? 1000 : 1);
                const volB = parseFloat(b.volume24h.replace(/[$,KMB]/g, '')) * (b.volume24h.includes('M') ? 1000000 : b.volume24h.includes('K') ? 1000 : 1);
                return volB - volA;
            });

            const finalData = sortedData.slice(0, 150);

            // Step 6: SYNC TO SUPABASE (Background)
            if (liveTokens.length > 0) {
                DatabaseService.syncToSupabase(liveTokens).catch(err => console.warn("Background Sync Error:", err));
            }

            // Update Cache
            cache.marketData = { data: finalData, timestamp: Date.now() };

            return {
                data: finalData,
                source: liveTokens.length > 0 ? 'LIVE_API' : 'SUPABASE',
                latency: Math.round(performance.now() - start)
            };

        } catch (error) {
            console.error("Critical: Data fetch failed.", error);
            // Fallback to purely Supabase if API fails
            const stored = await DatabaseService.fetchFromSupabase();
            return { data: stored, source: 'SUPABASE', latency: 0 };
        }
    },

    transformPair: (pair: DexPair, index: number = 0): MarketCoin => {
        const buys = pair.txns?.h24?.buys || 0;
        const sells = pair.txns?.h24?.sells || 0;
        const totalTxns = buys + sells;
        const flowRatio = totalTxns > 0 ? (buys / totalTxns) : 0.5;
        const dexFlowScore = Math.round(flowRatio * 100);
        const estimatedNetFlow = (pair.volume.h24 * (flowRatio - 0.5)); 
        const netFlowStr = (estimatedNetFlow >= 0 ? '+' : '-') + formatCurrency(Math.abs(estimatedNetFlow));

        let signal: MarketCoin['signal'] = 'None';
        const priceChangeH1 = pair.priceChange?.h1 || 0;
        const priceChangeH24 = pair.priceChange?.h24 || 0;
        const ageHours = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) / (1000 * 60 * 60) : 999;
        
        if (ageHours < REQUIREMENTS.MAX_AGE_HOURS_FOR_NEW) signal = 'Volume Spike';
        else if (priceChangeH1 > 15) signal = 'Breakout';
        else if (buys > sells * 1.5) signal = 'Accumulation';

        const trend: MarketCoin['trend'] = priceChangeH24 >= 0 ? 'Bullish' : 'Bearish';
        const riskLevel: MarketCoin['riskLevel'] = (pair.liquidity?.usd || 0) < 50000 ? 'High' : 'Medium';
        const smartMoneySignal: MarketCoin['smartMoneySignal'] = estimatedNetFlow > 25000 ? 'Inflow' : estimatedNetFlow < -25000 ? 'Outflow' : 'Neutral';

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
            // Fallback image if missing
            img: pair.info?.imageUrl || `https://ui-avatars.com/api/?name=${pair.baseToken.symbol}&background=random&color=fff`,
            trend,
            chain: getChainId(pair.chainId),
            address: pair.baseToken.address,
            pairAddress: pair.pairAddress
        };
    },

    syncToSupabase: async (tokens: MarketCoin[]) => {
        try {
            if (!tokens.length) return;
            const dbPayload = tokens.map(t => ({
                address: t.address, 
                ticker: t.ticker,
                name: t.name,
                chain: t.chain,
                price: t.price,
                liquidity: t.liquidity,
                volume_24h: t.volume24h,
                last_seen_at: new Date(), // Updates the timestamp
                raw_data: t 
            }));

            const { error } = await supabase
                .from('discovered_tokens')
                .upsert(dbPayload, { onConflict: 'address' });
            
            if (error) console.warn("Supabase Sync Warning:", error.message);
        } catch (e) {
            console.warn("Supabase Sync skipped"); 
        }
    },

    fetchFromSupabase: async (): Promise<MarketCoin[]> => {
        try {
            // Increased limit to 300 to show more history if API is quiet
            const { data, error } = await supabase
                .from('discovered_tokens')
                .select('*')
                .order('last_seen_at', { ascending: false })
                .limit(300);

            if (error || !data) return [];
            return data.map((row: any) => row.raw_data as MarketCoin);
        } catch (e) {
            return [];
        }
    },

    getTokenDetails: async (query: string): Promise<any> => {
        const result = await fetchWithFallbacks(query);
        if (result && result.pairs && result.pairs.length > 0) {
            return result.pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        }
        return null;
    },
    
    checkAndTriggerIngestion: async () => {
        await DatabaseService.getMarketData(true, true);
    }
};
