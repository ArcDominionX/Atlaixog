
// Deno Edge Function - Market Scanner Bot
// Deploy this to Supabase Functions to run 24/7 for free!
// 1. Initialize: supabase functions new market-scanner
// 2. Copy this content into index.ts
// 3. Deploy: supabase functions deploy market-scanner

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Fix for TypeScript error: Cannot find name 'Deno'
declare const Deno: any;

const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex/search';
const QUERIES = ['SOL', 'RAY', 'PUMP', 'WBNB', 'BSC', 'WETH', 'BASE', 'BRETT', 'USDC', 'USDT'];

// Environment variables are automatically injected by Supabase
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: any) => {
  console.log("🤖 Edge Bot: Starting Scan...");

  try {
    // 1. Fetch from DexScreener
    const promises = QUERIES.map(q => 
      fetch(`${DEXSCREENER_API_URL}?q=${q}`)
        .then(r => r.json())
        .catch(() => ({ pairs: [] }))
    );
    
    const results = await Promise.all(promises);
    let allPairs: any[] = [];
    results.forEach(r => { if (r.pairs) allPairs = [...allPairs, ...r.pairs]; });

    // 2. Filter High Quality Tokens
    const seen = new Set();
    const validPairs = [];
    const EXCLUDED = ['SOL', 'WETH', 'WBTC', 'USDC', 'USDT', 'BNB', 'WBNB'];

    for (const p of allPairs) {
        const sym = p.baseToken.symbol.toUpperCase();
        if (seen.has(sym)) continue;
        if (EXCLUDED.includes(sym)) continue;
        if (!p.info?.imageUrl) continue; 

        // Requirements
        const liq = p.liquidity?.usd || 0;
        const vol = p.volume?.h24 || 0;
        
        if (liq < 50000) continue;
        if (vol < 10000) continue;

        seen.add(sym);
        validPairs.push(p);
    }

    // 3. Map to Database Schema
    const dbPayload = validPairs.map((pair) => {
        // Create a simplified "MarketCoin" shape for the raw_data column
        const rawData = {
           name: pair.baseToken.name,
           ticker: pair.baseToken.symbol,
           price: pair.priceUsd,
           liquidity: `$${(pair.liquidity?.usd || 0).toFixed(2)}`,
           volume24h: `$${(pair.volume?.h24 || 0).toFixed(2)}`,
           chain: pair.chainId,
           address: pair.baseToken.address,
           pairAddress: pair.pairAddress,
           img: pair.info?.imageUrl,
           h24: `${(pair.priceChange?.h24 || 0).toFixed(2)}%`,
           createdTimestamp: pair.pairCreatedAt || Date.now()
        };

        return {
           address: pair.baseToken.address,
           ticker: pair.baseToken.symbol,
           name: pair.baseToken.name,
           chain: pair.chainId,
           price: pair.priceUsd,
           liquidity: `$${(pair.liquidity?.usd || 0).toFixed(2)}`,
           volume_24h: `$${(pair.volume?.h24 || 0).toFixed(2)}`,
           last_seen_at: new Date(),
           raw_data: rawData
        };
    });

    // 4. Upsert to Supabase
    if (dbPayload.length > 0) {
        const { error } = await supabase
            .from('discovered_tokens')
            .upsert(dbPayload, { onConflict: 'address' });
            
        if (error) {
            console.error("Supabase Error:", error);
            return new Response(JSON.stringify({ error: error.message }), { headers: { "Content-Type": "application/json" }, status: 500 });
        }
        
        console.log(`✅ Synced ${dbPayload.length} tokens.`);
        return new Response(JSON.stringify({ success: true, count: dbPayload.length }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, count: 0 }), { headers: { "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { headers: { "Content-Type": "application/json" }, status: 500 });
  }
});
