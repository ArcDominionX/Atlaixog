import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Copy, Globe, Twitter, Send, ShieldCheck, Activity, Lock, ChevronDown, ExternalLink, Scan, Zap, Wallet, Bell, BarChart2, Settings, Maximize2, Radar } from 'lucide-react';
import { MarketCoin } from '../types';

// Declare ApexCharts
declare var ApexCharts: any;

interface TokenDetailsProps {
    token: MarketCoin | string;
    onBack: () => void;
}

export const TokenDetails: React.FC<TokenDetailsProps> = ({ token, onBack }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<any>(null);
    const [timeframe, setTimeframe] = useState('15m');
    const [copied, setCopied] = useState(false);

    // Normalize Token Data
    const tokenName = typeof token === 'string' ? token : token.name;
    const tokenTicker = typeof token === 'string' ? token.toUpperCase() : token.ticker;
    const tokenPrice = typeof token === 'string' ? '$0.00' : token.price;
    const tokenChange = typeof token === 'string' ? '+0.00%' : token.h24;
    const isPositive = tokenChange.includes('+');
    const tokenImg = typeof token === 'object' ? token.img : `https://ui-avatars.com/api/?name=${tokenName}&background=random`;

    const handleCopy = () => {
        navigator.clipboard.writeText('0xC02aa...56cz');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Main Candle Chart Initialization
    useEffect(() => {
        if (chartRef.current && typeof ApexCharts !== 'undefined') {
            let data = [];
            let price = 3400;
            // Generate data to look somewhat realistic
            const now = new Date().getTime();
            for (let i = 0; i < 150; i++) {
                const open = price + Math.random() * 50 - 25;
                const close = open + Math.random() * 50 - 25;
                const high = Math.max(open, close) + Math.random() * 15;
                const low = Math.min(open, close) - Math.random() * 15;
                data.push({
                    x: now - (150 - i) * (timeframe === '15m' ? 900000 : 3600000),
                    y: [open.toFixed(2), high.toFixed(2), low.toFixed(2), close.toFixed(2)]
                });
                price = close;
            }

            const options = {
                series: [{ data: data }],
                chart: {
                    type: 'candlestick',
                    height: 500,
                    fontFamily: 'Inter, sans-serif',
                    background: 'transparent',
                    toolbar: {
                        show: true,
                        tools: {
                            download: false,
                            selection: true,
                            zoom: true,
                            zoomin: true,
                            zoomout: true,
                            pan: true,
                            reset: true
                        },
                        autoSelected: 'pan' 
                    },
                    zoom: {
                        enabled: true,
                        type: 'x',
                        autoScaleYaxis: true
                    }
                },
                theme: { mode: 'dark' },
                xaxis: {
                    type: 'datetime',
                    tooltip: { enabled: true },
                    axisBorder: { show: false },
                    axisTicks: { show: false },
                    labels: { style: { colors: '#8F96A3' } },
                    crosshairs: {
                        show: true,
                        width: 1,
                        position: 'back',
                        opacity: 0.9,
                        stroke: { color: '#8F96A3', width: 1, dashArray: 3 }
                    }
                },
                yaxis: {
                    tooltip: { enabled: true },
                    opposite: true,
                    labels: { style: { colors: '#8F96A3' }, formatter: (val: number) => `$${val.toFixed(2)}` }
                },
                grid: {
                    borderColor: '#2A2E33',
                    strokeDashArray: 4,
                    xaxis: { lines: { show: true } },
                    yaxis: { lines: { show: true } }
                },
                plotOptions: {
                    candlestick: {
                        colors: {
                            upward: '#26D356',
                            downward: '#EB5757'
                        },
                        wick: { useFillColor: true }
                    }
                }
            };

            if (chartInstance.current) chartInstance.current.destroy();
            chartInstance.current = new ApexCharts(chartRef.current, options);
            chartInstance.current.render();
        }
        return () => { if (chartInstance.current) chartInstance.current.destroy(); };
    }, [timeframe]);

    return (
        <div className="flex flex-col gap-6 animate-fade-in pb-10">
            {/* 1. Header Navigation */}
            <button onClick={onBack} className="flex items-center gap-2 text-text-medium hover:text-text-light w-fit transition-colors font-medium">
                <ArrowLeft size={18} /> Back to Market
            </button>

            {/* 2. Top Section */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col gap-6">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                    {/* Left: Identity */}
                    <div className="flex gap-4 md:gap-5">
                        <img src={tokenImg} className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-border shadow-lg" onError={(e) => e.currentTarget.src='https://via.placeholder.com/64'} />
                        <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl md:text-3xl font-extrabold text-text-light tracking-tight">{tokenName}</h1>
                                <span className="text-lg md:text-xl font-mono text-text-medium font-semibold">{tokenTicker}</span>
                                <span className="bg-[#2F80ED]/10 text-[#2F80ED] text-[10px] font-bold px-2.5 py-1 rounded border border-[#2F80ED]/30 uppercase tracking-wide">Ethereum</span>
                            </div>
                            <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                                <div 
                                    className="flex items-center gap-2 bg-main px-3 py-1.5 rounded-lg border border-border cursor-pointer hover:border-text-medium transition-colors group" 
                                    onClick={handleCopy}
                                >
                                    <span className="font-mono text-xs text-text-medium group-hover:text-text-light transition-colors">0xC02aa...56cz</span>
                                    <Copy size={12} className="text-text-medium group-hover:text-text-light" />
                                    {copied && <span className="text-primary-green text-[10px] font-bold animate-fade-in">Copied</span>}
                                </div>
                                <div className="flex gap-2">
                                    <a href="#" className="w-8 h-8 flex items-center justify-center rounded-lg bg-border/50 text-text-medium hover:bg-card-hover hover:text-white transition-all"><Globe size={16} /></a>
                                    <a href="#" className="w-8 h-8 flex items-center justify-center rounded-lg bg-border/50 text-text-medium hover:bg-card-hover hover:text-[#1DA1F2] transition-all"><Twitter size={16} /></a>
                                    <a href="#" className="w-8 h-8 flex items-center justify-center rounded-lg bg-border/50 text-text-medium hover:bg-card-hover hover:text-[#0088cc] transition-all"><Send size={16} /></a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Price, Stats & Performance (Organized vertically) */}
                    <div className="flex flex-col items-start md:items-end justify-center w-full md:w-auto gap-4">
                        
                        {/* 1. Price Header */}
                        <div className="flex items-baseline gap-3">
                            <div className="text-3xl md:text-4xl font-extrabold text-text-light tracking-tight">{tokenPrice}</div>
                            <div className={`text-base md:text-lg font-bold px-2 py-0.5 rounded ${isPositive ? 'text-primary-green bg-primary-green/10' : 'text-primary-red bg-primary-red/10'}`}>
                                {tokenChange}
                            </div>
                        </div>
                        
                        {/* 2. Key Market Stats */}
                        <div className="flex flex-wrap justify-start md:justify-end gap-x-8 gap-y-2 w-full">
                            <div className="flex flex-col items-start md:items-end">
                                <span className="text-[10px] font-bold text-text-medium uppercase tracking-wider">Market Cap</span>
                                <span className="text-sm font-bold text-text-light">$410.2B</span>
                            </div>
                            <div className="flex flex-col items-start md:items-end">
                                <span className="text-[10px] font-bold text-text-medium uppercase tracking-wider">Liquidity</span>
                                <span className="text-sm font-bold text-text-light">$482.6M</span>
                            </div>
                            <div className="flex flex-col items-start md:items-end">
                                <span className="text-[10px] font-bold text-text-medium uppercase tracking-wider">Volume (24h)</span>
                                <span className="text-sm font-bold text-text-light">$670M</span>
                            </div>
                        </div>

                        {/* 3. Performance Metrics */}
                        <div className="flex flex-wrap justify-start md:justify-end gap-2 w-full">
                            {[
                                { label: '30M', val: '-0.45%', pos: false },
                                { label: '1H', val: '-16.0%', pos: false },
                                { label: '6H', val: '-5.3%', pos: false },
                                { label: '24H', val: '+22.3%', pos: true },
                                { label: '7D', val: '+12.4%', pos: true },
                                { label: '30D', val: '+145%', pos: true },
                            ].map((item, i) => (
                                <div key={i} className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-border/50 bg-main/30 min-w-[50px] shadow-sm`}>
                                    <span className="text-[9px] font-bold text-text-medium uppercase tracking-wider leading-none mb-1">{item.label}</span>
                                    <span className={`text-xs font-bold leading-none ${item.pos ? 'text-primary-green' : 'text-primary-red'}`}>
                                        {item.val}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* 4. Token Stats (Moved from main body) */}
                        <div className="flex flex-wrap justify-start md:justify-end gap-2 w-full">
                            {[
                                { l: 'Txns 24h', v: '38.2K', c: 'text-text-light' },
                                { l: 'Active Wallets', v: '12.9K', c: 'text-text-light' },
                                { l: 'Buy Vol', v: '$670M', c: 'text-primary-green' },
                                { l: 'Sell Vol', v: '$510M', c: 'text-primary-red' },
                                { l: 'Net Vol', v: '+$160M', c: 'text-primary-green' },
                                { l: 'Liq Pools', v: '128', c: 'text-text-light' }
                            ].map((stat, i) => (
                                <div key={i} className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-border/50 bg-main/30 min-w-[50px] shadow-sm">
                                    <span className="text-[9px] font-bold text-text-medium uppercase tracking-wider leading-none mb-1">{stat.l}</span>
                                    <span className={`text-xs font-bold leading-none ${stat.c}`}>{stat.v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Main Content (No Sidebar) */}
            <div className="flex flex-col gap-6">
                
                {/* Standard Chart Section */}
                <div className="bg-card border border-border rounded-xl p-1 overflow-hidden shadow-sm flex flex-col">
                    <div className="flex justify-between items-center p-3 border-b border-border bg-[#16181a]">
                        <div className="flex gap-1">
                            {['5m', '15m', '1h', '4h', '1D', '1W'].map(t => (
                                <button 
                                    key={t} 
                                    onClick={() => setTimeframe(t)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${timeframe === t ? 'bg-[#2F80ED] text-white shadow-md' : 'text-text-medium hover:bg-card-hover hover:text-text-light'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                        <button className="text-xs flex items-center gap-1.5 text-text-medium hover:text-text-light font-medium px-3 py-1.5 rounded hover:bg-card-hover transition-colors">
                            <ExternalLink size={14} /> Open in TradingView
                        </button>
                    </div>
                    <div className="w-full h-[500px] relative">
                        <div ref={chartRef} className="w-full h-full"></div>
                    </div>
                </div>

                {/* Container for Activity & Wallets */}
                <div className="flex flex-col xl:flex-row gap-6 w-full">
                    {/* On-Chain Activity */}
                    <div className="flex-1 min-w-0 bg-card border border-border rounded-xl p-6 h-full flex flex-col">
                        <h3 className="text-lg font-bold mb-5 text-text-light">On-Chain Activity</h3>
                        <div className="flex flex-col flex-grow">
                            {[
                                { type: 'Liquidity Added', val: '+$12.4M', desc: 'added to Uniswap V3', time: '2h ago', color: 'text-primary-green' },
                                { type: 'Large Transaction', val: '3,200 ETH', desc: 'transferred from 0x9f...32a', time: '4h ago', color: 'text-primary-blue' },
                                { type: 'Liquidity Removed', val: '-$3.1M', desc: 'withdrawn from SushiSwap', time: '6h ago', color: 'text-primary-red' },
                                { type: 'Transaction Spike', val: 'Surge', desc: 'in transactions detected', time: '8h ago', color: 'text-primary-purple' },
                                { type: 'Large Buy', val: '500 ETH', desc: 'bought by Whale 0x3a', time: '9h ago', color: 'text-primary-green' },
                            ].map((item, i) => (
                                <div key={i} className={`flex items-center justify-between py-4 border-b border-border/50 last:border-0 hover:bg-card-hover/20 transition-colors`}>
                                    <div>
                                        <div className={`font-bold text-sm ${item.color} mb-0.5`}>{item.type}</div>
                                        <div className="text-xs text-text-medium"><span className="font-bold text-text-light">{item.val}</span> {item.desc}</div>
                                    </div>
                                    <div className="text-xs text-text-dark font-mono font-medium whitespace-nowrap ml-2">{item.time}</div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-4 py-2.5 text-xs font-bold text-text-medium border border-dashed border-border rounded-lg hover:text-text-light hover:border-text-light hover:bg-card-hover transition-all uppercase tracking-wide">
                            See More Activity
                        </button>
                    </div>

                    {/* Wallet Interactions Table */}
                    <div className="flex-1 min-w-0 bg-card border border-border rounded-xl p-6 h-full flex flex-col">
                        <h3 className="text-lg font-bold mb-6 text-text-light">Wallet Interactions</h3>
                        <div className="overflow-x-auto flex-grow custom-scrollbar pb-2">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-text-dark uppercase tracking-wider border-b border-border">
                                        <th className="pb-4 pl-2 font-bold w-[15%]">Action</th>
                                        <th className="pb-4 font-bold w-[20%]">Amount</th>
                                        <th className="pb-4 font-bold w-[15%]">Time</th>
                                        <th className="pb-4 font-bold w-[30%]">Wallet</th>
                                        <th className="pb-4 text-right pr-2 font-bold w-[20%]">Options</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { w: '0x9f...32a', a: 'Buy', amt: '1,200 ETH', t: '4h ago', type: 'buy' },
                                        { w: '0x4b...91c', a: 'Sell', amt: '800 ETH', t: '5h ago', type: 'sell' },
                                        { w: '0x1c...99b', a: 'Buy', amt: '450 ETH', t: '8h ago', type: 'buy' },
                                        { w: '0x7d...a44', a: 'Sell', amt: '1,500 ETH', t: '9h ago', type: 'sell' },
                                        { w: '0x3a...11f', a: 'Buy', amt: '200 ETH', t: '11h ago', type: 'buy' },
                                    ].map((row, i) => (
                                        <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-card-hover/40 transition-colors">
                                            <td className="py-5 pl-2">
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                                                    row.type === 'buy' ? 'bg-primary-green/10 text-primary-green' : 'bg-primary-red/10 text-primary-red'
                                                }`}>
                                                    {row.a}
                                                </span>
                                            </td>
                                            <td className="py-5 font-bold text-text-light text-xs">{row.amt}</td>
                                            <td className="py-5 text-text-medium font-medium text-xs whitespace-nowrap">{row.t}</td>
                                            <td className="py-5 font-mono text-primary-blue cursor-pointer hover:underline text-xs">{row.w}</td>
                                            <td className="py-5 text-right pr-2">
                                                <div className="flex gap-2 justify-end">
                                                    <button className="px-2 py-1 bg-transparent border border-border text-text-medium text-[10px] font-bold rounded hover:bg-card-hover hover:text-text-light transition-all uppercase">View</button>
                                                    <button className="px-2 py-1 bg-primary-green/10 border border-primary-green/30 text-primary-green text-[10px] font-bold rounded hover:bg-primary-green hover:text-main transition-all uppercase">Track</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button className="w-full mt-4 py-2.5 text-xs font-bold text-text-medium border border-dashed border-border rounded-lg hover:text-text-light hover:border-text-light hover:bg-card-hover transition-all uppercase tracking-wide">
                            See More Interactions
                        </button>
                    </div>
                </div>

                {/* Bottom Section: Quick Actions & CTA */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-stretch">
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
                    
                    {/* CTA Button */}
                    <button className="h-full min-h-[100px] md:w-[280px] py-4 bg-gradient-to-r from-primary-green to-[#1fa845] text-main font-bold rounded-xl hover:opacity-90 transition-all shadow-lg transform active:scale-[0.98] text-base uppercase tracking-wide flex flex-col items-center justify-center gap-2">
                         <span>Trade on Uniswap</span>
                         <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded text-white/80 normal-case font-medium">Best rates via aggregator</span>
                    </button>
                </div>
            </div>
        </div>
    );
};