
import { MarketCoin } from '../types';
import { createClient } from '@supabase/supabase-js';
import { APP_CONFIG } from '../config';

// --- INITIALIZE SUPABASE ---
const supabase = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey);

// Using DexScreener Public API
const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex/search';

// --- RESEARCH & GEM REQUIREMENTS ---
const REQUIREMENTS = {
    MIN_LIQUIDITY_USD: 10000,    // Lowered slightly to ensure data flow
    MIN_VOLUME_24H: 5000,       
    MIN_TXNS_24H: 10,            
    MIN_FDV: 1000,               
    MAX_AGE_HOURS_FOR_NEW: 72    
};

// --- EXCLUSION LIST ---
const EXCLUDED_SYMBOLS = [
    'SOL', 'WSOL', 'ETH', 'WETH', 'BTC', 'WBTC', 'BNB', 'WBNB', 
    'USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'USDS', 'EURC', 'STETH', 'USDe', 'FDUSD',
    'RWA', 'TEST', 'DEBUG', 'WSTETH', 'CBETH', 'RETH', 'WRAPPED', 'MSOL', 'JITOSOL', 'SLERF'
];

// --- DISCOVERY QUERIES ---
const TARGET_QUERIES = [
    'SOL', 'RAY', 'PUMP', 'WBNB', 'BSC', 'WETH', 'BASE', 'BRETT', 'USDC', 'USDT',
    'AI', 'AGENT', 'MEME', 'GAMING', 'RWA', 'DEPIN', 'DAO', 'LAYER2', 'ZK', 'METAVERSE',
    'PEPE', 'WIF', 'BONK', 'MOG', 'POPCAT', 'GOAT', 'MOODENG', 'PNUT', 'ACT', 'LUCE',
    'VIRTUAL', 'SPX', 'GIGA', 'FWOG', 'MEW', 'TRUMP', 'MELANIA', 'TURBO', 'NEIRO', 'BABYDOGE',
    'JUP', 'JITO', 'PYTH', 'RENDER', 'TAO', 'ONDO', 'PENDLE', 'ENA', 'AERO', 'PRIME'
];

// --- SMART ROTATION STATE ---
let currentQueryIndex = 0;
const BATCH_SIZE_BACKGROUND = 3; 
const BATCH_SIZE_FULL = 4; 

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
const CACHE_FRESH_DURATION = 60000; // 60s cache

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

// --- SIMULATION ENGINE ---
const generateSimulatedData = (): MarketCoin[] => {
    const tokens = [
        { s: 'WIF', n: 'dogwifhat', p: 3.42, c: 'solana' },
        { s: 'PEPE', n: 'Pepe', p: 0.000012, c: 'ethereum' },
        { s: 'BONK', n: 'Bonk', p: 0.000024, c: 'solana' },
        { s: 'BRETT', n: 'Brett', p: 0.14, c: 'base' },
        { s: 'POPCAT', n: 'Popcat', p: 0.45, c: 'solana' },
        { s: 'MOG', n: 'Mog Coin', p: 0.0000018, c: 'ethereum' },
        { s: 'PNUT', n: 'Peanut', p: 1.20, c: 'solana' },
        { s: 'ACT', n: 'Act I', p: 0.65, c: 'solana' },
        { s: 'GOAT', n: 'Goatseus', p: 0.88, c: 'solana' },
        { s: 'MOODENG', n: 'Moodeng', p: 0.22, c: 'solana' }
    ];

    return tokens.map((t, i) => ({
        id: i,
        name: t.n,
        ticker: t.s,
        price: formatPrice(t.p),
        h1: `${(Math.random() * 5 - 2).toFixed(2)}%`,
        h24: `${(Math.random() * 20 - 5).toFixed(2)}%`,
        d7: `${(Math.random() * 50).toFixed(2)}%`,
        cap: formatCurrency(Math.random() * 1000000000 + 50000000),
        liquidity: formatCurrency(Math.random() * 5000000 + 500000),
        volume24h: formatCurrency(Math.random() * 50000000 + 1000000),
        dexBuys: Math.floor(Math.random() * 5000 + 1000).toString(),
        dexSells: Math.floor(Math.random() * 4000 + 1000).toString(),
        dexFlow: Math.floor(Math.random() * 100),
        netFlow: `+$${(Math.random() * 500000).toFixed(0)}`,
        smartMoney: Math.random() > 0.5 ? 'Inflow' : 'Neutral',
        smartMoneySignal: Math.random() > 0.5 ? 'Inflow' : 'Neutral',
        signal: Math.random() > 0.7 ? 'Volume Spike' : 'None',
        riskLevel: 'Low',
        age: '2d ago',
        createdTimestamp: Date.now() - (Math.random() * 100000000),
        img: `https://cryptologos.cc/logos/${t.n.toLowerCase().replace(' ', '-')}-${t.s.toLowerCase()}-logo.png`,
        trend: 'Bullish',
        chain: t.c,
        address: `0x${Math.random().toString(16).slice(2)}`,
        pairAddress: `0x${Math.random().toString(16).slice(2)}`
    }));
};

export const DatabaseService = {
    getMarketData: async (force: boolean = false, partial: boolean = false): Promise<{ data: MarketCoin[], source: 'LIVE_API' | 'CACHE' | 'SUPABASE' | 'SIMULATED', latency: number }> => {
        const start = performance.now();
        
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
            // Step 1: Attempt to get data from Supabase first (fastest)
            const dbData = await DatabaseService.fetchFromSupabase();
            if (dbData.length > 0 && !force) {
                 cache.marketData = { data: dbData, timestamp: Date.now() };
                 return { data: dbData, source: 'SUPABASE', latency: Math.round(performance.now() - start) };
            }

            // Step 2: Live Fetch Logic
            let queriesToRun: string[] = [];
            
            if (partial) {
                const end = Math.min(currentQueryIndex + BATCH_SIZE_BACKGROUND, TARGET_QUERIES.length);
                queriesToRun = TARGET_QUERIES.slice(currentQueryIndex, end);
                currentQueryIndex = end >= TARGET_QUERIES.length ? 0 : end;
            } else {
                // If full fetch, random sample to avoid timeout
                queriesToRun = TARGET_QUERIES.sort(() => 0.5 - Math.random()).slice(0, 15);
            }

            const chunks = chunkArray(queriesToRun, BATCH_SIZE_FULL);
            let apiResults: any[] = [];
            
            for (const chunk of chunks) {
                const chunkResults = await Promise.all(chunk.map(q => fetchWithFallbacks(q)));
                apiResults = [...apiResults, ...chunkResults];
                if (!partial) await new Promise(r => setTimeout(r, 50)); 
            }

            let rawPairs: DexPair[] = [];
            apiResults.forEach(result => {
                if (result && result.pairs) {
                    rawPairs = [...rawPairs, ...result.pairs];
                }
            });

            // If API fails completely, fallback to Simulation
            if (rawPairs.length === 0) {
                console.warn("API returned no data, switching to simulation.");
                const simData = generateSimulatedData();
                cache.marketData = { data: simData, timestamp: Date.now() };
                return { data: simData, source: 'SIMULATED', latency: 0 };
            }

            // Step 3: Filter & Cleanup
            const seenSymbols = new Set<string>();
            const bestPairs: DexPair[] = [];

            rawPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

            for (const p of rawPairs) {
                 const symbol = p.baseToken.symbol.toUpperCase();
                 if (EXCLUDED_SYMBOLS.includes(symbol)) continue; 
                 if (seenSymbols.has(symbol)) continue;
                 if (!p.info?.imageUrl) continue;
                 
                 seenSymbols.add(symbol);
                 bestPairs.push(p);
            }

            const liveTokens: MarketCoin[] = bestPairs.map(p => DatabaseService.transformPair(p));

            // Merge with existing
            const tokenMap = new Map<string, MarketCoin>();
            dbData.forEach(t => tokenMap.set(t.address, t));
            liveTokens.forEach(t => tokenMap.set(t.address, t));
            
            const mergedList = Array.from(tokenMap.values());

            const sortedData = mergedList.sort((a, b) => {
                if (a.createdTimestamp > Date.now() - (86400000 * 2)) return -1; 
                const volA = parseFloat(a.volume24h.replace(/[$,KMB]/g, ''));
                const volB = parseFloat(b.volume24h.replace(/[$,KMB]/g, ''));
                return volB - volA;
            });

            const finalData = sortedData.slice(0, 100);

            if (liveTokens.length > 0) {
                DatabaseService.syncToSupabase(liveTokens).catch(() => {});
            }

            cache.marketData = { data: finalData, timestamp: Date.now() };

            return {
                data: finalData,
                source: liveTokens.length > 0 ? 'LIVE_API' : 'SUPABASE',
                latency: Math.round(performance.now() - start)
            };

        } catch (error) {
            console.error("Critical Fetch Error:", error);
            // ULTIMATE FALLBACK: Return simulated data so app doesn't break
            const simData = generateSimulatedData();
            cache.marketData = { data: simData, timestamp: Date.now() };
            return { data: simData, source: 'SIMULATED', latency: 0 };
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
                last_seen_at: new Date(),
                raw_data: t 
            }));

            const { error } = await supabase
                .from('discovered_tokens')
                .upsert(dbPayload, { onConflict: 'address' });
            
            if (error) console.warn("Supabase Sync Warning:", error.message);
        } catch (e) {
            // console.warn("Supabase Sync skipped"); 
        }
    },

    fetchFromSupabase: async (): Promise<MarketCoin[]> => {
        try {
            const { data, error } = await supabase
                .from('discovered_tokens')
                .select('*')
                .order('last_seen_at', { ascending: false })
                .limit(200);

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
