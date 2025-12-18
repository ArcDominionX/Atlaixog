import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Copy, Globe, Twitter, Send, ShieldCheck, Activity, Lock, ChevronDown, ExternalLink, Scan, Zap, Wallet, Bell } from 'lucide-react';
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
    const holderChartRef = useRef<HTMLDivElement>(null);
    const holderChartInstance = useRef<any>(null);
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

    // Holders Pie Chart Initialization
    useEffect(() => {
        if (holderChartRef.current && typeof ApexCharts !== 'undefined') {
            const options = {
                series: [5, 20, 75],
                labels: ['Developer', 'Top 10 Holders', 'Rest of Holders'],
                chart: {
                    type: 'donut',
                    height: 250,
                    background: 'transparent'
                },
                colors: ['#EB5757', '#F2C94C', '#2F80ED'],
                stroke: { show: false },
                dataLabels: { enabled: false },
                legend: {
                    position: 'bottom',
                    labels: { colors: '#EAECEF', fontFamily: 'Inter' },
                    itemMargin: { horizontal: 10, vertical: 5 },
                    markers: {
                        width: 10,
                        height: 10,
                        strokeWidth: 0,
                        radius: 10
                    }
                },
                plotOptions: {
                    pie: {
                        donut: {
                            size: '70%',
                            labels: {
                                show: true,
                                name: { color: '#8F96A3', fontSize: '12px' },
                                value: { color: '#EAECEF', fontSize: '16px', fontWeight: 700 },
                                total: {
                                    show: true,
                                    label: 'Holders',
                                    color: '#8F96A3',
                                    formatter: () => '1.4K'
                                }
                            }
                        }
                    }
                }
            };

            if (holderChartInstance.current) holderChartInstance.current.destroy();
            holderChartInstance.current = new ApexCharts(holderChartRef.current, options);
            holderChartInstance.current.render();
        }
        return () => { if (holderChartInstance.current) holderChartInstance.current.destroy(); };
    }, []);

    return (
        <div className="flex flex-col gap-6 animate-fade-in pb-10">
            {/* 1. Header Navigation */}
            <button onClick={onBack} className="flex items-center gap-2 text-text-medium hover:text-text-light w-fit transition-colors font-medium">
                <ArrowLeft size={18} /> Back to Market
            </button>

            {/* 2. Top Section (Improved Layout & Adjusted Sizes) */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
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

                    {/* Right: Price & Key Stats (Adjusted Sizes) */}
                    <div className="flex flex-col items-start md:items-end justify-center">
                        <div className="flex items-baseline gap-3">
                            <div className="text-3xl md:text-4xl font-extrabold text-text-light tracking-tight">{tokenPrice}</div>
                            <div className={`text-base md:text-lg font-bold px-2 py-0.5 rounded ${isPositive ? 'text-primary-green bg-primary-green/10' : 'text-primary-red bg-primary-red/10'}`}>
                                {tokenChange}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-6 mt-4 text-right">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold text-text-medium uppercase tracking-wider">Market Cap</span>
                                <span className="text-sm font-bold text-text-light">$410.2B</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold text-text-medium uppercase tracking-wider">Liquidity</span>
                                <span className="text-sm font-bold text-text-light">$482.6M</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold text-text-medium uppercase tracking-wider">Volume (24h)</span>
                                <span className="text-sm font-bold text-text-light">$670M</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                
                {/* Left Column */}
                <div className="flex flex-col gap-6">
                    {/* Chart Section */}
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

                    {/* Main Token Stats Section (Updated) */}
                    <div>
                        <h3 className="text-lg font-bold mb-4 text-text-light">Token Stats</h3>
                        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {[
                                { l: 'Txns (24h)', v: '38,214', c: 'text-text-light' },
                                { l: 'Wallets', v: '12,940', c: 'text-text-light' },
                                { l: 'Buy Vol', v: '$670M', c: 'text-primary-green' },
                                { l: 'Sell Vol', v: '$510M', c: 'text-primary-red' },
                                { l: 'Net Vol', v: '+$160M', c: 'text-primary-green' },
                                { l: 'Liq Pools', v: '128', c: 'text-text-light' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-card border border-border rounded-xl p-4 hover:border-text-medium transition-colors flex flex-col justify-center">
                                    <div className="text-[10px] uppercase font-bold text-text-medium mb-1 tracking-wide truncate">{stat.l}</div>
                                    <div className={`text-sm md:text-lg font-bold ${stat.c}`}>{stat.v}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Token Performance (Updated) */}
                    <div>
                        <h3 className="text-lg font-bold mb-4 text-text-light">Performance</h3>
                        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {[
                                { label: '30M', val: '-0.45%', pos: false },
                                { label: '1H', val: '-16.08%', pos: false },
                                { label: '6H', val: '-57.31%', pos: false },
                                { label: '24H', val: '+22.35%', pos: true },
                                { label: '1W', val: '+12.40%', pos: true },
                                { label: '1M', val: '+145.2%', pos: true },
                            ].map((item, i) => (
                                <div key={i} className="bg-card border border-border rounded-xl p-4 hover:border-text-medium transition-colors flex flex-col justify-center">
                                    <div className="text-[10px] uppercase font-bold text-text-medium mb-1 tracking-wide truncate">{item.label}</div>
                                    <div className={`text-sm md:text-lg font-bold ${item.pos ? 'text-primary-green' : 'text-primary-red'}`}>
                                        {item.val}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* On-Chain Activity (Updated: Removed rectangle, added See More) */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h3 className="text-lg font-bold mb-5 text-text-light">On-Chain Activity</h3>
                        <div className="flex flex-col">
                            {[
                                { type: 'Liquidity Added', val: '+$12.4M', desc: 'added to Uniswap V3', time: '2h ago', color: 'text-primary-green' },
                                { type: 'Large Transaction', val: '3,200 ETH', desc: 'transferred from 0x9f...32a', time: '4h ago', color: 'text-primary-blue' },
                                { type: 'Liquidity Removed', val: '-$3.1M', desc: 'withdrawn from SushiSwap', time: '6h ago', color: 'text-primary-red' },
                                { type: 'Transaction Spike', val: 'Surge', desc: 'in transactions detected', time: '8h ago', color: 'text-primary-purple' },
                            ].map((item, i) => (
                                <div key={i} className={`flex items-center justify-between py-4 border-b border-border/50 last:border-0 hover:bg-card-hover/20 transition-colors`}>
                                    <div>
                                        <div className={`font-bold text-sm ${item.color} mb-0.5`}>{item.type}</div>
                                        <div className="text-xs text-text-medium"><span className="font-bold text-text-light">{item.val}</span> {item.desc}</div>
                                    </div>
                                    <div className="text-xs text-text-dark font-mono font-medium">{item.time}</div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-4 py-2.5 text-xs font-bold text-text-medium border border-dashed border-border rounded-lg hover:text-text-light hover:border-text-light hover:bg-card-hover transition-all uppercase tracking-wide">
                            See More Activity
                        </button>
                    </div>

                    {/* Wallet Interactions Table (Updated: Only Buy/Sell, spacing, fonts) */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h3 className="text-lg font-bold mb-6 text-text-light">Wallet Interactions</h3>
                        <div className="overflow-x-auto">
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
                                            <td className="py-5 text-text-medium font-medium text-xs">{row.t}</td>
                                            <td className="py-5 font-mono text-primary-blue cursor-pointer hover:underline text-xs">{row.w}</td>
                                            <td className="py-5 text-right pr-2">
                                                <div className="flex gap-2 justify-end">
                                                    <button className="px-3 py-1.5 bg-transparent border border-border text-text-medium text-[10px] font-bold rounded hover:bg-card-hover hover:text-text-light transition-all uppercase">View</button>
                                                    <button className="px-3 py-1.5 bg-primary-green/10 border border-primary-green/30 text-primary-green text-[10px] font-bold rounded hover:bg-primary-green hover:text-main transition-all uppercase">Track</button>
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

                {/* Right Column: Sidebar Info */}
                <div className="flex flex-col gap-6">
                    
                    {/* Security Score */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-sm text-text-medium uppercase tracking-wide">Risk Score</h3>
                            <div className="bg-primary-green/10 text-primary-green p-1.5 rounded-lg"><ShieldCheck size={18} /></div>
                        </div>
                        <div className="flex items-end gap-2 mb-3">
                            <span className="text-4xl font-extrabold text-primary-green leading-none">95</span>
                            <span className="text-lg font-bold text-text-medium mb-1">/100</span>
                        </div>
                        <div className="w-full bg-border h-2 rounded-full overflow-hidden mb-5">
                            <div className="h-full bg-primary-green w-[95%] shadow-[0_0_10px_rgba(38,211,86,0.5)]"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs font-medium">
                            <div className="bg-main border border-border p-2.5 rounded-lg flex items-center gap-2 text-text-light">
                                <Lock size={14} className="text-primary-green" /> Mint Disabled
                            </div>
                            <div className="bg-main border border-border p-2.5 rounded-lg flex items-center gap-2 text-text-light">
                                <Activity size={14} className="text-primary-green" /> Mutable: No
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions (Replaced Token Stats) */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-border bg-card-hover/30">
                            <h3 className="font-bold text-base">Quick Actions</h3>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-3">
                            <button className="bg-card-hover hover:bg-border border border-border rounded-lg p-3 flex flex-col items-center justify-center gap-2 transition-colors group">
                                <Scan size={20} className="text-text-medium group-hover:text-primary-green transition-colors" />
                                <span className="text-xs font-bold text-text-light">Quick Scan</span>
                            </button>
                            <button className="bg-card-hover hover:bg-border border border-border rounded-lg p-3 flex flex-col items-center justify-center gap-2 transition-colors group">
                                <Zap size={20} className="text-text-medium group-hover:text-primary-yellow transition-colors" />
                                <span className="text-xs font-bold text-text-light">Smart Money</span>
                            </button>
                            <button className="bg-card-hover hover:bg-border border border-border rounded-lg p-3 flex flex-col items-center justify-center gap-2 transition-colors group">
                                <Wallet size={20} className="text-text-medium group-hover:text-primary-blue transition-colors" />
                                <span className="text-xs font-bold text-text-light">Wallet Tracking</span>
                            </button>
                            <button className="bg-card-hover hover:bg-border border border-border rounded-lg p-3 flex flex-col items-center justify-center gap-2 transition-colors group">
                                <Bell size={20} className="text-text-medium group-hover:text-primary-red transition-colors" />
                                <span className="text-xs font-bold text-text-light">Smart Alert</span>
                            </button>
                        </div>
                    </div>

                    {/* Token Holders (Updated) */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h3 className="font-bold text-sm text-text-medium uppercase tracking-wide mb-2">Token Holders</h3>
                        <div className="relative w-full h-[250px]">
                            <div ref={holderChartRef} className="w-full h-full"></div>
                            {/* Center Text for Donut */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-[-10px]">
                                {/* ApexCharts handles this via plotOptions, but custom HTML is often sharper. Left standard for now. */}
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <button className="w-full py-4 bg-gradient-to-r from-primary-green to-[#1fa845] text-main font-bold rounded-xl hover:opacity-90 transition-all shadow-lg transform active:scale-[0.98] text-sm uppercase tracking-wide">
                        Trade on Uniswap
                    </button>

                </div>
            </div>
        </div>
    );
};