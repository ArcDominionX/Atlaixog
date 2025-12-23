
import { MarketCoin } from '../types';

// Using DexScreener Public API
const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex/search';

// --- RESEARCH & GEM REQUIREMENTS ---
const REQUIREMENTS = {
    MIN_LIQUIDITY_USD: 60000,    // $60k minimum to flush junk
    MIN_VOLUME_24H: 75000,       // Must have active volume
    MIN_TXNS_24H: 100,           // "No activity = no discovery"
    MIN_FDV: 100000,             // Avoid absolute dead coins
    MAX_AGE_HOURS_FOR_NEW: 72    // New launch window
};

// --- EXCLUSION LIST ---
// Filter out the L1s/Stables themselves to show the "Prospects" trading against them
const EXCLUDED_SYMBOLS = [
    'SOL', 'WSOL', 'ETH', 'WETH', 'BTC', 'WBTC', 'BNB', 'WBNB', 
    'USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'USDS', 'EURC', 'STETH', 'USDe', 'FDUSD',
    'RWA', 'TEST', 'DEBUG', 'WSTETH', 'CBETH', 'RETH'
];

// --- DISCOVERY QUERIES ---
// Expanded list to ensure we get a diverse range of tokens across narratives
const TARGET_QUERIES = [
    // 1. Core Chains & Ecosystems
    'SOL', 'WETH', 'WBNB', 'BASE', 'BSC', 'ARBITRUM', 'POLYGON', 'AVALANCHE', 'OPTIMISM',
    
    // 2. Stable Pairings (High Quality)
    'USDC', 'USDT',
    
    // 3. Hot Narratives
    'AI', 'AGENT', 'MEME', 'GAMING', 'RWA', 'DEPIN', 'DAO', 'LAYER2', 'ZK', 'METAVERSE',
    
    // 4. Viral & Trending Anchors (Solana/Base/Eth)
    'PEPE', 'WIF', 'BONK', 'BRETT', 'MOG', 'POPCAT', 'GOAT', 'MOODENG', 'PNUT', 'ACT', 'LUCE',
    'VIRTUAL', 'SPX', 'GIGA', 'FWOG', 'MEW', 'TRUMP', 'MELANIA', 'TURBO', 'NEIRO', 'BABYDOGE', 'DEGEN',
    
    // 5. DeFi & Infra Heavyweights (To find pairs trading against them or their ecos)
    'JUP', 'RAY', 'JITO', 'PYTH', 'RENDER', 'TAO', 'ONDO', 'PENDLE', 'ENA', 'AERO', 'PRIME'
];

// Helpers
const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
};

const formatPrice = (price: string) => {
    const num = parseFloat(price);
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
    info?: { imageUrl?: string; websites?: { label: string; url: string }[]; socials?: { type: string; url: string }[]; };
}

interface Cache {
    marketData: { data: MarketCoin[]; timestamp: number; } | null;
}

const cache: Cache = { marketData: null };
const CACHE_FRESH_DURATION = 45000; // 45s cache

// --- ROBUST FETCH STRATEGY ---
const fetchWithFallbacks = async (query: string): Promise<any> => {
    const directUrl = `${DEXSCREENER_API_URL}?q=${query}`;
    
    // We try direct first, then proxies if needed (though direct usually works for search)
    const strategies = [
        { name: 'Direct', url: directUrl },
        { name: 'CorsProxy', url: `https://corsproxy.io/?${encodeURIComponent(directUrl)}` }
    ];

    for (const strategy of strategies) {
        try {
            const response = await fetch(strategy.url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data && data.pairs) return data; 
        } catch (err) {
            continue; 
        }
    }
    return { pairs: [] };
};

export const DatabaseService = {
    getMarketData: async (force: boolean = false): Promise<{ data: MarketCoin[], source: 'LIVE_API' | 'CACHE', latency: number }> => {
        const start = performance.now();
        
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
            // 1. Parallel Fetch for broad market coverage
            const results = await Promise.all(
                TARGET_QUERIES.map(q => fetchWithFallbacks(q))
            );

            let rawPairs: DexPair[] = [];
            results.forEach(result => {
                if (result && result.pairs) {
                    rawPairs = [...rawPairs, ...result.pairs];
                }
            });

            if (rawPairs.length === 0) throw new Error("No pairs returned from any source");

            // 2. PRIMARY DEDUPLICATION & CLEANUP
            // Sort raw pairs by liquidity first to ensure we keep the "real" version if duplicates exist
            rawPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

            const seenSymbols = new Set<string>();
            const bestPairs: DexPair[] = [];

            for (const p of rawPairs) {
                 const symbol = p.baseToken.symbol.toUpperCase();
                 
                 // Skip if we already have this symbol (keeps the one with highest liquidity due to previous sort)
                 if (seenSymbols.has(symbol)) continue;

                 // Filter: Must have Image/Logo (Removes low-effort junk)
                 if (!p.info?.imageUrl) continue;

                 seenSymbols.add(symbol);
                 bestPairs.push(p);
            }

            // 3. THE "ALPHA" FILTER (Strict Metrics)
            const filteredPairs = bestPairs.filter((p: DexPair) => {
                const liq = p.liquidity?.usd || 0;
                const vol = p.volume.h24 || 0;
                const fdv = p.fdv || 0;
                const txns = (p.txns?.h24?.buys || 0) + (p.txns?.h24?.sells || 0);

                // --- FLUSH OUT JUNK ---
                if (EXCLUDED_SYMBOLS.includes(p.baseToken.symbol.toUpperCase())) return false;
                if (liq < REQUIREMENTS.MIN_LIQUIDITY_USD) return false;
                if (vol < REQUIREMENTS.MIN_VOLUME_24H) return false;
                if (txns < REQUIREMENTS.MIN_TXNS_24H) return false; 
                if (fdv < REQUIREMENTS.MIN_FDV) return false;

                // --- CHAIN FILTER ---
                const validChains = ['solana', 'ethereum', 'bsc', 'base'];
                if (!validChains.includes(p.chainId)) return false;

                // --- UNSTABLE STRUCTURE FILTER ---
                const buyPressure = txns > 0 ? p.txns.h24.buys / txns : 0;
                if (buyPressure < 0.3 && p.priceChange.h24 < -10) return false; // Filter crashing tokens

                return true;
            });

            // 4. Transformation & Scoring
            const processedData: MarketCoin[] = filteredPairs.map((pair, index) => {
                const buys = pair.txns?.h24?.buys || 0;
                const sells = pair.txns?.h24?.sells || 0;
                const totalTxns = buys + sells;
                
                // Net Flow Calculation
                const flowRatio = totalTxns > 0 ? (buys / totalTxns) : 0.5;
                const dexFlowScore = Math.round(flowRatio * 100);
                const estimatedNetFlow = (pair.volume.h24 * (flowRatio - 0.5)); 
                const netFlowStr = (estimatedNetFlow >= 0 ? '+' : '-') + formatCurrency(Math.abs(estimatedNetFlow));

                // Smart Signal Logic (Discovery Triggers)
                let signal: MarketCoin['signal'] = 'None';
                // Safe access to priceChange
                const priceChangeH1 = pair.priceChange?.h1 || 0;
                const priceChangeH24 = pair.priceChange?.h24 || 0;
                const priceChangeH6 = pair.priceChange?.h6 || 0;
                
                const ageHours = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) / (1000 * 60 * 60) : 999;
                const volToLiq = (pair.volume.h24 / (pair.liquidity?.usd || 1));

                if (ageHours < REQUIREMENTS.MAX_AGE_HOURS_FOR_NEW && volToLiq > 0.5) signal = 'Volume Spike'; // New + Active
                else if (priceChangeH1 > 15) signal = 'Breakout';
                else if (buys > sells * 1.8 && volToLiq > 0.8) signal = 'Accumulation';
                else if (priceChangeH24 < -15) signal = 'Dump';

                const trend: MarketCoin['trend'] = priceChangeH24 >= 0 ? 'Bullish' : 'Bearish';
                const riskLevel: MarketCoin['riskLevel'] = (pair.liquidity?.usd || 0) < 100000 ? 'High' : (pair.liquidity?.usd || 0) < 500000 ? 'Medium' : 'Low';
                const smartMoneySignal: MarketCoin['smartMoneySignal'] = estimatedNetFlow > 100000 ? 'Inflow' : estimatedNetFlow < -100000 ? 'Outflow' : 'Neutral';
                
                // Accurate Logo: Use DexScreener provided image
                const img = pair.info?.imageUrl || `https://ui-avatars.com/api/?name=${pair.baseToken.name}&background=random`;

                return {
                    id: index,
                    name: pair.baseToken.name,
                    ticker: pair.baseToken.symbol,
                    price: formatPrice(pair.priceUsd),
                    h1: `${(priceChangeH1).toFixed(2)}%`,
                    h24: `${(priceChangeH24).toFixed(2)}%`,
                    d7: `${(priceChangeH6).toFixed(2)}%`,
                    cap: formatCurrency(pair.fdv || pair.liquidity?.usd || 0),
                    liquidity: formatCurrency(pair.liquidity?.usd || 0),
                    volume24h: formatCurrency(pair.volume.h24),
                    dexBuys: buys.toString(),
                    dexSells: sells.toString(),
                    dexFlow: dexFlowScore,
                    netFlow: netFlowStr,
                    smartMoney: estimatedNetFlow > 500000 ? 'Inflow' : 'Neutral',
                    smartMoneySignal,
                    signal,
                    riskLevel,
                    age: pair.pairCreatedAt ? getTimeAgo(pair.pairCreatedAt) : 'Unknown',
                    createdTimestamp: pair.pairCreatedAt || Date.now(),
                    img: img,
                    trend,
                    chain: getChainId(pair.chainId)
                };
            });

            // 5. Ranking (The "Pro" Sort)
            // Surface "Good Prospective Tokens" (High Activity, High Vol relative to Cap)
            const sortedData = processedData.sort((a, b) => {
                // Parse metrics
                const txnsA = parseInt(a.dexBuys) + parseInt(a.dexSells);
                const txnsB = parseInt(b.dexBuys) + parseInt(b.dexSells);
                
                const volA = parseFloat(a.volume24h.replace(/[$,KMB]/g, '')) * (a.volume24h.includes('M') ? 1000000 : 1000);
                const volB = parseFloat(b.volume24h.replace(/[$,KMB]/g, '')) * (b.volume24h.includes('M') ? 1000000 : 1000);

                // Priority Score:
                // 1. Transaction Count (Community Interest) - Weight 60%
                // 2. Volume (Capital Interest) - Weight 40%
                const scoreA = (txnsA * 10) + (volA / 5000);
                const scoreB = (txnsB * 10) + (volB / 5000);

                return scoreB - scoreA;
            });

            const finalData = sortedData;
            cache.marketData = { data: finalData, timestamp: Date.now() };

            return {
                data: finalData,
                source: 'LIVE_API',
                latency: Math.round(performance.now() - startTime)
            };

        } catch (error) {
            console.error("Critical: All data sources failed.", error);
            // Return empty array if API fails, as requested
            return { data: [], source: 'CACHE', latency: 0 };
        }
    },

    getTokenDetails: async (query: string): Promise<any> => {
        // Fetch detailed data for a specific token (Ticker or Address)
        const result = await fetchWithFallbacks(query);
        if (result && result.pairs && result.pairs.length > 0) {
            // Return the most liquid pair
            const bestPair = result.pairs.sort((a: DexPair, b: DexPair) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
            return bestPair;
        }
        return null;
    },

    getUserPreferences: async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return { theme: 'dark', notifications: true };
    }
};
