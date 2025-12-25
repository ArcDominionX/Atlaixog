
import { MarketCoin } from '../types';
import { createClient } from '@supabase/supabase-js';
import { APP_CONFIG } from '../config';

// --- INITIALIZE SUPABASE ---
const supabase = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseServiceKey);

// Using DexScreener Public API
const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex/search';

// --- RESEARCH & GEM REQUIREMENTS ---
const REQUIREMENTS = {
    MIN_LIQUIDITY_USD: 1000,     
    MIN_VOLUME_24H: 500,         
    MIN_TXNS_24H: 5,             
    MIN_FDV: 1000,               
    // MAX_AGE_HOURS_FOR_NEW removed as requirement
};

// --- EXCLUSION LIST ---
const EXCLUDED_SYMBOLS = [
    'SOL', 'WSOL', 'ETH', 'WETH', 'BTC', 'WBTC', 'BNB', 'WBNB', 
    'USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'USDS', 'EURC', 'STETH', 'USDe', 'FDUSD',
    'RWA', 'TEST', 'DEBUG', 'WSTETH', 'CBETH', 'RETH', 'WRAPPED', 'MSOL', 'JITOSOL'
];

// --- [HERE IS THE KEYWORD SEARCH LIST] ---
// The robot cycles through these terms to find new tokens.
const TARGET_QUERIES = [
    // 1. Ecosystems
    'SOLANA', 'BASE', 'ETHEREUM', 'BSC', 'ARBITRUM', 'AVALANCHE', 'SUI', 'APTOS', 'SEI',
    
    // 2. Generic "Meme" Terms (Finds new junk/gold)
    'DOG', 'CAT', 'INU', 'PEP', 'PEPE', 'COIN', 'MOON', 'SAFE', 'ELON', 'MARS', 
    'SWAP', 'DAO', 'AI', 'GPT', 'GROK', 'BOT', 'TECH', 'FI', 'PROTOCOL', 'YIELD',
    'RED', 'BLUE', 'GREEN', 'GOLD', 'SILVER', 'BULL', 'BEAR', 'APE', 'CHAD',
    
    // 3. Trending Tickers (Specifics)
    'WIF', 'BONK', 'BRETT', 'MOG', 'POPCAT', 'GOAT', 'MOODENG', 'PNUT', 'ACT', 'LUCE',
    'VIRTUAL', 'SPX', 'GIGA', 'FWOG', 'MEW', 'TRUMP', 'MELANIA', 'TURBO', 'NEIRO', 'BABYDOGE',
    'DEGEN', 'KLAUS', 'RETARDIO', 'VINE', 'CHILL', 'FART', 'SIGMA', 'CHAD',
    
    // 4. Discovery Keywords
    'NEW', 'LAUNCH', 'FAIR', 'PUMP', 'ALPHA', 'GEM', 'X', 'TESLA', 'SPACE', 'ROCKET'
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

// Utility: Shuffle Array to randomize search sectors
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

export const DatabaseService = {
    
    // 1. MAIN FUNCTION CALLED BY DASHBOARD
    getMarketData: async (forceRefresh: boolean = false): Promise<{ data: MarketCoin[], source: string, latency: number }> => {
        const start = performance.now();

        // Step A: Read from Vault
        try {
            const { data: dbData, error } = await supabase
                .from('market_tokens')
                .select('*')
                .order('pair_created_at', { ascending: false }) // NEWEST FIRST
                .limit(250);

            if (dbData && dbData.length > 0) {
                return {
                    data: DatabaseService.mapDbToMarketCoin(dbData),
                    source: 'SUPABASE_DB',
                    latency: Math.round(performance.now() - start)
                };
            }
        } catch (err) {
            console.warn("Database Connection Issue:", err);
        }

        // Step B: If Vault empty, trigger robot
        console.log("Vault empty. Triggering immediate ingestion...");
        const freshData = await DatabaseService.runIngestionRobot();
        
        return {
            data: freshData,
            source: 'LIVE_INGEST',
            latency: Math.round(performance.now() - start)
        };
    },

    // 2. BACKGROUND CHECKER (Called by App.tsx Global Worker)
    checkAndTriggerIngestion: async () => {
        try {
            const { data, error } = await supabase
                .from('market_tokens')
                .select('updated_at')
                .order('updated_at', { ascending: false })
                .limit(1);

            const now = Date.now();
            let needsUpdate = false;

            if (error || !data || data.length === 0) {
                needsUpdate = true;
            } else {
                const lastUpdate = new Date(data[0].updated_at).getTime();
                // Check every 15s to keep feed alive
                if (now - lastUpdate > 15000) {
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                await DatabaseService.runIngestionRobot();
            }
        } catch (e) {
            console.error("Background sync failed", e);
        }
    },

    // 3. THE ROBOT (Fetches, Filters, Saves to DB)
    runIngestionRobot: async (): Promise<MarketCoin[]> => {
        try {
            // A. Randomized Sector Scan
            const shuffledQueries = shuffleArray([...TARGET_QUERIES]).slice(0, 30);
            let rawPairs: any[] = [];

            // Execute sequentially
            for (const query of shuffledQueries) {
                const result = await fetchWithFallbacks(query);
                if (result && result.pairs) {
                    rawPairs = [...rawPairs, ...result.pairs];
                }
                await sleep(100); 
            }

            // B. Deduplicate & Filter
            const seenSymbols = new Set();
            const cleanPairs = rawPairs.filter(p => {
                const liq = p.liquidity?.usd || 0;
                const vol = p.volume?.h24 || 0;
                const symbol = p.baseToken?.symbol?.toUpperCase();
                
                // Note: Age filtering removed to allow all tokens

                if (EXCLUDED_SYMBOLS.includes(symbol)) return false;
                if (liq < REQUIREMENTS.MIN_LIQUIDITY_USD) return false;
                if (vol < REQUIREMENTS.MIN_VOLUME_24H) return false;
                if (!p.info?.imageUrl) return false;
                
                // NO STRICT AGE CHECK

                if (seenSymbols.has(symbol)) return false;
                seenSymbols.add(symbol);

                return true;
            });

            // C. Save to Supabase (Upsert to accumulate)
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

                const { error } = await supabase.from('market_tokens').upsert(dbRows, { onConflict: 'pair_address' });
                if (error) console.error("Supabase Write Error:", error.message);
                else console.log(`Vault Updated: ${dbRows.length} NEW tokens added.`);
            }

            // D. Return ALL tokens (Accumulated up to 250)
            const { data: allTokens } = await supabase
                .from('market_tokens')
                .select('*')
                .order('pair_created_at', { ascending: false }) // Return newest first
                .limit(250);

            return DatabaseService.mapDbToMarketCoin(allTokens || []);

        } catch (e) {
            console.error("Ingestion Failed", e);
            return [];
        }
    },

    // 4. MAPPER (DB Row -> UI Component)
    mapDbToMarketCoin: (dbRows: any[]): MarketCoin[] => {
        return dbRows.map((row, index) => {
            const buys = row.buy_volume_24h || 0;
            const sells = row.sell_volume_24h || 0;
            const total = buys + sells;
            const flowScore = total > 0 ? Math.round((buys / total) * 100) : 50;
            
            const netFlowVal = (row.volume_24h * ((flowScore - 50) / 100));
            const netFlowStr = (netFlowVal >= 0 ? '+' : '-') + formatCurrency(Math.abs(netFlowVal));
            
            return {
                id: index,
                name: row.name,
                ticker: row.symbol,
                price: formatPrice(row.price_usd),
                h1: '0.00%',
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
                riskLevel: row.liquidity_usd < 100000 ? 'High' : 'Medium',
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

    // 5. Token Detail Fetcher
    getTokenDetails: async (query: string): Promise<any> => {
        const result = await fetchWithFallbacks(query);
        if (result && result.pairs && result.pairs.length > 0) {
            return result.pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        }
        return null;
    }
};
