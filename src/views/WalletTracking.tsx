
import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Copy, ExternalLink, Zap, Trash, Lock, ArrowLeft, RefreshCw, Layers, ArrowUpRight, ArrowDownLeft, Repeat, CheckCircle, Wallet } from 'lucide-react';
import { ChainRouter, PortfolioData } from '../services/ChainRouter';

// Declare ApexCharts
declare var ApexCharts: any;

interface WalletData {
    id: number;
    addr: string;
    tag: string;
    bal: string;
    pnl: string;
    win: string;
    tokens: number;
    time: string;
    type: string;
}

interface WalletTrackingProps {
    initialWallet?: WalletData | string | null;
    onSelectWallet: (wallet: WalletData) => void;
    onBack: () => void;
}

// Helpers
const isSolanaAddress = (addr: string) => {
    // Basic check: Solana addresses are Base58 and roughly 32-44 chars, don't start with 0x
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
};

export const WalletTracking: React.FC<WalletTrackingProps> = ({ initialWallet, onSelectWallet, onBack }) => {
    // Resolve initial prop
    const effectiveWallet: WalletData | null = typeof initialWallet === 'string' 
        ? { id: 0, addr: initialWallet, tag: 'Unknown', bal: 'Loading...', pnl: '0%', win: '0%', tokens: 0, time: '', type: 'smart' }
        : (initialWallet as WalletData) || null;

    const viewMode = effectiveWallet ? 'profile' : 'dashboard';
    
    // State
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [walletType, setWalletType] = useState('Smart Money');
    const [chain, setChain] = useState('Ethereum'); // Default
    const [searchQuery, setSearchQuery] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
    const [visibleCount, setVisibleCount] = useState(8);
    
    // Chart
    const netWorthChartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<any>(null);
    const buttonRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // --- AUTO-DETECT CHAIN ON MOUNT ---
    useEffect(() => {
        if (effectiveWallet?.addr) {
            if (isSolanaAddress(effectiveWallet.addr)) {
                setChain('Solana');
            } else {
                setChain('Ethereum'); // Default EVM
            }
        }
    }, [effectiveWallet]);

    const toggleFilter = (name: string) => setActiveFilter(activeFilter === name ? null : name);
    
    // Search Logic
    const handleTrack = () => {
        if (!searchQuery.trim()) return;
        
        // Auto-detect chain for new searches
        const targetChain = isSolanaAddress(searchQuery) ? 'Solana' : 'Ethereum';
        
        const searchedWallet: WalletData = {
            id: Date.now(),
            addr: searchQuery,
            tag: 'New Track',
            bal: '...',
            pnl: '0%',
            win: '0%',
            tokens: 0,
            time: 'Just now',
            type: 'smart'
        };
        
        // Force chain state update before navigation if possible, or let the Effect handle it
        setChain(targetChain); 
        onSelectWallet(searchedWallet);
        setSearchQuery('');
    };

    // Styles & Listeners
    const getDropdownStyle = (key: string) => {
        const button = buttonRefs.current[key];
        if (!button) return {};
        const rect = button.getBoundingClientRect();
        return { position: 'fixed' as const, top: `${rect.bottom + 8}px`, left: `${rect.left}px`, zIndex: 9999, minWidth: `${rect.width}px` };
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeFilter) {
                const target = event.target as Element;
                if (!target.closest('.filter-wrapper') && !target.closest('.filter-popup')) setActiveFilter(null);
            }
        };
        const handleScroll = () => { if (activeFilter) setActiveFilter(null); };
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        return () => { document.removeEventListener('mousedown', handleClickOutside); window.removeEventListener('scroll', handleScroll, true); };
    }, [activeFilter]);

    // --- FETCH DATA ---
    useEffect(() => {
        const fetchData = async () => {
            if (viewMode === 'profile' && effectiveWallet) {
                setLoading(true);
                try {
                    const data = await ChainRouter.fetchPortfolio(chain, effectiveWallet.addr);
                    setPortfolioData(data);
                } catch (e) {
                    console.error("Failed to fetch wallet data", e);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [viewMode, effectiveWallet, chain]); 

    // --- CHART (Simulated History based on Real Current Value) ---
    useEffect(() => {
        if (viewMode === 'profile' && netWorthChartRef.current && typeof ApexCharts !== 'undefined' && !loading && portfolioData) {
            
            // Generate a plausible chart ending at rawNetWorth
            const current = portfolioData.rawNetWorth || 0;
            const points = 14; 
            const data: number[] = [];
            const categories: string[] = [];
            
            // Walk backwards from current value
            let val = current;
            for (let i = 0; i < points; i++) {
                data.unshift(parseFloat(val.toFixed(2)));
                categories.unshift(`${points - i}d ago`);
                // Random drift 5%
                const change = val * (Math.random() * 0.1 - 0.05); 
                val -= change;
                if(val < 0) val = 0;
            }

            // Correct last point to exact match
            data[points-1] = parseFloat(current.toFixed(2));
            categories[points-1] = 'Today';

            const options = {
                series: [{ name: 'Net Worth', data: data }],
                chart: { type: 'area', height: 280, background: 'transparent', toolbar: { show: false }, zoom: { enabled: false } },
                colors: ['#26D356'],
                fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
                stroke: { curve: 'smooth', width: 2 },
                dataLabels: { enabled: false },
                xaxis: { 
                    categories: categories, 
                    labels: { style: { colors: '#8F96A3', fontFamily: 'Inter', fontSize: '11px' } }, 
                    axisBorder: { show: false }, 
                    axisTicks: { show: false } 
                },
                yaxis: { 
                    labels: { 
                        style: { colors: '#8F96A3', fontFamily: 'Inter', fontSize: '11px' }, 
                        formatter: (val: number) => {
                            if(val >= 1000000) return `$${(val/1000000).toFixed(1)}M`;
                            if(val >= 1000) return `$${(val/1000).toFixed(1)}k`;
                            return `$${val.toFixed(0)}`;
                        }
                    } 
                },
                grid: { borderColor: '#2A2E33', strokeDashArray: 4 },
                theme: { mode: 'dark' },
                tooltip: { theme: 'dark', y: { formatter: (val: number) => `$${val.toLocaleString()}` } }
            };
            
            if (chartInstance.current) chartInstance.current.destroy();
            chartInstance.current = new ApexCharts(netWorthChartRef.current, options);
            chartInstance.current.render();
        }
        return () => { if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; } };
    }, [viewMode, loading, portfolioData]);

    // Dashboard View
    if (viewMode === 'dashboard') {
        // Mock data logic... (Preserved from previous, but shortened for brevity as focus is Profile)
        const mockWallets: WalletData[] = [
            { id: 1, addr: '0x7180...e68', tag: 'Whale', bal: '$4.53M', pnl: '+25.1%', win: '59%', tokens: 12, time: '1m ago', type: 'whale' },
            { id: 2, addr: '0x02f7...94e6', tag: 'Smart Money', bal: '$4.46M', pnl: '+8.8%', win: '59%', tokens: 23, time: '5m ago', type: 'smart' },
            { id: 3, addr: '0x33b1...e8fh', tag: 'Smart Money', bal: '$2.85M', pnl: '+57%', win: '55%', tokens: 5, time: '10m ago', type: 'smart' },
            { id: 4, addr: '0x2381...294b', tag: 'Sniper', bal: '$1.83M', pnl: '+0.1%', win: '61%', tokens: 291, time: '10h ago', type: 'sniper' },
        ];

        return (
            <div className="flex flex-col gap-6 h-full">
                <div className="flex justify-between items-center mb-1">
                    <h1 className="text-2xl font-bold">Wallet Tracking</h1>
                </div>

                <div className="w-full min-w-0">
                    <div className="flex w-full gap-3 mb-6">
                        <div className="flex-1 bg-[#111315] border border-border rounded-lg flex items-center px-4 py-3 shadow-sm transition-all focus-within:border-primary-green/50">
                            <Search size={18} className="text-text-medium mr-2" />
                            <input 
                                type="text" 
                                placeholder="Search wallet address (e.g. 0x... or specific Solana address)" 
                                className="bg-transparent border-none text-text-light outline-none w-full font-mono text-sm" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                            />
                        </div>
                        <button className="bg-primary-green text-main px-8 rounded-lg font-bold hover:bg-primary-green-darker transition-colors whitespace-nowrap text-sm shadow-md flex items-center justify-center" onClick={handleTrack}>
                            Track
                        </button>
                    </div>

                    <div className="flex flex-col gap-2 mb-6">
                        <div className="flex gap-3 items-center overflow-x-auto custom-scrollbar pb-3 px-1">
                            <div className="filter-wrapper relative flex-shrink-0">
                                <div className={`filter-pill ${activeFilter === 'chain' ? 'active' : ''}`} onClick={() => toggleFilter('chain')} ref={el => (buttonRefs.current['chain'] = el)}>
                                    {chain} <ChevronDown size={14} />
                                </div>
                                {activeFilter === 'chain' && (
                                    <div className="filter-popup" style={getDropdownStyle('chain')}>
                                        {['All Chains', 'Solana', 'Ethereum', 'BSC', 'Base'].map(c => (
                                            <div key={c} className="filter-list-item" onClick={() => {setChain(c); setActiveFilter(null)}}>{c}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {mockWallets.map(w => (
                            <div key={w.id} className="bg-card border border-border rounded-xl p-5 hover:border-text-dark transition-colors flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 bg-[#2A2E33] rounded-full"></div>
                                        <div className="font-mono text-sm font-semibold">{w.addr}</div>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${w.type === 'whale' ? 'bg-[#2F80ED]/10 text-[#2F80ED]' : 'bg-primary-green/10 text-primary-green'}`}>{w.tag}</span>
                                </div>
                                <div className="mb-4">
                                    <div className="text-[10px] text-text-medium mb-1 font-medium uppercase tracking-wide">Total Portfolio Value</div>
                                    <div className="text-2xl font-bold">{w.bal}</div>
                                </div>
                                <button className="flex-1 py-2 border border-border rounded-lg text-[10px] font-bold hover:bg-card-hover hover:text-text-light transition-all uppercase tracking-wide" onClick={() => onSelectWallet(w)}>View Wallet</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Profile View
    return (
        <div className="flex flex-col gap-6 animate-fade-in pb-10">
            <div className="flex items-center gap-2 text-text-medium hover:text-text-light cursor-pointer mb-2 w-fit transition-colors font-medium text-sm" onClick={onBack}>
                <ArrowLeft size={18} /> Back to Dashboard
            </div>
            
            <div className="bg-main border border-border rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
                <div>
                    <h2 className="text-xl font-bold mb-1">Wallet Tracking Dashboard</h2>
                    <p className="text-text-medium text-sm">Monitor on-chain activity of any wallet address</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-card border border-border rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-text-medium">
                        <span className="text-[10px] uppercase font-bold tracking-wide">Network:</span>
                        <select value={chain} onChange={(e) => setChain(e.target.value)} className="bg-transparent border-none outline-none font-bold text-text-light cursor-pointer">
                            {['Ethereum', 'Solana', 'BSC', 'Avalanche', 'Base', 'Polygon'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <RefreshCw className="animate-spin text-primary-green mb-4" size={32} />
                    <div className="text-lg font-bold">Scanning Blockchain...</div>
                    <div className="text-sm text-text-medium">Fetching real-time assets from {chain}</div>
                </div>
            ) : (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4 overflow-hidden">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-black rounded-full flex items-center justify-center text-xl font-bold border border-border shadow-lg">
                                {chain[0]}
                            </div>
                            <div className="min-w-0">
                                <div className="text-xl md:text-2xl font-bold font-mono truncate text-text-light">{effectiveWallet?.addr}</div>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-xs px-2 py-0.5 rounded font-bold uppercase bg-primary-green/10 text-primary-green border border-primary-green/30">Active</span>
                                    <span className="text-xs px-2 py-0.5 rounded font-bold uppercase bg-card border border-border text-text-medium">{chain}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-card border border-border rounded-xl p-5 text-center">
                            <h5 className="text-text-medium text-[10px] font-bold uppercase tracking-wide mb-1">Total Net Worth</h5>
                            <p className="text-text-light font-bold text-lg">{portfolioData?.netWorth || '$0.00'}</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-5 text-center">
                            <h5 className="text-text-medium text-[10px] font-bold uppercase tracking-wide mb-1">Active Assets</h5>
                            <p className="text-text-light font-bold text-lg">{portfolioData?.assets.length || 0}</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-5 text-center">
                            <h5 className="text-text-medium text-[10px] font-bold uppercase tracking-wide mb-1">Transactions (24h)</h5>
                            <p className="text-primary-green font-bold text-lg">{portfolioData?.recentActivity.length || 0}</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-5 text-center">
                            <h5 className="text-text-medium text-[10px] font-bold uppercase tracking-wide mb-1">Top Asset</h5>
                            <p className="text-text-light font-bold text-lg truncate px-2">{portfolioData?.assets[0]?.symbol || 'None'}</p>
                        </div>
                    </div>

                    {/* Chart Section */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h3 className="card-title text-base mb-4">Estimated Performance (30D)</h3>
                        <div ref={netWorthChartRef} className="w-full min-h-[260px]"></div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
                        {/* Assets Table */}
                        <div className="bg-card border border-border rounded-xl p-6 flex flex-col h-[500px]">
                            <h3 className="card-title text-base flex items-center gap-2"><Wallet size={18} /> Asset Holdings</h3>
                            <div className="overflow-y-auto custom-scrollbar flex-1 -mr-2 pr-2">
                                <table className="w-full text-sm text-left">
                                    <thead className="sticky top-0 bg-card z-10 shadow-sm">
                                        <tr className="text-text-dark text-[10px] font-bold uppercase tracking-wide border-b border-border">
                                            <th className="pb-3 pl-1">Asset</th>
                                            <th className="pb-3 text-right">Price</th>
                                            <th className="pb-3 text-right">Balance</th>
                                            <th className="pb-3 text-right pr-1">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {portfolioData?.assets.length === 0 ? (
                                            <tr><td colSpan={4} className="py-8 text-center text-text-medium italic">No assets found on {chain}</td></tr>
                                        ) : (
                                            portfolioData?.assets.map((p, i) => (
                                                <tr key={i} className="border-b border-border last:border-0 hover:bg-card-hover/50 transition-colors">
                                                    <td className="py-3 pl-1 font-bold flex items-center gap-2">
                                                        <img src={p.logo} className="w-6 h-6 rounded-full bg-main" onError={(e) => e.currentTarget.src='https://via.placeholder.com/24'} /> 
                                                        {p.symbol}
                                                    </td>
                                                    <td className="py-3 text-right text-text-medium">{p.price}</td>
                                                    <td className="py-3 text-right text-text-medium">{p.balance.split(' ')[0]}</td>
                                                    <td className="py-3 text-right font-mono font-bold text-text-light pr-1">{p.value}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        {/* Activity Feed */}
                        <div className="bg-card border border-border rounded-xl p-6 flex flex-col h-[500px]">
                            <h3 className="card-title text-base flex items-center gap-2"><Zap size={18} /> Recent Activity</h3>
                            <div className="overflow-y-auto custom-scrollbar flex-1 -mr-2 pr-2 flex flex-col">
                                {portfolioData?.recentActivity.length === 0 ? (
                                    <div className="py-8 text-center text-text-medium italic">No recent transactions</div>
                                ) : (
                                    portfolioData?.recentActivity.map((act, i) => (
                                        <div key={i} className="flex gap-4 py-3 border-b border-border last:border-0 hover:bg-card-hover/30 transition-colors px-2 rounded-lg">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${act.type === 'Buy' ? 'bg-primary-green/10 text-primary-green' : 'bg-primary-red/10 text-primary-red'}`}>
                                                {act.type === 'Buy' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <span className={`font-bold text-sm ${act.type === 'Buy' ? 'text-primary-green' : 'text-primary-red'}`}>
                                                        {act.type} {act.asset}
                                                    </span>
                                                    <span className="text-[10px] text-text-dark font-medium whitespace-nowrap">{act.time}</span>
                                                </div>
                                                <div className="text-xs text-text-medium font-medium truncate">{act.desc}</div>
                                                <div className="flex justify-between items-center mt-1.5">
                                                    <span className="text-[10px] bg-main border border-border px-1.5 py-0.5 rounded font-mono text-text-dark">{act.val} {act.asset}</span>
                                                    <a href={`https://${chain === 'Solana' ? 'solscan.io/tx' : 'etherscan.io/tx'}/${act.hash}`} target="_blank" className="text-[10px] text-primary-blue hover:underline">View Tx</a>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
