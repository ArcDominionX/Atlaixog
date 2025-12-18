import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Copy, ExternalLink, Zap, Trash, Lock, ArrowLeft } from 'lucide-react';

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
        // Create a temporary wallet object from the search query
        const searchedWallet: WalletData = {
            id: Date.now(),
            addr: searchQuery,
            tag: 'Unknown',
            bal: '$0.00',
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

    // Chart Effect for Profile View
    useEffect(() => {
        if (viewMode === 'profile' && netWorthChartRef.current && typeof ApexCharts !== 'undefined') {
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
    }, [viewMode]);

    // Mock Data
    const wallets: WalletData[] = [
        { id: 1, addr: '0x7180...e68', tag: 'Whale', bal: '$4.53M', pnl: '+25.1%', win: '59%', tokens: 12, time: '1m ago', type: 'whale' },
        { id: 2, addr: '0x02f7...94e6', tag: 'Smart Money', bal: '$4.46M', pnl: '+8.8%', win: '59%', tokens: 23, time: '5m ago', type: 'smart' },
        { id: 3, addr: '0x33b1...e8fh', tag: 'Smart Money', bal: '$2.85M', pnl: '+57%', win: '55%', tokens: 5, time: '10m ago', type: 'smart' },
        { id: 4, addr: '0x2381...294b', tag: 'Sniper', bal: '$1.83M', pnl: '+0.1%', win: '61%', tokens: 291, time: '10h ago', type: 'sniper' },
        { id: 5, addr: '0x8Sc1...mvz', tag: 'Early Buyer', bal: '$3.52M', pnl: '+120%', win: '70%', tokens: 4, time: '1h ago', type: 'smart' },
        { id: 6, addr: '0x54Cha...205fc', tag: 'Sniper', bal: '$13.6M', pnl: '-2.4%', win: '45%', tokens: 150, time: '3d ago', type: 'sniper' },
        { id: 7, addr: '0x99a2...k12z', tag: 'Whale', bal: '$8.2M', pnl: '+12.4%', win: '62%', tokens: 8, time: '4h ago', type: 'whale' },
        { id: 8, addr: '0x11b3...x99p', tag: 'Smart Money', bal: '$1.1M', pnl: '+45.2%', win: '78%', tokens: 15, time: '6h ago', type: 'smart' },
        { id: 9, addr: '0x44f2...a99z', tag: 'Whale', bal: '$2.2M', pnl: '+15.2%', win: '65%', tokens: 10, time: '8h ago', type: 'whale' },
        { id: 10, addr: '0xAA12...bb34', tag: 'Sniper', bal: '$500K', pnl: '+300%', win: '40%', tokens: 50, time: '9h ago', type: 'sniper' },
    ];

    const globalActivity = [
        { wallet: '0x8a...92f', action: 'Buy', token: 'ETH', amount: '$1,200,450', time: '21m ago', type: 'buy', coinIcon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
        { wallet: '0x71...e68', action: 'Sell', token: 'USDT', amount: '$250,000', time: '21m ago', type: 'sell', coinIcon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
        { wallet: '0x3c...22a', action: 'LP Add', token: 'SOL', amount: '$31,972', time: '21m ago', type: 'lp', coinIcon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
        { wallet: '0x5f...11b', action: 'LP Add', token: 'BTC', amount: '$260,000', time: '21m ago', type: 'lp', coinIcon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png' },
        { wallet: '0x22...aa1', action: 'Sell', token: 'USDT', amount: '$29,080', time: '21m ago', type: 'sell', coinIcon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
        { wallet: '0x19...bb3', action: 'Buy', token: 'ETH', amount: '$500,635', time: '31m ago', type: 'buy', coinIcon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
        { wallet: '0x44...cc9', action: 'Buy', token: 'PEPE', amount: '$12,400', time: '32m ago', type: 'buy', coinIcon: 'https://cryptologos.cc/logos/pepe-pepe-logo.png' },
    ];

    const portfolio = [
        { asset: 'ETH', value: '$42,015', amount: '11 ETH', img: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
        { asset: 'USDT', value: '$25,914', amount: '25,914 USDT', img: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
        { asset: 'PEPE', value: '$61,278', amount: '4B PEPE', img: 'https://cryptologos.cc/logos/pepe-pepe-logo.png' },
        { asset: 'MKR', value: '$3,233', amount: '2.1 MKR', img: 'https://cryptologos.cc/logos/maker-mkr-logo.png' }
    ];

    const recentTx = [
        { hash: '0x82...a1b', method: 'Swap', age: '10 mins', from: '0x71...e68', to: 'Uniswap V2' },
        { hash: '0x3c...99d', method: 'Approve', age: '2 hrs', from: '0x71...e68', to: 'USDT' },
        { hash: '0x1a...f44', method: 'Transfer', age: '5 hrs', from: 'Binance', to: '0x71...e68' },
        { hash: '0x99...e22', method: 'Swap', age: '1 day', from: '0x71...e68', to: '1inch' },
    ];

    if (viewMode === 'dashboard') {
        return (
            <div className="flex flex-col gap-6 h-full">
                <div className="flex justify-between items-center mb-1">
                    <h1 className="text-2xl font-bold">Wallet Tracking</h1>
                </div>

                <div className="flex flex-col xl:flex-row gap-6 items-start h-full">
                    {/* LEFT SIDE: MAIN WALLET GRID */}
                    <div className="flex-1 w-full min-w-0">
                        
                        {/* Search & Track Section (Horizontal) */}
                        <div className="flex w-full gap-3 mb-6">
                            <div className="flex-1 bg-[#111315] border border-border rounded-lg flex items-center px-4 py-3 shadow-sm transition-all focus-within:border-primary-green/50">
                                <Search size={18} className="text-text-medium mr-2" />
                                <input 
                                    type="text" 
                                    placeholder="Search wallet address..." 
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

                        {/* Filters Row */}
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
                                            <div className="filter-list-item" onClick={() => {setChain('All Chains'); setActiveFilter(null)}}>All Chains</div>
                                            <div className="filter-list-item" onClick={() => {setChain('Solana'); setActiveFilter(null)}}>Solana</div>
                                            <div className="filter-list-item" onClick={() => {setChain('Ethereum'); setActiveFilter(null)}}>Ethereum</div>
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
                                            <div className="filter-list-item" onClick={() => {setWalletType('All Types'); setActiveFilter(null)}}>All Types</div>
                                            <div className="filter-list-item" onClick={() => {setWalletType('Smart Money'); setActiveFilter(null)}}>Smart Money</div>
                                            <div className="filter-list-item" onClick={() => {setWalletType('Whale'); setActiveFilter(null)}}>Whale</div>
                                            <div className="filter-list-item" onClick={() => {setWalletType('Sniper'); setActiveFilter(null)}}>Sniper</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Responsive Wallet Grid */}
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
                        {visibleCount < wallets.length && (
                            <div className="w-full mt-6 py-3 border border-dashed border-border text-text-medium text-center rounded-xl cursor-pointer hover:bg-card-hover hover:text-text-light transition-all font-semibold text-xs" onClick={() => setVisibleCount(prev => prev + 4)}>
                                See More
                            </div>
                        )}
                    </div>

                    {/* RIGHT SIDE: GLOBAL ACTIVITY SIDEBAR */}
                    <div className="w-full xl:w-[320px] flex-shrink-0 bg-card border border-border rounded-xl p-5 sticky top-6">
                        <div className="mb-4 pb-3 border-b border-border">
                            <h3 className="text-lg font-bold text-text-light">Global Wallet Activity</h3>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
                            {['By Wallet', 'By Token', 'By Chain', 'By Action'].map(f => (
                                <div key={f} className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded border cursor-pointer transition-colors ${f === 'By Wallet' ? 'bg-card-hover border-text-light text-text-light' : 'bg-main border-border text-text-medium'}`}>{f}</div>
                            ))}
                        </div>
                        <div className="flex flex-col gap-3 max-h-[700px] overflow-y-auto pr-1">
                            {globalActivity.map((item, idx) => (
                                <div key={idx} className="bg-gradient-to-br from-[#222529] to-[#1C1F22] rounded-lg p-3 border border-border hover:border-text-medium transition-colors">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="font-mono text-[10px] text-primary-purple font-bold flex items-center gap-1.5">
                                            <div className="w-4 h-4 bg-primary-purple text-white rounded-full flex items-center justify-center text-[8px]">A</div>
                                            {item.wallet}
                                        </div>
                                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                            item.type === 'buy' ? 'bg-primary-green/10 text-primary-green' : 
                                            item.type === 'sell' ? 'bg-primary-red/10 text-primary-red' : 
                                            'bg-primary-blue/10 text-primary-blue'
                                        }`}>{item.action}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <img src={item.coinIcon} className="w-4 h-4 rounded-full" />
                                        <div className="font-bold text-sm text-text-light">{item.amount}</div>
                                    </div>
                                    <div className="flex justify-between items-center mt-2 text-[10px] text-text-dark font-medium">
                                        <div className="flex items-center gap-1"><ChevronDown size={10} /> {item.time}</div>
                                        <div className="cursor-pointer border border-border px-2 py-0.5 rounded hover:text-text-light hover:border-text-light transition-colors uppercase text-[9px] font-bold">View</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // PROFILE VIEW
    if (viewMode === 'profile') {
        return (
            <div className="flex flex-col gap-6">
                <div 
                    className="flex items-center gap-2 text-text-medium hover:text-text-light cursor-pointer mb-2 w-fit transition-colors font-medium text-sm"
                    onClick={() => setViewMode('dashboard')}
                >
                    <ArrowLeft size={18} /> Back to Dashboard
                </div>
                
                {/* Search Bar */}
                <div className="bg-main border border-border rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
                    <div>
                        <h2 className="text-xl font-bold mb-1">Wallet Tracking Dashboard</h2>
                        <p className="text-text-medium text-sm">Monitor on-chain activity of any wallet address</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="flex-1 md:w-[300px] bg-[#0A0B0D] border border-border rounded-lg flex items-center px-4 py-2.5">
                            <Search size={18} className="text-text-medium mr-2" />
                            <input type="text" placeholder="0x..." defaultValue={selectedWallet?.addr} className="bg-transparent border-none text-text-light outline-none w-full font-mono text-base" />
                        </div>
                        <button className="bg-primary-green text-main px-5 py-2.5 rounded-lg font-bold hover:bg-primary-green-darker transition-colors whitespace-nowrap text-sm">+ Track</button>
                    </div>
                </div>

                {/* Header Stats */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="text-2xl md:text-3xl font-bold font-mono">{selectedWallet?.addr}</div>
                        <span className={`text-xs px-3 py-1 rounded font-bold uppercase ${
                            selectedWallet?.type === 'whale' ? 'bg-[#2F80ED]/10 text-[#2F80ED] border border-[#2F80ED]/30' : 
                            selectedWallet?.type === 'smart' ? 'bg-primary-green/10 text-primary-green border border-primary-green/30' : 
                            'bg-primary-red/10 text-primary-red border border-primary-red/30'
                        }`}>{selectedWallet?.tag}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-8 gap-y-4 items-center">
                        <div>
                            <div className="text-[10px] text-text-medium font-bold uppercase tracking-wide mb-0.5">Total Value</div>
                            <div className="text-xl font-bold">{selectedWallet?.bal}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-text-medium font-bold uppercase tracking-wide mb-0.5">30d PnL</div>
                            <div className="text-xl font-bold text-primary-green">{selectedWallet?.pnl}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-text-medium font-bold uppercase tracking-wide mb-0.5">Win Rate</div>
                            <div className="text-xl font-bold">{selectedWallet?.win}</div>
                        </div>
                        <div className="bg-card border border-primary-green text-primary-green px-3 py-1 rounded-full font-bold text-sm">
                            Score: 94/100
                        </div>
                    </div>
                </div>
                
                {/* Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-card border border-border rounded-xl p-5 text-center">
                        <h5 className="text-text-medium text-[10px] font-bold uppercase tracking-wide mb-1">Total Holdings</h5>
                        <p className="text-text-light font-bold text-lg">{selectedWallet?.bal}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-5 text-center">
                        <h5 className="text-text-medium text-[10px] font-bold uppercase tracking-wide mb-1">Active Positions</h5>
                        <p className="text-text-light font-bold text-lg">8</p>
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

                {/* Net Worth Chart */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <h3 className="card-title text-base">Net Worth Performance</h3>
                    <div ref={netWorthChartRef} className="w-full min-h-[260px]"></div>
                </div>

                {/* 3-Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* Portfolio */}
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
                                    {portfolio.map((p, i) => (
                                        <tr key={i} className="border-b border-border last:border-0 hover:bg-card-hover/50 transition-colors">
                                            <td className="py-3 font-bold flex items-center gap-2">
                                                <img src={p.img} className="w-6 h-6 rounded-full" /> {p.asset}
                                            </td>
                                            <td className="py-3">{p.value}</td>
                                            <td className="py-3 text-text-medium font-medium">{p.amount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    {/* Activity */}
                    <div className="bg-card border border-border rounded-xl p-6 flex flex-col">
                        <h3 className="card-title text-base">Recent Activity</h3>
                        <div className="flex flex-col">
                            <div className="flex gap-4 py-4 border-b border-border">
                                <div className="w-10 h-10 bg-main rounded-full flex items-center justify-center text-primary-green shrink-0"><Zap size={20} /></div>
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold text-primary-green text-sm">Bought $PEPE</span>
                                        <span className="text-[10px] text-text-dark font-medium">2m ago</span>
                                    </div>
                                    <div className="text-xs text-text-medium font-medium">Swapped 2.5 ETH for 4.2B PEPE</div>
                                </div>
                            </div>
                            <div className="flex gap-4 py-4 border-b border-border">
                                <div className="w-10 h-10 bg-main rounded-full flex items-center justify-center text-primary-red shrink-0"><Trash size={20} /></div>
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold text-primary-red text-sm">Sold $WIF</span>
                                        <span className="text-[10px] text-text-dark font-medium">15m ago</span>
                                    </div>
                                    <div className="text-xs text-text-medium font-medium">Sold 50% position for $12k Profit</div>
                                </div>
                            </div>
                            <div className="flex gap-4 py-4">
                                <div className="w-10 h-10 bg-main rounded-full flex items-center justify-center text-primary-blue shrink-0"><Lock size={20} /></div>
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold text-primary-blue text-sm">Added Liquidity</span>
                                        <span className="text-[10px] text-text-dark font-medium">2h ago</span>
                                    </div>
                                    <div className="text-xs text-text-medium font-medium">Added 10 ETH to UNI-V2 Pool</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transactions */}
                    <div className="bg-card border border-border rounded-xl p-6 flex flex-col">
                        <h3 className="card-title text-base">Recent Transactions</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="border-b border-border text-text-dark text-[10px] font-bold uppercase tracking-wide">
                                        <th className="pb-3 font-bold">Hash</th>
                                        <th className="pb-3 font-bold">Method</th>
                                        <th className="pb-3 font-bold">Age</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentTx.map((tx, i) => (
                                        <tr key={i} className="border-b border-border last:border-0 hover:bg-card-hover/50 transition-colors">
                                            <td className="py-3 font-mono text-primary-blue cursor-pointer hover:underline text-xs font-semibold">{tx.hash}</td>
                                            <td className="py-3"><span className="px-2 py-0.5 bg-[#2A2E33] rounded text-[10px] font-bold uppercase tracking-wide">{tx.method}</span></td>
                                            <td className="py-3 text-text-medium font-medium text-xs">{tx.age}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};