
import { MarketCoin } from '../types';
import { createClient } from '@supabase/supabase-js';
import { APP_CONFIG } from '../config';

// --- INITIALIZE SUPABASE ---
const supabase = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey);

const DEXSCREENER_SEARCH_URL = 'https://api.dexscreener.com/latest/dex/search';
const DEXSCREENER_PAIRS_URL = 'https://api.dexscreener.com/latest/dex/pairs';

// --- REQUIREMENTS ---
const REQUIREMENTS = {
    MIN_LIQUIDITY_USD: 2000,    
    MIN_VOLUME_24H: 1000,       
    MIN_TXNS_24H: 10,            
    MIN_FDV: 5000,
    TARGET_LIST_SIZE: 120 // Aim for slightly more than 100 to account for filters
};

const EXCLUDED_SYMBOLS = [
    'SOL', 'WSOL', 'ETH', 'WETH', 'BTC', 'WBTC', 'BNB', 'WBNB', 
    'USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'USDS', 'EURC', 'STETH', 
    'USDE', 'FDUSD', 'WRAPPED', 'MSOL', 'JITOSOL', 'SLERF'
];

// --- DISCOVERY QUERIES ---
const TARGET_QUERIES = [
    'SOL', 'BASE', 'BSC', 'ETH', 'ARBITRUM', 'POLYGON', 'AVALANCHE', 'OPTIMISM', 'SUI', 'TRON',
    'PEPE', 'DOGE', 'SHIB', 'FLOKI', 'BONK', 'WIF', 'MOG', 'TRUMP', 'MAGA', 'BIDEN', 
    'ELON', 'MOON', 'SAFE', 'CAT', 'DOG', 'INU', 'APE', 'KONG', 'FROG', 'TOAD',
    'AI', 'GPT', 'BOT', 'AGENT', 'TECH', 'DATA', 'COMPUTE', 'CLOUD', 'DEPIN', 'RWA',
    'GAMING', 'GAME', 'PLAY', 'WIN', 'BET', 'CASINO', 'LUCK', 'HIGH', 'LOW',
    'SWAP', 'DEX', 'FINANCE', 'PROTOCOL', 'YIELD', 'FARM', 'STAKE', 'DAO', 'LEND', 'BORROW',
    'GOLD', 'SILVER', 'PUMP', 'DUMP', 'SHORT', 'LONG', 'BULL', 'BEAR',
    'NEO', 'MATRIX', 'META', 'VERSE', 'WORLD', 'STAR', 'GALAXY', 'SPACE', 'MARS',
    'RED', 'BLUE', 'GREEN', 'BLACK', 'WHITE', 'ORANGE', 'PURPLE',
    'SUPER', 'ULTRA', 'MEGA', 'GIGA', 'TERA', 'HYPER', 'CYBER', 'PIXEL'
];

// Shuffle queries once
const SHUFFLED_QUERIES = [...TARGET_QUERIES].sort(() => Math.random() - 0.5);
let currentQueryIndex = 0;

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
const CACHE_FRESH_DURATION = 60000; 

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

const parseFormattedValue = (val: string): number => {
    if (!val) return 0;
    const clean = val.replace(/[$,]/g, '');
    let multiplier = 1;
    if (clean.includes('B')) multiplier = 1e9;
    else if (clean.includes('M')) multiplier = 1e6;
    else if (clean.includes('K')) multiplier = 1e3;
    return parseFloat(clean) * multiplier;
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

// --- API METHODS ---

const searchDexScreener = async (query: string): Promise<DexPair[]> => {
    try {
        const response = await fetch(`${DEXSCREENER_SEARCH_URL}?q=${query}`);
        if (response.status === 429) return []; // Skip if rate limited
        if (!response.ok) return [];
        const data = await response.json();
        return data.pairs || [];
    } catch (e) {
        return [];
    }
};

const updatePairsBulk = async (chainId: string, pairAddresses: string[]): Promise<DexPair[]> => {
    try {
        // DexScreener supports up to 30 pairs per request
        const chunks = [];
        for (let i = 0; i < pairAddresses.length; i += 30) {
            chunks.push(pairAddresses.slice(i, i + 30));
        }

        const results = await Promise.all(chunks.map(async chunk => {
            const url = `${DEXSCREENER_PAIRS_URL}/${chainId}/${chunk.join(',')}`;
            const res = await fetch(url);
            if (!res.ok) return { pairs: [] };
            return res.json();
        }));

        let allPairs: DexPair[] = [];
        results.forEach((r: any) => {
            if (r && r.pairs) allPairs = [...allPairs, ...r.pairs];
        });
        return allPairs;
    } catch (e) {
        return [];
    }
};


export const DatabaseService = {
    getMarketData: async (force: boolean = false, partial: boolean = false): Promise<{ data: MarketCoin[], source: string, latency: number }> => {
        const start = performance.now();
        
        // Cache Check
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
            // 1. Load existing data from DB (Our "Memory")
            const dbTokens = await DatabaseService.fetchFromSupabase();
            let currentList = [...dbTokens];
            const currentCount = currentList.length;

            let newPairs: DexPair[] = [];
            let updatedPairs: DexPair[] = [];

            // --- STRATEGY: POPULATION VS MAINTENANCE ---
            
            if (currentCount < REQUIREMENTS.TARGET_LIST_SIZE) {
                // PHASE 1: POPULATION (Prioritize Search)
                // We use all API bandwidth to find NEW tokens. 
                // We DO NOT waste calls updating existing ones yet.
                
                // Run 5 search queries in parallel
                const batchSize = 5;
                const end = Math.min(currentQueryIndex + batchSize, SHUFFLED_QUERIES.length);
                const queries = SHUFFLED_QUERIES.slice(currentQueryIndex, end);
                currentQueryIndex = end >= SHUFFLED_QUERIES.length ? 0 : end;

                const searchResults = await Promise.all(queries.map(q => searchDexScreener(q)));
                searchResults.forEach(pairs => newPairs = [...newPairs, ...pairs]);
                
            } else {
                // PHASE 2: MAINTENANCE (Update + Light Discovery)
                // We have enough tokens. Now we keep them fresh efficiently.
                
                // A. Update existing tokens (Bulk Endpoint is VERY efficient)
                // Group by chain for the endpoint
                const chainMap: Record<string, string[]> = {};
                // Update oldest seen tokens first (simple rotation)
                currentList.slice(0, 60).forEach(t => {
                    // Map generic chain names back to DexScreener IDs if needed
                    const cid = t.chain === 'ethereum' ? 'ethereum' : t.chain === 'solana' ? 'solana' : t.chain === 'bsc' ? 'bsc' : 'base';
                    if (!chainMap[cid]) chainMap[cid] = [];
                    if (t.pairAddress) chainMap[cid].push(t.pairAddress);
                });

                const updatePromises = Object.entries(chainMap).map(([chainId, addrs]) => updatePairsBulk(chainId, addrs));
                const updateResults = await Promise.all(updatePromises);
                updateResults.forEach(pairs => updatedPairs = [...updatedPairs, ...pairs]);

                // B. Light Discovery (Run 1 search just to find gems)
                const query = SHUFFLED_QUERIES[currentQueryIndex];
                currentQueryIndex = (currentQueryIndex + 1) % SHUFFLED_QUERIES.length;
                const searchRes = await searchDexScreener(query);
                newPairs = searchRes;
            }

            // 2. Process & Merge Data
            const allFetchedPairs = [...newPairs, ...updatedPairs];
            const tokenMap = new Map<string, MarketCoin>();
            
            // Fill map with existing DB data first
            currentList.forEach(t => tokenMap.set(t.address, t));

            // Process fetched pairs
            const seenSymbols = new Set<string>();
            // Add existing symbols to seen set so we don't re-add duplicates
            currentList.forEach(t => seenSymbols.add(t.ticker.toUpperCase()));

            // Sort new pairs by liquidity to prioritize quality
            allFetchedPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

            for (const p of allFetchedPairs) {
                const symbol = p.baseToken.symbol.toUpperCase();
                
                // Strict Filtering
                if (EXCLUDED_SYMBOLS.includes(symbol)) continue;
                if (!p.info?.imageUrl) continue; // Must have logo
                
                // Quality Floors
                const liq = p.liquidity?.usd || 0;
                const vol = p.volume.h24 || 0;
                if (liq < REQUIREMENTS.MIN_LIQUIDITY_USD) continue;
                if (vol < REQUIREMENTS.MIN_VOLUME_24H) continue;
                
                // If we already have this address in DB, update it (it's an Update)
                // If it's a new address but symbol exists, ignore (Duplicate Symbol Prevention)
                if (tokenMap.has(p.baseToken.address)) {
                    // Update existing
                    tokenMap.set(p.baseToken.address, DatabaseService.transformPair(p));
                } else {
                    // New discovery
                    if (!seenSymbols.has(symbol)) {
                         seenSymbols.add(symbol);
                         tokenMap.set(p.baseToken.address, DatabaseService.transformPair(p));
                    }
                }
            }

            // 3. Convert back to array
            let mergedList = Array.from(tokenMap.values());

            // 4. Sorting Strategy ("Hot Score")
            mergedList.sort((a, b) => {
                const volA = parseFormattedValue(a.volume24h);
                const volB = parseFormattedValue(b.volume24h);
                const liqA = parseFormattedValue(a.liquidity);
                const liqB = parseFormattedValue(b.liquidity);
                
                const scoreA = volA + (liqA * 0.2);
                const scoreB = volB + (liqB * 0.2);
                return scoreB - scoreA;
            });

            // 5. Limit size & Sync
            // We allow list to grow up to 300 internally, but only sync/return top set
            const finalData = mergedList.slice(0, 300);

            // Sync new discoveries to DB
            if (newPairs.length > 0 || updatedPairs.length > 0) {
                DatabaseService.syncToSupabase(finalData).catch(err => console.warn("Sync skipped", err));
            }

            cache.marketData = { data: finalData, timestamp: Date.now() };

            return {
                data: finalData,
                source: newPairs.length > 0 ? 'LIVE_SEARCH' : 'LIVE_UPDATE',
                latency: Math.round(performance.now() - start)
            };

        } catch (error) {
            console.error("Critical Fetch Error:", error);
            const stored = await DatabaseService.fetchFromSupabase();
            return { data: stored, source: 'SUPABASE_FALLBACK', latency: 0 };
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
        
        if (ageHours < 72) signal = 'Volume Spike';
        else if (priceChangeH1 > 10 && totalTxns > 500) signal = 'Breakout';
        else if (buys > sells * 1.5) signal = 'Accumulation';

        const trend: MarketCoin['trend'] = priceChangeH24 >= 0 ? 'Bullish' : 'Bearish';
        const liq = pair.liquidity?.usd || 0;
        const riskLevel: MarketCoin['riskLevel'] = liq < 5000 ? 'High' : liq < 50000 ? 'Medium' : 'Low';
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
                last_seen_at: new Date(), 
                raw_data: t 
            }));

            // Upsert in batches to be safe
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
            const { data, error } = await supabase
                .from('discovered_tokens')
                .select('*')
                .order('last_seen_at', { ascending: false }) 
                .limit(400);

            if (error || !data) return [];
            return data.map((row: any) => row.raw_data as MarketCoin);
        } catch (e) {
            return [];
        }
    },

    getTokenDetails: async (query: string): Promise<any> => {
        const result = await searchDexScreener(query);
        if (result && result.length > 0) {
            return result.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        }
        return null;
    },
    
    checkAndTriggerIngestion: async () => {
        await DatabaseService.getMarketData(true, true);
    }
};
