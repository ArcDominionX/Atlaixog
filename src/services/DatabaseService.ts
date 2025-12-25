
import { MarketCoin } from '../types';
import { createClient } from '@supabase/supabase-js';
import { APP_CONFIG } from '../config';

// --- INITIALIZE SUPABASE ---
// We use the Service Key here so the "Robot" has permission to WRITE data to the DB.
const supabase = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseServiceKey);

// Using DexScreener Public API
const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex/search';

// --- RESEARCH & GEM REQUIREMENTS (The Hard Gates) ---
// UPDATED: Stricter requirements per user request ($50k Liquidity)
const REQUIREMENTS = {
    MIN_LIQUIDITY_USD: 50000,    // Raised to $50k for higher quality
    MIN_VOLUME_24H: 15000,       // Raised slightly to match liquidity quality
    MIN_TXNS_24H: 25,            // moderate activity required
    MIN_FDV: 20000,              // minimum market cap
    MAX_AGE_HOURS_FOR_NEW: 72    // "New Launch" definition
};

// --- EXCLUSION LIST ---
const EXCLUDED_SYMBOLS = [
    'SOL', 'WSOL', 'ETH', 'WETH', 'BTC', 'WBTC', 'BNB', 'WBNB', 
    'USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'USDS', 'EURC', 'STETH', 'USDe', 'FDUSD',
    'RWA', 'TEST', 'DEBUG', 'WSTETH', 'CBETH', 'RETH'
];

// --- DISCOVERY QUERIES (The Robot's Search Path) ---
const TARGET_QUERIES = [
    'SOL', 'WETH', 'WBNB', 'BASE', 'BSC', 'ARBITRUM', 'POLYGON', 'AVALANCHE', 'OPTIMISM',
    'AI', 'AGENT', 'MEME', 'GAMING', 'RWA', 'DEPIN', 'DAO', 'LAYER2',
    'PEPE', 'WIF', 'BONK', 'BRETT', 'MOG', 'POPCAT', 'GOAT', 'MOODENG', 'PNUT', 'ACT', 
    'VIRTUAL', 'SPX', 'GIGA', 'FWOG', 'MEW', 'TRUMP', 'MELANIA', 'TURBO'
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

export const DatabaseService = {
    
    // 1. MAIN FUNCTION CALLED BY DASHBOARD
    getMarketData: async (forceRefresh: boolean = false): Promise<{ data: MarketCoin[], source: string, latency: number }> => {
        const start = performance.now();

        // Step A: Check Supabase "Vault" first
        if (!forceRefresh) {
            try {
                const { data: dbData, error } = await supabase
                    .from('market_tokens')
                    .select('*')
                    .order('updated_at', { ascending: false }) // Show recently scanned tokens first
                    .limit(100); // Target size for the table

                if (error) {
                    console.warn("Supabase Read Error:", error.message);
                } else if (dbData && dbData.length > 0) {
                    const oldestUpdate = new Date(dbData[0].updated_at).getTime();
                    const now = Date.now();
                    
                    // Cache duration: 60s
                    // If DB has less than 20 items, force refresh to fill it up faster
                    if ((now - oldestUpdate) < (60 * 1000) && dbData.length >= 20) {
                        console.log("Serving from Supabase Vault (Fast)");
                        return {
                            data: DatabaseService.mapDbToMarketCoin(dbData),
                            source: 'SUPABASE_DB',
                            latency: Math.round(performance.now() - start)
                        };
                    }
                }
            } catch (err) {
                console.warn("Database Connection Issue:", err);
            }
        }

        // Step B: If Vault is empty, old, or error -> Run the Robot (Ingest)
        console.log("Vault empty or stale. Running Ingestion Robot...");
        const freshData = await DatabaseService.runIngestionRobot();
        
        return {
            data: freshData,
            source: 'LIVE_INGEST',
            latency: Math.round(performance.now() - start)
        };
    },

    // 2. THE ROBOT (Fetches, Filters, Saves to DB)
    runIngestionRobot: async (): Promise<MarketCoin[]> => {
        try {
            // A. Fetch Broad Data
            const results = await Promise.all(TARGET_QUERIES.map(q => fetchWithFallbacks(q)));
            let rawPairs: any[] = [];
            results.forEach(r => { if (r && r.pairs) rawPairs = [...rawPairs, ...r.pairs]; });

            if (rawPairs.length === 0) return [];

            // Sort by creation time (Newest first) to find new gems
            rawPairs.sort((a, b) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0));

            // B. Deduplicate & Filter "The Trash"
            const seenSymbols = new Set();
            const cleanPairs = rawPairs.filter(p => {
                const liq = p.liquidity?.usd || 0;
                const vol = p.volume?.h24 || 0;
                const fdv = p.fdv || 0;
                const symbol = p.baseToken?.symbol?.toUpperCase();
                
                // Exclude junk
                if (EXCLUDED_SYMBOLS.includes(symbol)) return false;
                if (liq < REQUIREMENTS.MIN_LIQUIDITY_USD) return false;
                if (vol < REQUIREMENTS.MIN_VOLUME_24H) return false;
                if (!p.info?.imageUrl) return false; // Must have logo

                // Dedupe
                if (seenSymbols.has(symbol)) return false;
                seenSymbols.add(symbol);

                return true;
            });

            // C. Save to Supabase (The Vault)
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

            if (dbRows.length > 0) {
                const { error } = await supabase.from('market_tokens').upsert(dbRows, { onConflict: 'pair_address' });
                if (error) console.error("Supabase Write Error (Check SQL Table):", error.message);
                else console.log(`Vault Updated: ${dbRows.length} tokens saved.`);
            }

            // D. Return Mapped Data for UI
            return DatabaseService.mapDbToMarketCoin(dbRows);

        } catch (e) {
            console.error("Ingestion Failed", e);
            return [];
        }
    },

    // 3. MAPPER (DB Row -> UI Component)
    mapDbToMarketCoin: (dbRows: any[]): MarketCoin[] => {
        return dbRows.map((row, index) => {
            const buys = row.buy_volume_24h || 0;
            const sells = row.sell_volume_24h || 0;
            const total = buys + sells;
            const flowScore = total > 0 ? Math.round((buys / total) * 100) : 50;
            
            // Heuristic for Net Flow visual
            const netFlowVal = (row.volume_24h * ((flowScore - 50) / 100));
            const netFlowStr = (netFlowVal >= 0 ? '+' : '-') + formatCurrency(Math.abs(netFlowVal));
            
            return {
                id: index,
                name: row.name,
                ticker: row.symbol,
                price: formatPrice(row.price_usd),
                h1: '0.00%', // DB simplified, only stores 24h
                h24: `${row.price_change_24h?.toFixed(2)}%`,
                d7: '0.00%',
                cap: formatCurrency(row.fdv),
                liquidity: formatCurrency(row.liquidity_usd),
                volume24h: formatCurrency(row.volume_24h),
                dexBuys: buys.toString(),
                dexSells: sells.toString(),
                dexFlow: flowScore,
                netFlow: netFlowStr,
                smartMoney: 'Neutral', 
                smartMoneySignal: 'Neutral',
                signal: row.price_change_24h > 20 ? 'Breakout' : 'None',
                riskLevel: row.liquidity_usd < 200000 ? 'Medium' : 'Low',
                age: getTimeAgo(row.pair_created_at),
                createdTimestamp: new Date(row.pair_created_at).getTime(),
                img: row.logo_url,
                trend: row.price_change_24h >= 0 ? 'Bullish' : 'Bearish',
                chain: getChainId(row.chain),
                address: row.pair_address, 
                pairAddress: row.pair_address
            };
        });
    },

    // 4. Token Detail Fetcher (Pass-through to DexScreener for deep dive)
    getTokenDetails: async (query: string): Promise<any> => {
        const result = await fetchWithFallbacks(query);
        if (result && result.pairs && result.pairs.length > 0) {
            return result.pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        }
        return null;
    }
};
