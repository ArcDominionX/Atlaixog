
/**
 * BACKGROUND BOT - TOKEN SCANNER
 * 
 * Run this script on a server (or local machine) to keep the database populated 24/7.
 * Usage: node src/scripts/run-bot.js
 */

const { createClient } = require('@supabase/supabase-js');

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://whjctcgbwfehtjbamgks.supabase.co';
// USE SERVICE KEY (from config.ts) so we have write access
const SUPABASE_KEY = 'sb_secret_F6jQDgU4P6S07OSlFcMcfw_gezym6ww'; 

const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex/search';

// Search Anchors
const QUERIES = ['SOL', 'RAY', 'PUMP', 'WBNB', 'BSC', 'WETH', 'BASE', 'BRETT', 'USDC', 'USDT'];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("🤖 Atlaix Bot Initialized. Starting scan loop...");

// --- HELPERS ---
const formatCurrency = (value) => {
    if (!value) return '$0.00';
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
};

const formatPrice = (price) => {
    const num = parseFloat(price);
    if (isNaN(num)) return '$0.00';
    if (num < 0.0001) return `$${num.toExponential(2)}`;
    if (num < 1.00) return `$${num.toFixed(6)}`;
    return `$${num.toFixed(2)}`;
};

const getChainId = (chainId) => {
    if (chainId === 'solana') return 'solana';
    if (chainId === 'ethereum') return 'ethereum';
    if (chainId === 'bsc') return 'bsc';
    if (chainId === 'base') return 'base';
    return 'ethereum'; 
};

// --- CORE LOGIC ---
async function scanAndSave() {
    const start = Date.now();
    console.log(`[${new Date().toLocaleTimeString()}] Scanning markets...`);

    try {
        // 1. Fetch
        const promises = QUERIES.map(q => fetch(`${DEXSCREENER_API_URL}?q=${q}`).then(r => r.json()).catch(e => ({ pairs: [] })));
        const results = await Promise.all(promises);

        let allPairs = [];
        results.forEach(r => {
            if (r.pairs) allPairs = [...allPairs, ...r.pairs];
        });

        console.log(`   -> Found ${allPairs.length} raw pairs`);

        // 2. Filter & Deduplicate
        allPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
        
        const validPairs = [];
        const seen = new Set();
        const EXCLUDED = ['SOL', 'WETH', 'WBTC', 'USDC', 'USDT', 'BNB', 'WBNB'];

        for (const p of allPairs) {
            const sym = p.baseToken.symbol.toUpperCase();
            if (seen.has(sym)) continue;
            if (EXCLUDED.includes(sym)) continue;
            if (!p.info?.imageUrl) continue; // Must have image

            // Minimum Requirements
            if ((p.liquidity?.usd || 0) < 50000) continue;
            if (p.volume.h24 < 10000) continue;

            seen.add(sym);
            validPairs.push(p);
        }

        console.log(`   -> Filtered to ${validPairs.length} alpha candidates`);

        // 3. Transform to MarketCoin format
        const dbPayload = validPairs.map((pair, index) => {
             // Reconstruct MarketCoin object
             const buys = pair.txns?.h24?.buys || 0;
             const sells = pair.txns?.h24?.sells || 0;
             const totalTxns = buys + sells;
             const flowRatio = totalTxns > 0 ? (buys / totalTxns) : 0.5;
             const estimatedNetFlow = (pair.volume.h24 * (flowRatio - 0.5));
             
             const rawData = {
                id: index,
                name: pair.baseToken.name,
                ticker: pair.baseToken.symbol,
                price: formatPrice(pair.priceUsd),
                h1: `${(pair.priceChange?.h1 || 0).toFixed(2)}%`,
                h24: `${(pair.priceChange?.h24 || 0).toFixed(2)}%`,
                d7: `${(pair.priceChange?.h6 || 0).toFixed(2)}%`,
                cap: formatCurrency(pair.fdv || pair.liquidity?.usd || 0),
                liquidity: formatCurrency(pair.liquidity?.usd || 0),
                volume24h: formatCurrency(pair.volume.h24),
                dexBuys: buys.toString(),
                dexSells: sells.toString(),
                dexFlow: Math.round(flowRatio * 100),
                netFlow: (estimatedNetFlow >= 0 ? '+' : '-') + formatCurrency(Math.abs(estimatedNetFlow)),
                smartMoney: estimatedNetFlow > 50000 ? 'Inflow' : 'Neutral',
                smartMoneySignal: estimatedNetFlow > 50000 ? 'Inflow' : estimatedNetFlow < -50000 ? 'Outflow' : 'Neutral',
                signal: 'None', // Simplified for bot
                riskLevel: (pair.liquidity?.usd || 0) < 100000 ? 'High' : 'Medium',
                age: 'Unknown',
                createdTimestamp: pair.pairCreatedAt || Date.now(),
                img: pair.info?.imageUrl,
                trend: (pair.priceChange?.h24 || 0) >= 0 ? 'Bullish' : 'Bearish',
                chain: getChainId(pair.chainId),
                address: pair.baseToken.address,
                pairAddress: pair.pairAddress
             };

             return {
                address: pair.baseToken.address,
                ticker: pair.baseToken.symbol,
                name: pair.baseToken.name,
                chain: getChainId(pair.chainId),
                price: rawData.price,
                liquidity: rawData.liquidity,
                volume_24h: rawData.volume24h,
                last_seen_at: new Date(),
                raw_data: rawData
             };
        });

        // 4. Save to Supabase
        if (dbPayload.length > 0) {
            const { error } = await supabase
                .from('discovered_tokens')
                .upsert(dbPayload, { onConflict: 'address' });

            if (error) console.error("Supabase Error:", error.message);
            else console.log(`   -> Successfully synced ${dbPayload.length} tokens to DB`);
        }

    } catch (e) {
        console.error("Scan failed:", e);
    }

    console.log(`   -> Done in ${Date.now() - start}ms. Waiting...`);
}

// Run immediately, then every 60 seconds
scanAndSave();
setInterval(scanAndSave, 60000);
