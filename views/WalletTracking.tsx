
import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Copy, ExternalLink, Zap, Trash, Lock, ArrowLeft, RefreshCw, Layers } from 'lucide-react';
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

export const WalletTracking: React.FC = () => {
    const [viewMode, setViewMode] = useState<'dashboard' | 'profile'>('dashboard');
    const [selectedWallet, setSelectedWallet] = useState<WalletData | null>(null);
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [walletType, setWalletType] = useState('Smart Money');
    const [chain, setChain] = useState('All Chains');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Router Data State
    const [loading, setLoading] = useState(false);
    const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);

    // Pagination States
    const [visibleCount, setVisibleCount] = useState(8);
    
    // Refs
    const netWorthChartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<any>(null);
    const buttonRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    const toggleFilter = (name: string) => setActiveFilter(activeFilter === name ? null : name);
    
    const openWallet = (w: WalletData) => { 
        setSelectedWallet(w); 
        setViewMode('profile'); 
    };

    const handleTrack = () => {
        if (!searchQuery.trim()) return;
        const searchedWallet: WalletData = {
            id: Date.now(),
            addr: searchQuery,
            tag: 'Unknown',
            bal: 'Loading...',
            pnl: '0%',
            win: '0%',
            tokens: 0,
            time: 'Just now',
            type: 'smart'
        };
        openWallet(searchedWallet);
        setSearchQuery('');
    };

    // Calculate fixed position styles for dropdowns
    const getDropdownStyle = (key: string) => {
        const button = buttonRefs.current[key];
        if (!button) return {};
        const rect = button.getBoundingClientRect();
        return {
            position: 'fixed' as const,
            top: `${rect.bottom + 8}px`,
            left: `${rect.left}px`,
            zIndex: 9999,
            minWidth: `${rect.width}px`
        };
    };

    // Close filters on click outside or scroll
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeFilter) {
                const target = event.target as Element;
                if (!target.closest('.filter-wrapper') && !target.closest('.filter-popup')) {
                    setActiveFilter(null);
                }
            }
        };

        const handleScroll = () => {
            if (activeFilter) setActiveFilter(null);
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [activeFilter]);

    // FETCH DATA USING ROUTER WHEN ENTERING PROFILE OR CHANGING CHAIN
    useEffect(() => {
        const fetchData = async () => {
            if (viewMode === 'profile' && selectedWallet) {
                setLoading(true);
                try {
                    const targetChain = chain === 'All Chains' ? 'Ethereum' : chain;
                    const data = await ChainRouter.fetchPortfolio(targetChain, selectedWallet.addr);
                    setPortfolioData(data);
                } catch (e) {
                    console.error("Failed to fetch wallet data", e);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchData();
    }, [viewMode, selectedWallet, chain]); 

    // Chart Effect for Profile View
    useEffect(() => {
        if (viewMode === 'profile' && netWorthChartRef.current && typeof ApexCharts !== 'undefined' && !loading) {
            const options = {
                series: [{
                    name: 'Net Worth',
                    data: [4.2, 4.3, 4.1, 4.8, 5.2, 5.0, 5.5, 6.2, 5.8, 7.1, 8.2]
                }],
                chart: {
                    type: 'area',
                    height: 280,
                    background: 'transparent',
                    toolbar: { show: false },
                    zoom: { enabled: false }
                },
                colors: ['#26D356'],
                fill: {
                    type: 'gradient',
                    gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.4,
                        opacityTo: 0.05,
                        stops: [0, 100]
                    }
                },
                stroke: { curve: 'smooth', width: 2 },
                dataLabels: { enabled: false },
                xaxis: {
                    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
                    labels: { style: { colors: '#8F96A3', fontFamily: 'Inter', fontSize: '11px' } },
                    axisBorder: { show: false },
                    axisTicks: { show: false }
                },
                yaxis: {
                    labels: {
                        style: { colors: '#8F96A3', fontFamily: 'Inter', fontSize: '11px' },
                        formatter: (val: number) => `$${val}M`
                    }
                },
                grid: { borderColor: '#2A2E33', strokeDashArray: 4 },
                theme: { mode: 'dark' },
                tooltip: { theme: 'dark' }
            };
            
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
            chartInstance.current = new ApexCharts(netWorthChartRef.current, options);
            chartInstance.current.render();
        }
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [viewMode, loading]);

    // Mock Data for Dashboard
    const wallets: WalletData[] = [
        { id: 1, addr: '0x7180...e68', tag: 'Whale', bal: '$4.53M', pnl: '+25.1%', win: '59%', tokens: 12, time: '1m ago', type: 'whale' },
        { id: 2, addr: '0x02f7...94e6', tag: 'Smart Money', bal: '$4.46M', pnl: '+8.8%', win: '59%', tokens: 23, time: '5m ago', type: 'smart' },
        { id: 3, addr: '0x33b1...e8fh', tag: 'Smart Money', bal: '$2.85M', pnl: '+57%', win: '55%', tokens: 5, time: '10m ago', type: 'smart' },
        { id: 4, addr: '0x2381...294b', tag: 'Sniper', bal: '$1.83M', pnl: '+0.1%', win: '61%', tokens: 291, time: '10h ago', type: 'sniper' },
        { id: 5, addr: '0x8Sc1...mvz', tag: 'Early Buyer', bal: '$3.52M', pnl: '+120%', win: '70%', tokens: 4, time: '1h ago', type: 'smart' },
        { id: 6, addr: '0x54Cha...205fc', tag: 'Sniper', bal: '$13.6M', pnl: '-2.4%', win: '45%', tokens: 150, time: '3d ago', type: 'sniper' },
        { id: 7, addr: '0x99a2...k12z', tag: 'Whale', bal: '$8.2M', pnl: '+12.4%', win: '62%', tokens: 8, time: '4h ago', type: 'whale' },
        { id: 8, addr: '0x11b3...x99p', tag: 'Smart Money', bal: '$1.1M', pnl: '+45.2%', win: '78%', tokens: 15, time: '6h ago', type: 'smart' },
    ];

    if (viewMode === 'dashboard') {
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
                        <button 
                            className="bg-primary-green text-main px-8 rounded-lg font-bold hover:bg-primary-green-darker transition-colors whitespace-nowrap text-sm shadow-md flex items-center justify-center"
                            onClick={handleTrack}
                        >
                            Track
                        </button>
                    </div>

                    <div className="flex flex-col gap-2 mb-6">
                        <div className="flex gap-3 items-center overflow-x-auto custom-scrollbar pb-3 px-1">
                            <div className="filter-wrapper relative flex-shrink-0">
                                <div 
                                    className={`filter-pill ${activeFilter === 'chain' ? 'active' : ''}`} 
                                    onClick={() => toggleFilter('chain')}
                                    ref={el => (buttonRefs.current['chain'] = el)}
                                >
                                    {chain} <ChevronDown size={14} />
                                </div>
                                {activeFilter === 'chain' && (
                                    <div className="filter-popup" style={getDropdownStyle('chain')}>
                                        {['All Chains', 'Solana', 'Ethereum', 'BSC', 'Avalanche', 'Base', 'Polygon'].map(c => (
                                            <div key={c} className="filter-list-item" onClick={() => {setChain(c); setActiveFilter(null)}}>{c}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="filter-wrapper relative flex-shrink-0">
                                <div 
                                    className={`filter-pill ${activeFilter === 'type' ? 'active' : ''}`} 
                                    onClick={() => toggleFilter('type')}
                                    ref={el => (buttonRefs.current['type'] = el)}
                                >
                                    {walletType} <ChevronDown size={14} />
                                </div>
                                {activeFilter === 'type' && (
                                    <div className="filter-popup" style={getDropdownStyle('type')}>
                                        {['All Types', 'Smart Money', 'Whale', 'Sniper'].map(t => (
                                            <div key={t} className="filter-list-item" onClick={() => {setWalletType(t); setActiveFilter(null)}}>{t}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {wallets.slice(0, visibleCount).map(w => (
                            <div key={w.id} className="bg-card border border-border rounded-xl p-5 hover:border-text-dark transition-colors flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 bg-[#2A2E33] rounded-full"></div>
                                        <div className="font-mono text-sm font-semibold">{w.addr}</div>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                        w.type === 'whale' ? 'bg-[#2F80ED]/10 text-[#2F80ED]' : 
                                        w.type === 'smart' ? 'bg-primary-green/10 text-primary-green' : 
                                        'bg-primary-red/10 text-primary-red'
                                    }`}>{w.tag}</span>
                                </div>
                                <div className="mb-4">
                                    <div className="text-[10px] text-text-medium mb-1 font-medium uppercase tracking-wide">Total Portfolio Value</div>
                                    <div className="text-2xl font-bold">{w.bal}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-5">
                                    <div><div className="text-[10px] text-text-dark mb-0.5 font-medium">30d PnL %</div><div className={`font-bold text-sm ${w.pnl.includes('+') ? 'text-primary-green' : ''}`}>{w.pnl}</div></div>
                                    <div><div className="text-[10px] text-text-dark mb-0.5 font-medium">Win Rate %</div><div className="font-bold text-sm">{w.win}</div></div>
                                    <div><div className="text-[10px] text-text-dark mb-0.5 font-medium">% Tokens Held</div><div className="font-bold text-sm">45% Top 3</div></div>
                                    <div><div className="text-[10px] text-text-dark mb-0.5 font-medium">Last Activity</div><div className="font-medium text-sm">{w.time}</div></div>
                                </div>
                                <div className="flex gap-3 mt-auto">
                                    <button className="flex-1 py-2 border border-border rounded-lg text-[10px] font-bold hover:bg-card-hover hover:text-text-light transition-all uppercase tracking-wide" onClick={() => openWallet(w)}>View Wallet</button>
                                    <button className="flex-1 py-2 border border-border rounded-lg text-[10px] font-bold hover:bg-card-hover hover:text-text-light transition-all uppercase tracking-wide">Set Alerts</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (viewMode === 'profile') {
        return (
            <div className="flex flex-col gap-6 animate-fade-in">
                <div 
                    className="flex items-center gap-2 text-text-medium hover:text-text-light cursor-pointer mb-2 w-fit transition-colors font-medium text-sm"
                    onClick={() => setViewMode('dashboard')}
                >
                    <ArrowLeft size={18} /> Back to Dashboard
                </div>
                
                <div className="bg-main border border-border rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
                    <div>
                        <h2 className="text-xl font-bold mb-1">Wallet Tracking Dashboard</h2>
                        <p className="text-text-medium text-sm">Monitor on-chain activity of any wallet address</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                         <div className="bg-card border border-border rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-text-medium">
                            <span className="text-[10px] uppercase font-bold tracking-wide">Query Chain:</span>
                            <select 
                                value={chain} 
                                onChange={(e) => setChain(e.target.value)}
                                className="bg-transparent border-none outline-none font-bold text-text-light cursor-pointer"
                            >
                                {['Ethereum', 'Solana', 'BSC', 'Avalanche', 'Base', 'Polygon'].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                         </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px]">
                        <RefreshCw className="animate-spin text-primary-green mb-4" size={32} />
                        <div className="text-lg font-bold">Querying Data...</div>
                        <div className="text-sm text-text-medium">Fetching real-time on-chain portfolio balance</div>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex items-center gap-4">
                                <div className="text-xl md:text-3xl font-bold font-mono truncate max-w-[200px] md:max-w-none">{selectedWallet?.addr}</div>
                                <span className={`text-xs px-3 py-1 rounded font-bold uppercase ${
                                    selectedWallet?.type === 'whale' ? 'bg-[#2F80ED]/10 text-[#2F80ED] border border-[#2F80ED]/30' : 
                                    selectedWallet?.type === 'smart' ? 'bg-primary-green/10 text-primary-green border border-primary-green/30' : 
                                    'bg-primary-red/10 text-primary-red border border-primary-red/30'
                                }`}>{selectedWallet?.tag}</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-card border border-border rounded-xl p-5 text-center">
                                <h5 className="text-text-medium text-[10px] font-bold uppercase tracking-wide mb-1">Total Net Worth</h5>
                                <p className="text-text-light font-bold text-lg">{portfolioData?.netWorth || selectedWallet?.bal}</p>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-5 text-center">
                                <h5 className="text-text-medium text-[10px] font-bold uppercase tracking-wide mb-1">Active Assets</h5>
                                <p className="text-text-light font-bold text-lg">{portfolioData?.assets.length || 0}</p>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-5 text-center">
                                <h5 className="text-text-medium text-[10px] font-bold uppercase tracking-wide mb-1">Profitable Trades</h5>
                                <p className="text-primary-green font-bold text-lg">142</p>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-5 text-center">
                                <h5 className="text-text-medium text-[10px] font-bold uppercase tracking-wide mb-1">Avg Hold Time</h5>
                                <p className="text-text-light font-bold text-lg">4.2 Days</p>
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-xl p-6">
                            <h3 className="card-title text-base">Net Worth Performance</h3>
                            <div ref={netWorthChartRef} className="w-full min-h-[260px]"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            <div className="bg-card border border-border rounded-xl p-6 flex flex-col">
                                <h3 className="card-title text-base">Portfolio Breakdown</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead>
                                            <tr className="border-b border-border text-text-dark text-[10px] font-bold uppercase tracking-wide">
                                                <th className="pb-3 font-bold">Asset</th>
                                                <th className="pb-3 font-bold">Value</th>
                                                <th className="pb-3 font-bold">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {portfolioData?.assets.map((p, i) => (
                                                <tr key={i} className="border-b border-border last:border-0 hover:bg-card-hover/50 transition-colors">
                                                    <td className="py-3 font-bold flex items-center gap-2">
                                                        <img src={p.logo} className="w-6 h-6 rounded-full" onError={(e) => e.currentTarget.src='https://via.placeholder.com/24'} /> {p.symbol}
                                                    </td>
                                                    <td className="py-3">{p.value}</td>
                                                    <td className="py-3 text-text-medium font-medium">{p.balance}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div className="bg-card border border-border rounded-xl p-6 flex flex-col">
                                <h3 className="card-title text-base">Recent Activity</h3>
                                <div className="flex flex-col">
                                    {portfolioData?.recentActivity.map((act, i) => (
                                        <div key={i} className="flex gap-4 py-4 border-b border-border last:border-0">
                                            <div className="w-10 h-10 bg-main rounded-full flex items-center justify-center text-primary-green shrink-0"><Zap size={20} /></div>
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1">
                                                    <span className="font-bold text-primary-green text-sm">{act.type}</span>
                                                    <span className="text-[10px] text-text-dark font-medium">{act.time}</span>
                                                </div>
                                                <div className="text-xs text-text-medium font-medium">{act.desc}</div>
                                                <div className="text-[10px] text-primary-blue mt-1 font-mono">{act.hash}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-card border border-border rounded-xl p-6 flex flex-col">
                                <h3 className="card-title text-base">Recent Transactions</h3>
                                <div className="flex items-center justify-center h-full text-text-dark text-sm italic">
                                    No data available
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return null;
};
