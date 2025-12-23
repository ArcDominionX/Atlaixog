
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Globe, Twitter, Send, ExternalLink, Scan, Zap, Wallet, Bell, Radar, RefreshCw } from 'lucide-react';
import { MarketCoin } from '../types';
import { DatabaseService } from '../services/DatabaseService';
import { MoralisService, RealActivity } from '../services/MoralisService';

interface TokenDetailsProps {
    token: MarketCoin | string;
    onBack: () => void;
}

interface EnrichedTokenData {
    pairAddress: string;
    baseToken: { address: string; name: string; symbol: string };
    priceUsd: string;
    liquidity: { usd: number };
    fdv: number;
    volume: { h24: number; m5: number; h1: number; h6: number };
    priceChange: { m5: number; h1: number; h6: number; h24: number };
    info: { imageUrl?: string; websites?: any[]; socials?: any[] };
    chainId: string;
    dexId: string;
    url: string;
}

// SIMULATION HELPER: Fallback if Moralis Data is empty or fails
const generateActivity = (volume24h: number, price: number, ticker: string) => {
    const activities = [];
    const walletTypes = ['Smart Money', 'Whale', 'Bot', 'Fresh Wallet'];
    
    // Safety check for price to avoid division by zero
    const safePrice = price > 0 ? price : 0.00000001;

    for (let i = 0; i < 8; i++) {
        const isBuy = Math.random() > 0.45;
        const usdValue = Math.random() * (volume24h / 1000); 
        const tokenAmount = usdValue / safePrice;
        const timeAgo = Math.floor(Math.random() * 60);
        const walletAddr = `0x${Math.random().toString(16).substr(2, 4)}...${Math.random().toString(16).substr(2, 3)}`;

        activities.push({
            type: isBuy ? 'Buy' : 'Sell',
            val: `${tokenAmount.toFixed(2)}`,
            desc: isBuy ? `bought on DEX` : `sold on DEX`,
            time: `${timeAgo + 1}m ago`,
            color: isBuy ? 'text-primary-green' : 'text-primary-red',
            usd: `$${usdValue.toLocaleString(undefined, {maximumFractionDigits: 0})}`,
            hash: '0x...',
            wallet: walletAddr,
            tag: walletTypes[Math.floor(Math.random() * walletTypes.length)]
        });
    }

    // Sort by time (newest/lowest timeAgo first)
    return activities.sort((a, b) => parseInt(a.time) - parseInt(b.time));
};

// Helper to map chains for Chart Provider (DexScreener)
const getChartUrl = (chainId: string, pairAddress: string) => {
    // DexScreener Embed URL
    // chains from DexScreener API are usually compatible directly (e.g. 'solana', 'ethereum', 'base')
    return `https://dexscreener.com/${chainId}/${pairAddress}?embed=1&theme=dark&trades=0&info=0`;
};

export const TokenDetails: React.FC<TokenDetailsProps> = ({ token, onBack }) => {
    const [copied, setCopied] = useState(false);
    const [enrichedData, setEnrichedData] = useState<EnrichedTokenData | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Unified State for Activity (Real or Simulated)
    const [activityFeed, setActivityFeed] = useState<RealActivity[]>([]);
    const [isRealData, setIsRealData] = useState(false);

    // Initial Token Info
    const initialTicker = typeof token === 'string' ? token : token.ticker;

    const handleCopy = () => {
        if (enrichedData?.baseToken.address) {
            navigator.clipboard.writeText(enrichedData.baseToken.address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // FETCH DATA
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            // Prioritize Pair Address (most accurate), then Token Address, then Ticker
            const query = typeof token === 'string' 
                ? token 
                : token.pairAddress || token.address || token.ticker;
            
            try {
                // 1. Get Market Data (DexScreener)
                const data = await DatabaseService.getTokenDetails(query);
                
                if (data) {
                    setEnrichedData(data);
                    
                    // 2. Fetch Real On-Chain Data (Moralis)
                    const price = parseFloat(data.priceUsd) || 0;
                    const realActivity = await MoralisService.getTokenActivity(
                        data.baseToken.address, 
                        data.chainId, 
                        data.pairAddress, 
                        price
                    );

                    if (realActivity && realActivity.length > 0) {
                        setActivityFeed(realActivity);
                        setIsRealData(true);
                    } else {
                        // 3. Fallback to Simulation
                        const vol = data.volume?.h24 || 100000;
                        const sim = generateActivity(vol, price, data.baseToken.symbol);
                        const mappedSim: RealActivity[] = sim.map(s => ({
                            type: s.type as any,
                            val: s.val,
                            desc: s.desc,
                            time: s.time,
                            color: s.color,
                            usd: s.usd,
                            hash: s.hash,
                            wallet: s.wallet,
                            tag: s.tag
                        }));
                        setActivityFeed(mappedSim);
                        setIsRealData(false);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch details", e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token]);

    if (loading && !enrichedData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                 <RefreshCw className="animate-spin text-primary-green mb-4" size={40} />
                 <div className="text-xl font-bold">Scanning Chain Data...</div>
            </div>
        );
    }

    const currentPrice = enrichedData ? `$${parseFloat(enrichedData.priceUsd).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}` : '$0.00';
    const priceChangeValue = enrichedData?.priceChange?.h24 ?? 0;
    const priceChange = `${priceChangeValue.toFixed(2)}%`;
    const isPositive = priceChangeValue >= 0;
    
    const fdv = enrichedData ? `$${(enrichedData.fdv || 0).toLocaleString()}` : 'N/A';
    const liq = enrichedData ? `$${(enrichedData.liquidity?.usd || 0).toLocaleString()}` : 'N/A';
    const vol = enrichedData ? `$${(enrichedData.volume?.h24 || 0).toLocaleString()}` : 'N/A';
    const imageUrl = enrichedData?.info?.imageUrl || `https://ui-avatars.com/api/?name=${initialTicker}&background=random`;

    return (
        <div className="flex flex-col gap-6 animate-fade-in pb-10">
            {/* 1. Header Navigation */}
            <button onClick={onBack} className="flex items-center gap-2 text-text-medium hover:text-text-light w-fit transition-colors font-medium">
                <ArrowLeft size={18} /> Back to Market
            </button>

            {/* 2. Top Section */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col gap-6">
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                    {/* Left: Identity */}
                    <div className="flex gap-4 md:gap-5">
                        <img src={imageUrl} className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-border shadow-lg" onError={(e) => e.currentTarget.src='https://via.placeholder.com/64'} />
                        <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl md:text-3xl font-extrabold text-text-light tracking-tight">{enrichedData?.baseToken.name}</h1>
                                <span className="text-lg md:text-xl font-mono text-text-medium font-semibold">{enrichedData?.baseToken.symbol}</span>
                                <span className="bg-[#2F80ED]/10 text-[#2F80ED] text-[10px] font-bold px-2.5 py-1 rounded border border-[#2F80ED]/30 uppercase tracking-wide">{enrichedData?.chainId}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                                <div 
                                    className="flex items-center gap-2 bg-main px-3 py-1.5 rounded-lg border border-border cursor-pointer hover:border-text-medium transition-colors group" 
                                    onClick={handleCopy}
                                >
                                    <span className="font-mono text-xs text-text-medium group-hover:text-text-light transition-colors">
                                        {enrichedData?.baseToken.address.slice(0, 6)}...{enrichedData?.baseToken.address.slice(-4)}
                                    </span>
                                    <Copy size={12} className="text-text-medium group-hover:text-text-light" />
                                    {copied && <span className="text-primary-green text-[10px] font-bold animate-fade-in">Copied</span>}
                                </div>
                                <div className="flex gap-2">
                                    {enrichedData?.info?.websites?.map((w, i) => (
                                         <a key={i} href={w.url} target="_blank" className="w-8 h-8 flex items-center justify-center rounded-lg bg-border/50 text-text-medium hover:bg-card-hover hover:text-white transition-all"><Globe size={16} /></a>
                                    ))}
                                    {enrichedData?.info?.socials?.map((s, i) => (
                                         <a key={i} href={s.url} target="_blank" className="w-8 h-8 flex items-center justify-center rounded-lg bg-border/50 text-text-medium hover:bg-card-hover hover:text-white transition-all capitalize" title={s.type}>{s.type === 'twitter' ? <Twitter size={16} /> : <Send size={16} />}</a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Price, Stats & Performance */}
                    <div className="flex flex-col items-start lg:items-end justify-center w-full lg:w-auto gap-4">
                        <div className="flex items-baseline gap-3">
                            <div className="text-3xl md:text-4xl font-extrabold text-text-light tracking-tight">{currentPrice}</div>
                            <div className={`text-base md:text-lg font-bold px-2 py-0.5 rounded ${isPositive ? 'text-primary-green bg-primary-green/10' : 'text-primary-red bg-primary-red/10'}`}>
                                {priceChange}
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-start lg:justify-end gap-x-8 gap-y-2 w-full">
                            <div className="flex flex-col items-start lg:items-end">
                                <span className="text-[10px] font-bold text-text-medium uppercase tracking-wider">FDV (MCap)</span>
                                <span className="text-sm font-bold text-text-light">{fdv}</span>
                            </div>
                            <div className="flex flex-col items-start lg:items-end">
                                <span className="text-[10px] font-bold text-text-medium uppercase tracking-wider">Liquidity</span>
                                <span className="text-sm font-bold text-text-light">{liq}</span>
                            </div>
                            <div className="flex flex-col items-start lg:items-end">
                                <span className="text-[10px] font-bold text-text-medium uppercase tracking-wider">Volume (24h)</span>
                                <span className="text-sm font-bold text-text-light">{vol}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-start lg:justify-end gap-2 w-full">
                            {[
                                { label: '5M', val: enrichedData?.priceChange?.m5, pos: (enrichedData?.priceChange?.m5 || 0) >= 0 },
                                { label: '1H', val: enrichedData?.priceChange?.h1, pos: (enrichedData?.priceChange?.h1 || 0) >= 0 },
                                { label: '6H', val: enrichedData?.priceChange?.h6, pos: (enrichedData?.priceChange?.h6 || 0) >= 0 },
                                { label: '24H', val: enrichedData?.priceChange?.h24, pos: (enrichedData?.priceChange?.h24 || 0) >= 0 },
                            ].map((item, i) => (
                                <div key={i} className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-border/50 bg-main/30 min-w-[50px] shadow-sm flex-1 lg:flex-none`}>
                                    <span className="text-[9px] font-bold text-text-medium uppercase tracking-wider leading-none mb-1">{item.label}</span>
                                    <span className={`text-xs font-bold leading-none ${item.pos ? 'text-primary-green' : 'text-primary-red'}`}>
                                        {item.val !== undefined ? item.val.toFixed(2) : '0.00'}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Main Content - CHART ONLY */}
            <div className="flex flex-col gap-6">
                
                {/* DEXSCREENER EMBED CHART (Live Data) */}
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col h-[600px] relative">
                    {/* Add a loading skeleton or background */}
                    <div className="absolute inset-0 bg-main z-0 flex items-center justify-center text-text-medium">
                        Loading Chart...
                    </div>
                    <iframe 
                        src={getChartUrl(enrichedData?.chainId || 'ethereum', enrichedData?.pairAddress || '')}
                        style={{ width: '100%', height: '100%', border: '0', position: 'relative', zIndex: 10 }}
                        title="Token Chart"
                        allow="clipboard-write"
                        allowFullScreen
                    ></iframe>
                </div>

                {/* Container for Activity & Wallets */}
                <div className="flex flex-col xl:flex-row gap-6 w-full">
                    {/* On-Chain Activity Feed (Powered by Moralis) */}
                    <div className="flex-1 min-w-0 bg-card border border-border rounded-xl p-6 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-5">
                             <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-text-light">On-Chain Activity</h3>
                                {!isRealData && <span className="text-[10px] bg-primary-yellow/10 text-primary-yellow px-1.5 py-0.5 rounded border border-primary-yellow/30 uppercase font-bold">Simulated</span>}
                                {isRealData && <span className="text-[10px] bg-primary-green/10 text-primary-green px-1.5 py-0.5 rounded border border-primary-green/30 uppercase font-bold">Moralis Live</span>}
                             </div>
                             <span className="text-xs bg-card-hover px-2 py-1 rounded text-text-medium border border-border">Live Feed</span>
                        </div>
                        
                        {/* Feed Content */}
                        <div className="flex flex-col flex-grow">
                            {activityFeed.slice(0, 8).map((item, i) => (
                                <div key={i} className={`flex items-center justify-between py-4 border-b border-border/50 last:border-0 hover:bg-card-hover/20 transition-colors`}>
                                    <div>
                                        <div className={`font-bold text-sm ${item.color} mb-0.5`}>{item.type}</div>
                                        <div className="text-xs text-text-medium">
                                            <span className="font-bold text-text-light">{item.val} {enrichedData?.baseToken.symbol}</span> {item.desc}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="text-xs font-bold text-text-light">{item.usd}</div>
                                        <div className="text-[10px] text-text-dark font-mono font-medium whitespace-nowrap">{item.time}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-4 py-2.5 text-xs font-bold text-text-medium border border-dashed border-border rounded-lg hover:text-text-light hover:border-text-light hover:bg-card-hover transition-all uppercase tracking-wide">
                            Load More Events
                        </button>
                    </div>

                    {/* Wallet Interactions Table */}
                    <div className="flex-1 min-w-0 bg-card border border-border rounded-xl p-6 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-text-light">Wallet Interactions</h3>
                            <span className="text-xs text-text-medium">Real-time scan</span>
                        </div>
                        <div className="overflow-x-auto flex-grow custom-scrollbar pb-2">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-text-dark uppercase tracking-wider border-b border-border">
                                        <th className="pb-4 pl-2 font-bold w-[15%]">Action</th>
                                        <th className="pb-4 font-bold w-[25%]">Amount</th>
                                        <th className="pb-4 font-bold w-[15%]">Time</th>
                                        <th className="pb-4 font-bold w-[25%]">Wallet</th>
                                        <th className="pb-4 text-right pr-2 font-bold w-[20%]">Track</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activityFeed.slice(0, 8).map((row, i) => (
                                        <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-card-hover/40 transition-colors">
                                            <td className="py-4 pl-2">
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                                                    row.type === 'Buy' ? 'bg-primary-green/10 text-primary-green' : 'bg-primary-red/10 text-primary-red'
                                                }`}>
                                                    {row.type}
                                                </span>
                                            </td>
                                            <td className="py-4 font-bold text-text-light text-xs">{row.val} {enrichedData?.baseToken.symbol}</td>
                                            <td className="py-4 text-text-medium font-medium text-xs whitespace-nowrap">{row.time}</td>
                                            <td className="py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-primary-blue cursor-pointer hover:underline text-xs">
                                                        {row.wallet.slice(0, 6)}...{row.wallet.slice(-4)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 text-right pr-2">
                                                <button className="px-3 py-1 bg-card border border-border text-text-medium text-[10px] font-bold rounded hover:bg-card-hover hover:text-text-light transition-all uppercase">
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Quick Actions & CTA */}
                <div className="flex flex-col gap-6">
                    <div className="bg-card border border-border rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                             <Zap size={18} className="text-primary-yellow" />
                             <h3 className="font-bold text-base">Quick Actions</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <button className="bg-card-hover hover:bg-border border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-3 transition-colors group">
                                <div className="w-10 h-10 rounded-full bg-main flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Scan size={20} className="text-text-medium group-hover:text-primary-green transition-colors" />
                                </div>
                                <span className="text-xs font-bold text-text-light">Risk Scan</span>
                            </button>
                            <button className="bg-card-hover hover:bg-border border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-3 transition-colors group">
                                <div className="w-10 h-10 rounded-full bg-main flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Radar size={20} className="text-text-medium group-hover:text-primary-yellow transition-colors" />
                                </div>
                                <span className="text-xs font-bold text-text-light">Detection</span>
                            </button>
                            <button className="bg-card-hover hover:bg-border border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-3 transition-colors group">
                                <div className="w-10 h-10 rounded-full bg-main flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Wallet size={20} className="text-text-medium group-hover:text-primary-blue transition-colors" />
                                </div>
                                <span className="text-xs font-bold text-text-light">Wallet Tracking</span>
                            </button>
                            <button className="bg-card-hover hover:bg-border border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-3 transition-colors group">
                                <div className="w-10 h-10 rounded-full bg-main flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Bell size={20} className="text-text-medium group-hover:text-primary-red transition-colors" />
                                </div>
                                <span className="text-xs font-bold text-text-light">Set Alert</span>
                            </button>
                        </div>
                    </div>

                    <a 
                        href={enrichedData?.url}
                        target="_blank"
                        className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:bg-card-hover hover:border-text-medium transition-all cursor-pointer group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#FF007A]/10 flex items-center justify-center border border-[#FF007A]/20">
                                <img src="https://cryptologos.cc/logos/uniswap-uni-logo.png" alt="Uniswap" className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-text-light">Trade on {enrichedData?.dexId.toUpperCase() || 'DEX'}</span>
                                <span className="text--[10px] text-text-medium">Best rates via aggregator</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-text-light group-hover:text-white uppercase tracking-wide">View Pair</span>
                            <ExternalLink size={16} className="text-text-medium group-hover:text-white" />
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
};
