
import { MarketCoin } from '../types';
import { createClient } from '@supabase/supabase-js';
import { APP_CONFIG } from '../config';

// --- INITIALIZE SUPABASE ---
const supabase = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseServiceKey);

// Using DexScreener Public API
const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex/search';

// --- RESEARCH & GEM REQUIREMENTS (OPTIMIZED FOR LIVE ALPHA) ---
const REQUIREMENTS = {
    MIN_LIQUIDITY_USD: 50000,    // REDUCED to $50k as requested
    MIN_VOLUME_24H: 10000,       // Reduced from 75k to 10k to catch "Just Launched" tokens
    MIN_TXNS_24H: 25,            // Reduced to catch early activity
    MIN_FDV: 5000,               // Reduced to allow micro-caps
    MAX_AGE_HOURS_FOR_NEW: 168   // 7 Days
};

// --- EXCLUSION LIST ---
const EXCLUDED_SYMBOLS = [
    'USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'USDS', 'EURC', 'STETH', 'USDe', 'FDUSD',
    'RWA', 'TEST', 'DEBUG', 'WSTETH', 'CBETH', 'RETH', 'WRAPPED', 'MSOL', 'JITOSOL'
];

// --- DISCOVERY QUERIES (High Frequency) ---
const TARGET_QUERIES = [
    // 1. Broad Ecosystems (These return the most results)
    'SOLANA', 'ETHEREUM', 'BASE', 'BSC', 'ARBITRUM', 'AVALANCHE',
    
    // 2. High Volume Anchors
    'SOL', 'WETH', 'WBNB', 'PEPE', 'WIF', 'BONK', 'PUMP',
    
    // 3. Trending Narratives
    'AI', 'AGENT', 'MEME', 'CAT', 'DOG', 'TRUMP', 'ELON', 'GAMING',
    
    // 4. Specific Tickers
    'BRETT', 'MOG', 'POPCAT', 'GOAT', 'MOODENG', 'PNUT', 'ACT', 'LUCE',
    'VIRTUAL', 'SPX', 'GIGA', 'FWOG', 'MEW', 'TURBO', 'NEIRO', 'DEGEN'
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
    if (num < 0.000001) return `$${num.toExponential(2)}`;
    if (num < 0.01) return `$${num.toFixed(6)}`;
    return `$${num.toFixed(2)}`;
};

const getTimeAgo = (timestamp: string | number) => {
    const date = new Date(timestamp);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
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

// Utility: Sleep to prevent API Rate Limits
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Utility: Shuffle Array
const shuffleArray = (array: string[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

// --- API FETCH HELPER ---
const fetchWithFallbacks = async (query: string): Promise<any> => {
    const directUrl = `${DEXSCREENER_API_URL}?q=${query}`;
    try {
        const response = await fetch(directUrl);
        if (!response.ok) return { pairs: [] };
        const data = await response.json();
        return data || { pairs: [] };
    } catch (err) {
        return { pairs: [] };
    }
};

// --- IN-MEMORY CACHE (For speed) ---
let memoryCache: MarketCoin[] = [];
let lastFetch = 0;

export const DatabaseService = {
    
    // 1. MAIN FUNCTION CALLED BY DASHBOARD
    getMarketData: async (forceRefresh: boolean = false): Promise<{ data: MarketCoin[], source: string, latency: number }> => {
        const start = performance.now();

        // Use memory cache if fresh ( < 10 seconds )
        if (!forceRefresh && memoryCache.length > 0 && (Date.now() - lastFetch < 10000)) {
            return {
                data: memoryCache,
                source: 'MEMORY_CACHE',
                latency: Math.round(performance.now() - start)
            };
        }

        // Trigger immediate fetch
        const freshData = await DatabaseService.runIngestionRobot();
        
        return {
            data: freshData,
            source: 'LIVE_INGEST',
            latency: Math.round(performance.now() - start)
        };
    },

    // 2. BACKGROUND CHECKER
    checkAndTriggerIngestion: async () => {
        // Runs aggressively to keep cache populated
        if (Date.now() - lastFetch > 15000) {
            await DatabaseService.runIngestionRobot();
        }
    },

    // 3. THE ROBOT (Optimized for Speed)
    runIngestionRobot: async (): Promise<MarketCoin[]> => {
        try {
            // A. Randomized Sector Scan - Increased count to fill list
            const shuffledQueries = shuffleArray([...TARGET_QUERIES]).slice(0, 15);
            let rawPairs: any[] = [];

            // Execute in batches for speed
            const batch1 = shuffledQueries.slice(0, 8).map(q => fetchWithFallbacks(q));
            const results1 = await Promise.all(batch1);
            
            results1.forEach(r => { if(r.pairs) rawPairs.push(...r.pairs); });
            
            // If we don't have enough, fetch more
            if (rawPairs.length < 50) {
                 const batch2 = shuffledQueries.slice(8, 15).map(q => fetchWithFallbacks(q));
                 const results2 = await Promise.all(batch2);
                 results2.forEach(r => { if(r.pairs) rawPairs.push(...r.pairs); });
            }

            // B. Deduplicate & Filter
            const seenSymbols = new Set();
            
            // Sort raw pairs by CREATED AT descending (Newest first) before filtering
            rawPairs.sort((a, b) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0));

            const cleanPairs = rawPairs.filter(p => {
                const liq = p.liquidity?.usd || 0;
                const vol = p.volume?.h24 || 0;
                const symbol = p.baseToken?.symbol?.toUpperCase();
                
                if (EXCLUDED_SYMBOLS.includes(symbol)) return false;
                if (liq < REQUIREMENTS.MIN_LIQUIDITY_USD) return false;
                if (vol < REQUIREMENTS.MIN_VOLUME_24H) return false;
                if (!p.info?.imageUrl) return false;

                if (seenSymbols.has(symbol)) return false;
                seenSymbols.add(symbol);

                return true;
            });

            // C. Map to MarketCoin Object
            const mappedCoins = DatabaseService.mapDbToMarketCoin(cleanPairs);
            
            // Update Memory Cache Immediately (Fastest UI response)
            memoryCache = mappedCoins;
            lastFetch = Date.now();

            // D. Background Save to Supabase (Don't await this to block UI)
            if (cleanPairs.length > 0) {
                const dbRows = cleanPairs.map(p => ({
                    pair_address: p.pairAddress,
                    chain: p.chainId,
                    name: p.baseToken.name,
                    symbol: p.baseToken.symbol,
                    price_usd: parseFloat(p.priceUsd) || 0,
                    liquidity_usd: p.liquidity?.usd || 0,
                    volume_24h: p.volume?.h24 || 0,
                    fdv: p.fdv || 0,
                    price_change_24h: p.priceChange?.h24 || 0,
                    buy_volume_24h: p.txns?.h24?.buys || 0,
                    sell_volume_24h: p.txns?.h24?.sells || 0,
                    pair_created_at: p.pairCreatedAt ? new Date(p.pairCreatedAt).toISOString() : new Date().toISOString(),
                    logo_url: p.info?.imageUrl,
                    dex_url: p.url,
                    updated_at: new Date().toISOString()
                }));

                // Fire and forget
                supabase.from('market_tokens').upsert(dbRows, { onConflict: 'pair_address' }).then(({ error }) => {
                    if (error) console.error("DB Sync Error:", error.message);
                });
            }

            return mappedCoins;

        } catch (e) {
            console.error("Ingestion Failed", e);
            return memoryCache; // Return stale cache if fetch fails
        }
    },

    // 4. MAPPER (Raw DexScreener -> UI Component)
    mapDbToMarketCoin: (rawPairs: any[]): MarketCoin[] => {
        return rawPairs.map((p, index) => {
            // Check if it's from DB (snake_case) or API (camelCase)
            const isDb = !!p.pair_created_at;
            
            const vol = isDb ? p.volume_24h : (p.volume?.h24 || 0);
            const buys = isDb ? p.buy_volume_24h : (p.txns?.h24?.buys || 0);
            const sells = isDb ? p.sell_volume_24h : (p.txns?.h24?.sells || 0);
            const price = isDb ? p.price_usd : (parseFloat(p.priceUsd) || 0);
            const change = isDb ? p.price_change_24h : (p.priceChange?.h24 || 0);
            const liq = isDb ? p.liquidity_usd : (p.liquidity?.usd || 0);
            const fdv = isDb ? p.fdv : (p.fdv || 0);
            const created = isDb ? new Date(p.pair_created_at).getTime() : (p.pairCreatedAt || Date.now());
            const sym = isDb ? p.symbol : p.baseToken?.symbol;
            const name = isDb ? p.name : p.baseToken?.name;
            const chain = isDb ? p.chain : p.chainId;
            const addr = isDb ? p.pair_address : p.pairAddress;
            const img = isDb ? p.logo_url : p.info?.imageUrl;

            const total = buys + sells;
            const flowScore = total > 0 ? Math.round((buys / total) * 100) : 50;
            const netFlowVal = (vol * ((flowScore - 50) / 100));
            const netFlowStr = (netFlowVal >= 0 ? '+' : '-') + formatCurrency(Math.abs(netFlowVal));
            
            return {
                id: index,
                name: name,
                ticker: sym,
                price: formatPrice(price),
                h1: '0.00%',
                h24: `${change?.toFixed(2)}%`,
                d7: '0.00%',
                cap: formatCurrency(fdv),
                liquidity: formatCurrency(liq),
                volume24h: formatCurrency(vol),
                dexBuys: buys.toString(),
                dexSells: sells.toString(),
                dexFlow: flowScore,
                netFlow: netFlowStr,
                smartMoney: 'Neutral', 
                smartMoneySignal: 'Neutral',
                signal: change > 20 ? 'Breakout' : 'None',
                riskLevel: liq < 100000 ? 'High' : 'Medium',
                age: getTimeAgo(created),
                createdTimestamp: created,
                img: img,
                trend: change >= 0 ? 'Bullish' : 'Bearish',
                chain: getChainId(chain),
                address: addr, 
                pairAddress: addr
            };
        });
    },

    // 5. Token Detail Fetcher
    getTokenDetails: async (query: string): Promise<any> => {
        const result = await fetchWithFallbacks(query);
        if (result && result.pairs && result.pairs.length > 0) {
            return result.pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        }
        return null;
    }
};
