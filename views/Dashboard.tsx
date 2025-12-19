import React, { useState, useRef, useEffect } from 'react';
import { Activity, Zap, TrendingUp, ShieldAlert, Scan, Wallet, Bell, ChevronDown, ArrowUp, ArrowDown, Plus, Search, ChevronRight, Settings } from 'lucide-react';
import { MarketCoin } from '../types';
import { DualRangeSlider } from '../components/DualRangeSlider';

const marketDataMock: MarketCoin[] = [
    {id: 1, chain: 'bitcoin', name: 'Bitcoin', ticker: 'BTC', price: '$83,913.68', h1: '-0.28%', h24: '+2.57%', d7: '-12.39%', cap: '$1.67T', dexBuy: '$9.55M', dexSell: '$1.73M', dexFlow: 80, img: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', trend: 'Bullish'},
    {id: 2, chain: 'ethereum', name: 'Ethereum', ticker: 'ETH', price: '$2,717.22', h1: '-0.45%', h24: '+1.17%', d7: '-13.77%', cap: '$327B', dexBuy: '$7.12M', dexSell: '$0', dexFlow: 95, img: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', trend: 'Bearish'},
    {id: 3, chain: 'ethereum', name: 'Tether', ticker: 'USDT', price: '$0.99', h1: '+0.03%', h24: '+0.06%', d7: '+0.01%', cap: '$184B', dexBuy: '$48.32M', dexSell: '$43.61M', dexFlow: 55, img: 'https://cryptologos.cc/logos/tether-usdt-logo.png', trend: 'Bullish'},
    {id: 4, chain: 'xrp', name: 'XRP', ticker: 'XRP', price: '$1.91', h1: '-0.27%', h24: '+0.79%', d7: '-15.32%', cap: '$115B', dexBuy: '$2.41M', dexSell: '$250.14K', dexFlow: 70, img: 'https://cryptologos.cc/logos/xrp-xrp-logo.png', trend: 'Bearish'},
    {id: 5, chain: 'bnb', name: 'BNB', ticker: 'BNB', price: '$817', h1: '+0.02%', h24: '+1.04%', d7: '-12.32%', cap: '$112B', dexBuy: '$11.82M', dexSell: '$9.84M', dexFlow: 60, img: 'https://cryptologos.cc/logos/bnb-bnb-logo.png', trend: 'Bearish'},
    {id: 6, chain: 'solana', name: 'Solana', ticker: 'SOL', price: '$126.61', h1: '+1.20%', h24: '+4.57%', d7: '-5.39%', cap: '$58B', dexBuy: '$15.55M', dexSell: '$12.73M', dexFlow: 85, img: 'https://cryptologos.cc/logos/solana-sol-logo.png', trend: 'Bullish'},
    {id: 7, chain: 'cardano', name: 'Cardano', ticker: 'ADA', price: '$0.45', h1: '-0.10%', h24: '+0.57%', d7: '-10.39%', cap: '$15B', dexBuy: '$1.55M', dexSell: '$1.23M', dexFlow: 40, img: 'https://cryptologos.cc/logos/cardano-ada-logo.png', trend: 'Bearish'},
    {id: 8, chain: 'avalanche', name: 'Avalanche', ticker: 'AVAX', price: '$39.36', h1: '+0.50%', h24: '+2.17%', d7: '-8.39%', cap: '$14B', dexBuy: '$5.55M', dexSell: '$4.23M', dexFlow: 65, img: 'https://cryptologos.cc/logos/avalanche-avax-logo.png', trend: 'Bullish'},
    {id: 9, chain: 'dogecoin', name: 'Dogecoin', ticker: 'DOGE', price: '$0.15', h1: '-0.50%', h24: '+5.57%', d7: '-12.39%', cap: '$21B', dexBuy: '$12.55M', dexSell: '$10.73M', dexFlow: 75, img: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png', trend: 'Bullish'},
    {id: 10, chain: 'polkadot', name: 'Polkadot', ticker: 'DOT', price: '$7.80', h1: '+0.28%', h24: '+1.17%', d7: '-15.39%', cap: '$11B', dexBuy: '$3.55M', dexSell: '$3.73M', dexFlow: 45, img: 'https://cryptologos.cc/logos/polkadot-dot-logo.png', trend: 'Bearish'},
];

const mcapLabels = ['1k', '10k', '100k', '1M', '10M', '100M', '>100M'];
const ageOptions = ['< 1 day', '1 day', '7 days', '1 week', '1 month', '1 year', '> 1 year'];

interface DashboardProps {
    onTokenSelect?: (token: MarketCoin | string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onTokenSelect }) => {
    const [timeFrame, setTimeFrame] = useState('12H');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [mcapMin, setMcapMin] = useState(2);
    const [mcapMax, setMcapMax] = useState(5);
    const [ageFrom, setAgeFrom] = useState('< 1 day');
    const [ageTo, setAgeTo] = useState('> 1 year');
    const [activeAgeDropdown, setActiveAgeDropdown] = useState<'from' | 'to' | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Refs for positioning
    const buttonRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    const toggleFilter = (filterName: string) => {
        setActiveFilter(activeFilter === filterName ? null : filterName);
        setActiveAgeDropdown(null);
    };

    const handleSearchSubmit = () => {
        if (searchQuery.trim() && onTokenSelect) {
            onTokenSelect(searchQuery);
        }
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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeFilter) {
                const target = event.target as Element;
                if (!target.closest('.filter-wrapper') && !target.closest('.filter-popup')) {
                    setActiveFilter(null);
                    setActiveAgeDropdown(null);
                }
            }
        };

        const handleScroll = () => {
            if (activeFilter) {
                setActiveFilter(null);
                setActiveAgeDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [activeFilter]);

    const getChange = (coin: MarketCoin) => { 
        // Helper to parse percentage string
        const parseVal = (str: string) => parseFloat(str.replace('%', '').replace('+', ''));
        const formatVal = (num: number) => (num > 0 ? '+' : '') + num.toFixed(2) + '%';
        
        const h1 = parseVal(coin.h1);
        const h24 = parseVal(coin.h24);
        const d7 = parseVal(coin.d7);

        switch(timeFrame) {
            case 'All': return formatVal(d7 * 12.5); // Mock All time
            case '1H': return coin.h1;
            case '6H': return formatVal(h24 * 0.25); // Simulated data
            case '12H': return formatVal(h24 * 0.5); // Simulated data
            case '1D': return coin.h24;
            case '1W': return coin.d7;
            default: return coin.h24;
        }
    };

    const getPercentColor = (val: string) => val.includes('-') ? 'text-primary-red' : 'text-primary-green';

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.src = 'https://via.placeholder.com/24/2A2E33/FFFFFF?text=' + e.currentTarget.alt.charAt(0);
    };

    const getChainIcon = (chain: string) => {
        switch(chain) {
            case 'bitcoin': return 'https://cryptologos.cc/logos/bitcoin-btc-logo.png';
            case 'ethereum': return 'https://cryptologos.cc/logos/ethereum-eth-logo.png';
            case 'solana': return 'https://cryptologos.cc/logos/solana-sol-logo.png';
            case 'bsc': return 'https://cryptologos.cc/logos/bnb-bnb-logo.png';
            case 'xrp': return 'https://cryptologos.cc/logos/xrp-xrp-logo.png';
            case 'cardano': return 'https://cryptologos.cc/logos/cardano-ada-logo.png';
            case 'avalanche': return 'https://cryptologos.cc/logos/avalanche-avax-logo.png';
            case 'dogecoin': return 'https://cryptologos.cc/logos/dogecoin-doge-logo.png';
            case 'polkadot': return 'https://cryptologos.cc/logos/polkadot-dot-logo.png';
            default: return 'https://via.placeholder.com/20';
        }
    };

    return (
        <div className="flex flex-col gap-6 pb-16">
            
            {/* 1. Search Section (Strictly Horizontal) */}
            <div className="bg-card border border-border rounded-xl p-3 md:p-5 shadow-lg relative z-40">
                <div className="flex flex-row items-center gap-2 w-full flex-nowrap">
                    <div className="flex-1 bg-main border border-border rounded-lg flex items-center px-4 py-2.5 transition-all focus-within:border-primary-green/50">
                        <input 
                            type="text" 
                            className="bg-transparent border-none text-text-light outline-none w-full text-[0.95rem] placeholder-text-dark" 
                            placeholder="search token name or past CA"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                        />
                    </div>
                    <button 
                        className="bg-primary-green text-main w-11 h-11 md:w-14 md:h-11 rounded-lg flex-shrink-0 flex items-center justify-center hover:bg-primary-green-darker transition-colors shadow-md"
                        onClick={handleSearchSubmit}
                    >
                        <Search size={20} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* 2. Live Market Data (Now below Search) */}
            <div className="bg-card border border-border rounded-xl p-3 md:p-5 overflow-visible shadow-sm relative z-30">
                <div className="flex flex-col gap-3 mb-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg">Live Market Data</h3>
                    </div>
                    
                    {/* Timeframe Filter - Styled like Pills, Right Aligned, New Row */}
                    <div className="flex flex-wrap justify-end gap-2 w-full">
                        {['All', '1H', '6H', '12H', '1D', '1W'].map((tf) => (
                            <button 
                                key={tf}
                                onClick={() => setTimeFrame(tf)}
                                className={`
                                    px-4 py-1.5 text-xs font-semibold rounded-full border transition-all whitespace-nowrap
                                    ${timeFrame === tf 
                                        ? 'bg-card-hover border-text-light text-text-light' 
                                        : 'bg-transparent border-border text-text-medium hover:border-text-medium hover:text-text-light'
                                    }
                                `}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Filters */}
                <div className="mb-4 relative">
                    <div className="flex gap-2 md:gap-3 overflow-x-auto custom-scrollbar pb-3 px-1">
                        <div className="filter-wrapper relative flex-shrink-0">
                            <div 
                                className={`filter-pill ${activeFilter === 'mcap' ? 'active' : ''}`} 
                                onClick={() => toggleFilter('mcap')}
                                ref={el => (buttonRefs.current['mcap'] = el)}
                            >
                                All Caps <ChevronDown size={14} />
                            </div>
                            {activeFilter === 'mcap' && (
                                <div className="filter-popup complex" style={getDropdownStyle('mcap')}>
                                    <div className="font-bold mb-3 text-sm text-text-light">Market Cap Range</div>
                                    <DualRangeSlider min={0} max={6} onChange={(min, max) => { setMcapMin(min); setMcapMax(max); }} />
                                    <div className="flex justify-between text-xs text-text-light mt-[-5px] font-bold"><span>{mcapLabels[mcapMin]}</span><span>{mcapLabels[mcapMax]}</span></div>
                                    <div className="flex gap-2 mt-5">
                                        <button className="btn btn-outline flex-1 py-1.5 text-[10px] uppercase" onClick={() => setActiveFilter(null)}>Cancel</button>
                                        <button className="btn btn-green flex-1 py-1.5 text-[10px] uppercase" onClick={() => setActiveFilter(null)}>Apply</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Age Filter */}
                        <div className="filter-wrapper relative flex-shrink-0">
                            <div 
                                className={`filter-pill ${activeFilter === 'age' ? 'active' : ''}`} 
                                onClick={() => toggleFilter('age')}
                                ref={el => (buttonRefs.current['age'] = el)}
                            >
                                Age <ChevronDown size={14} />
                            </div>
                            {activeFilter === 'age' && (
                                <div className="filter-popup complex" style={getDropdownStyle('age')}>
                                    <div className="font-bold mb-3 text-sm text-text-light">Token Age Range</div>
                                    <div className="flex gap-3 mb-4">
                                        <div className="flex-1 relative">
                                            <label className="text-[10px] font-semibold text-text-medium mb-1 block uppercase">From</label>
                                            <div 
                                                className="w-full bg-main border border-border rounded text-text-light p-2 text-xs flex justify-between items-center cursor-pointer hover:border-text-medium transition-colors"
                                                onClick={() => setActiveAgeDropdown(activeAgeDropdown === 'from' ? null : 'from')}
                                            >
                                                {ageFrom} <ChevronDown size={12} className={`transition-transform ${activeAgeDropdown === 'from' ? 'rotate-180' : ''}`} />
                                            </div>
                                            {activeAgeDropdown === 'from' && (
                                                <div className="absolute top-full left-0 w-full bg-card border border-border rounded-lg mt-1 z-[60] max-h-40 overflow-y-auto shadow-xl">
                                                    {ageOptions.map(opt => (
                                                        <div 
                                                            key={opt} 
                                                            className={`p-2 text-xs hover:bg-card-hover cursor-pointer text-text-light border-b border-border/50 last:border-0 ${ageFrom === opt ? 'bg-primary-green/10 text-primary-green font-bold' : ''}`}
                                                            onClick={() => { setAgeFrom(opt); setActiveAgeDropdown(null); }}
                                                        >
                                                            {opt}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 relative">
                                            <label className="text-[10px] font-semibold text-text-medium mb-1 block uppercase">To</label>
                                            <div 
                                                className="w-full bg-main border border-border rounded text-text-light p-2 text-xs flex justify-between items-center cursor-pointer hover:border-text-medium transition-colors"
                                                onClick={() => setActiveAgeDropdown(activeAgeDropdown === 'to' ? null : 'to')}
                                            >
                                                {ageTo} <ChevronDown size={12} className={`transition-transform ${activeAgeDropdown === 'to' ? 'rotate-180' : ''}`} />
                                            </div>
                                            {activeAgeDropdown === 'to' && (
                                                <div className="absolute top-full left-0 w-full bg-card border border-border rounded-lg mt-1 z-[60] max-h-40 overflow-y-auto shadow-xl">
                                                    {ageOptions.map(opt => (
                                                        <div 
                                                            key={opt} 
                                                            className={`p-2 text-xs hover:bg-card-hover cursor-pointer text-text-light border-b border-border/50 last:border-0 ${ageTo === opt ? 'bg-primary-green/10 text-primary-green font-bold' : ''}`}
                                                            onClick={() => { setAgeTo(opt); setActiveAgeDropdown(null); }}
                                                        >
                                                            {opt}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="btn btn-outline flex-1 py-1.5 text-[10px] uppercase" onClick={() => setActiveFilter(null)}>Cancel</button>
                                        <button className="btn btn-green flex-1 py-1.5 text-[10px] uppercase" onClick={() => setActiveFilter(null)}>Apply</button>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="filter-wrapper relative flex-shrink-0">
                            <div 
                                className={`filter-pill ${activeFilter === 'sector' ? 'active' : ''}`} 
                                onClick={() => toggleFilter('sector')}
                                ref={el => (buttonRefs.current['sector'] = el)}
                            >
                                Sectors <ChevronDown size={14} />
                            </div>
                            {activeFilter === 'sector' && (
                                <div className="filter-popup" style={getDropdownStyle('sector')}>
                                    <ul className="flex flex-col gap-1">
                                        {['All', 'RWA', 'AI', 'Meme', 'DeFi', 'Gaming', 'DePIN'].map(s => (<li key={s} className="filter-list-item" onClick={() => setActiveFilter(null)}>{s}</li>))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="filter-wrapper relative flex-shrink-0">
                            <div 
                                className={`filter-pill ${activeFilter === 'chain' ? 'active' : ''}`} 
                                onClick={() => toggleFilter('chain')}
                                ref={el => (buttonRefs.current['chain'] = el)}
                            >
                                Chain <ChevronDown size={14} />
                            </div>
                            {activeFilter === 'chain' && (
                                <div className="filter-popup" style={getDropdownStyle('chain')}>
                                    <ul className="flex flex-col gap-1">
                                        {['All', 'Solana', 'Ethereum', 'BNB Chain', 'Arbitrum', 'Bitcoin', 'Tron', 'Polygon'].map(c => (<li key={c} className="filter-list-item" onClick={() => setActiveFilter(null)}>{c}</li>))}
                                    </ul>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* Table (Compact) */}
                <div className="overflow-x-auto min-h-[400px] custom-scrollbar">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="sticky-col" style={{minWidth: '135px'}}>Chain / Token <div className="inline-flex flex-col ml-1 align-middle opacity-60 hover:opacity-100 cursor-pointer"><ArrowUp size={8} /><ArrowDown size={8} /></div></th>
                                <th>Price <div className="inline-flex flex-col ml-1 align-middle opacity-60 hover:opacity-100 cursor-pointer"><ArrowUp size={8} /><ArrowDown size={8} /></div></th>
                                <th style={{width: '90px'}}>
                                    Chg {timeFrame} <div className="inline-flex flex-col ml-1 align-middle opacity-60 hover:opacity-100 cursor-pointer"><ArrowUp size={8} /><ArrowDown size={8} /></div>
                                </th>
                                <th>MCap <div className="inline-flex flex-col ml-1 align-middle opacity-60 hover:opacity-100 cursor-pointer"><ArrowUp size={8} /><ArrowDown size={8} /></div></th>
                                <th>DEX Buys</th>
                                <th>DEX Sells</th>
                                <th>DEX Flows</th>
                                <th>AI Trend</th>
                            </tr>
                        </thead>
                        <tbody>
                            {marketDataMock.slice(0, 10).map((coin) => {
                                const changeVal = getChange(coin);
                                return (
                                    <tr 
                                        key={coin.id} 
                                        onClick={() => onTokenSelect && onTokenSelect(coin)}
                                        className="cursor-pointer hover:bg-card-hover/50 transition-colors"
                                    >
                                        <td className="sticky-col">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 flex items-center justify-center bg-card-hover rounded-full border border-border/50 shrink-0">
                                                    <img src={getChainIcon(coin.chain)} alt={coin.chain} className="w-3.5 h-3.5 opacity-80" />
                                                </div>
                                                <img src={coin.img} alt={coin.name} width="20" height="20" className="rounded-full shrink-0" onError={handleImageError} />
                                                <div className="flex flex-col">
                                                    <div className="font-bold text-sm leading-none">{coin.ticker}</div>
                                                    <div className="text-[9px] text-text-dark font-medium leading-tight mt-0.5">{coin.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="font-bold text-sm">{coin.price}</td>
                                        <td className={`font-bold text-sm ${getPercentColor(changeVal)}`}>{changeVal}</td>
                                        <td className="font-medium text-sm">{coin.cap}</td>
                                        <td className="text-sm">{coin.dexBuy}</td>
                                        <td className="text-sm">{coin.dexSell}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-primary-green w-[35px] text-right">${(coin.dexFlow/10).toFixed(1)}M</span>
                                                <div className="w-[60px] h-1 bg-border rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary-green" style={{width: `${coin.dexFlow}%`}}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                                coin.trend === 'Bullish' 
                                                ? 'bg-primary-green/10 text-primary-green border-primary-green/30' 
                                                : 'bg-primary-red/10 text-primary-red border-primary-red/30'
                                            }`}>
                                                {coin.trend}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Button */}
                <div className="mt-6 flex justify-center">
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-transparent border border-border hover:border-text-medium hover:bg-card-hover rounded-lg transition-all text-text-medium hover:text-text-light font-bold text-sm">
                        Next Page <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* 3. AI Market Pulse */}
            <div className="w-full relative z-20">
                <h3 className="text-base font-bold mb-4 text-text-light">AI Market Pulse</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center gap-1.5 shadow-sm">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-text-medium mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                            <Activity size={14} className="text-text-medium" /> AI Sentiment
                        </div>
                        <div className="text-[10px] text-text-dark font-medium uppercase tracking-wide">Sentiment score</div>
                        <div className="text-base md:text-lg font-bold text-text-light flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-primary-green text-main flex items-center justify-center text-[10px] font-extrabold shadow-[0_0_10px_rgba(38,211,86,0.2)]">62</div>
                            <span className="leading-tight text-sm">Turning Bullish</span>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center gap-1.5 shadow-sm">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-text-medium mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                            <Zap size={14} className="text-text-medium" /> Smart Rotation
                        </div>
                        <div className="text-[10px] text-text-dark font-medium uppercase tracking-wide">Top flow 24h</div>
                        <div className="text-sm md:text-base font-bold text-text-light flex flex-wrap items-center gap-1.5">
                            Solana <span className="text-[9px] text-primary-green font-bold px-1.5 py-0.5 rounded bg-primary-green/10 whitespace-nowrap">+8% inflow</span>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center gap-1.5 shadow-sm">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-text-medium mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                            <TrendingUp size={14} className="text-text-medium" /> Top Inflow
                        </div>
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center w-full font-bold text-sm md:text-base gap-1">
                            <span>$Fartcoin</span>
                            <span className="text-primary-green text-xs md:text-sm">+$3.2M</span>
                        </div>
                        <div className="mt-0.5 flex justify-start md:justify-end">
                            <span className="px-1.5 py-0.5 rounded bg-primary-green/10 text-primary-green text-[9px] font-bold">Low Risk</span>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center gap-1.5 shadow-sm">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-text-medium mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                            <ShieldAlert size={14} className="text-text-medium" /> Risk Levels
                        </div>
                        <div className="text-sm md:text-lg font-bold text-primary-red">3 Critical Alerts</div>
                        <button className="mt-1.5 w-full bg-primary-yellow/10 border border-primary-yellow/30 text-primary-yellow text-[9px] md:text-[10px] font-bold py-1.5 rounded hover:bg-primary-yellow hover:text-main transition-colors uppercase tracking-wide">View Alerts</button>
                    </div>
                </div>
            </div>

            {/* 4. Middle Row (Watchlist, Actions, Narratives) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                {/* Watchlist */}
                <div className="bg-card border border-border rounded-xl p-5 flex flex-col h-full min-h-[240px] shadow-sm">
                    <h3 className="flex items-center gap-2 font-bold text-base mb-3">Watchlist</h3>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-sm">
                            <thead><tr className="text-left text-text-dark text-[10px] uppercase tracking-wide"><th className="pb-2 font-semibold">Coin</th><th className="pb-2 font-semibold text-right">Price</th></tr></thead>
                            <tbody>
                                {[
                                    {ticker: 'BTC', price: '$82,000', img: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png'},
                                    {ticker: 'ETH', price: '$3,150', img: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'},
                                    {ticker: 'SOL', price: '$126.61', img: 'https://cryptologos.cc/logos/solana-sol-logo.png'},
                                    {ticker: 'AVAX', price: '$39.36', img: 'https://cryptologos.cc/logos/avalanche-avax-logo.png'}
                                ].map((t,i) => (
                                    <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-card-hover/30 transition-colors cursor-pointer" onClick={() => onTokenSelect && onTokenSelect(t.ticker)}>
                                        <td className="py-2.5 flex items-center gap-2.5">
                                            <img src={t.img} alt={t.ticker} className="w-5 h-5 rounded-full" onError={handleImageError} />
                                            <span className="font-semibold text-sm">{t.ticker}</span>
                                        </td>
                                        <td className="py-2.5 text-right font-medium text-sm">{t.price}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button className="w-full mt-3 border border-dashed border-border text-text-medium text-xs font-semibold py-2 rounded-lg hover:border-text-light hover:text-text-light hover:bg-card-hover transition-colors flex items-center justify-center gap-2 uppercase tracking-wide"><Plus size={14} /> Add Token</button>
                </div>

                {/* Quick Actions (Icons color matched to text) */}
                <div className="bg-card border border-border rounded-xl p-5 flex flex-col shadow-sm">
                    <h3 className="font-bold text-base mb-3">Quick Action</h3>
                    <div className="grid grid-cols-2 gap-2 h-full">
                        {[
                            { icon: <Scan size={24} className="text-text-medium" />, label: 'Safe Scan' },
                            { icon: <Wallet size={24} className="text-text-medium" />, label: 'Wallet Tracking' },
                            { icon: <Bell size={24} className="text-text-medium" />, label: 'Smart AI Alert' },
                            { icon: <TrendingUp size={24} className="text-text-medium" />, label: 'View Smart Money' }
                        ].map((a, i) => (
                            <div key={i} className="bg-card-hover rounded-lg flex flex-col items-center justify-center text-center p-3 cursor-pointer hover:bg-border transition-colors group border border-transparent">
                                {a.icon}
                                <span className="text-xs font-semibold mt-2 group-hover:text-white transition-colors">{a.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Trending Narratives */}
                <div className="bg-card border border-border rounded-xl p-5 flex flex-col shadow-sm">
                    <h3 className="font-bold text-base mb-3">Trending Narratives</h3>
                    <div className="grid grid-cols-2 gap-2 h-full">
                        {['Meme', 'RWA', 'AI', 'Sol Ecosystem'].map((n, i) => (
                            <div key={i} className="bg-card-hover rounded-lg flex items-center justify-center p-2 text-sm font-semibold hover:bg-border hover:text-white cursor-pointer transition-colors border border-transparent hover:border-text-dark text-center">
                                {n}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};