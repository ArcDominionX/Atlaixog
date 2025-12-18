import React, { useState, useRef, useEffect } from 'react';
import { Flame, Search, Check } from 'lucide-react';

// Declare ApexCharts
declare var ApexCharts: any;

export const Virality: React.FC = () => {
    const timelineRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [timeFilter, setTimeFilter] = useState('1D');

    // Chart Effect
    useEffect(() => {
        if (timelineRef.current && typeof ApexCharts !== 'undefined') {
            let categories: string[] = [];
            let d1: number[] = [], d2: number[] = [];

            if(timeFilter === '1H') {
                categories = Array.from({length: 12}, (_, i) => `${i*5}m`); 
                d1 = categories.map(() => Math.floor(30 + Math.random() * 20));
                d2 = categories.map(() => Math.floor(40 + Math.random() * 30));
            } else if (timeFilter === '1D') {
                categories = Array.from({length: 24}, (_, i) => `${i}:00`);
                d1 = categories.map(() => Math.floor(30 + Math.random() * 20));
                d2 = categories.map(() => Math.floor(40 + Math.random() * 30));
            } else { 
                categories = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                d1 = categories.map(() => Math.floor(30 + Math.random() * 20));
                d2 = categories.map(() => Math.floor(40 + Math.random() * 30));
            }

            const options = {
                series: [
                    { name: 'Social Velocity', data: d1 },
                    { name: 'KOL Amp', data: d2 }
                ],
                chart: { type: 'line', height: 280, background: 'transparent', toolbar: { show: false }, zoom: { enabled: false } },
                colors: ['#F2C94C', '#EB5757', '#9B51E0', '#2AF598'],
                stroke: { curve: 'smooth', width: 2 },
                xaxis: { categories: categories, labels: { style: { colors: '#8F96A3', fontSize: '10px', fontFamily: 'Inter' } }, axisBorder: { show: false }, axisTicks: { show: false }, tickAmount: 5 },
                yaxis: { show: true, labels: { style: { colors: '#8F96A3', fontFamily: 'Inter' } } },
                grid: { show: true, borderColor: '#2A2E33', strokeDashArray: 4, xaxis: { lines: { show: false } } },
                theme: { mode: 'dark' },
                legend: { position: 'top', horizontalAlign: 'left', labels: { colors: '#EAECEF', fontFamily: 'Inter' } }
            };
            
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
            chartInstance.current = new ApexCharts(timelineRef.current, options);
            chartInstance.current.render();
        }
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [timeFilter]);

    const narratives = [
        { name: 'Gaming', color: '#27AE60', size: 60, top: 10, left: 10 },
        { name: 'AI', color: '#2F80ED', size: 70, top: 10, left: 75 }, 
        { name: 'DeFi', color: '#27AE60', size: 55, top: 65, left: 5 },
        { name: 'Memes', color: '#EB5757', size: 60, top: 20, left: 50 } 
    ];

    return (
        <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <Flame className="text-primary-red" /> Virality Prediction Engine
            </h2>

            {/* Search */}
            <div className="w-full max-w-2xl mx-auto flex gap-2 mb-4">
                <div className="flex-1 bg-sidebar border border-border rounded-lg flex items-center">
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Enter a token or paste link"
                        className="w-full bg-transparent border-none px-4 py-3 outline-none text-text-light"
                    />
                </div>
                <button className="btn btn-green px-6 gap-2"><Search size={18} /> Search</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                {/* Left Column */}
                <div className="flex flex-col gap-6">
                    {/* Top Viral Tokens Table */}
                    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
                        <div className="p-6 pb-2">
                            <h3 className="text-lg font-semibold">Top Viral Tokens</h3>
                        </div>
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-sm">
                                <thead className="bg-card-hover">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-text-medium text-xs">Token</th>
                                        <th className="px-4 py-3 text-left font-medium text-text-medium text-xs">Viral Score</th>
                                        <th className="px-4 py-3 text-left font-medium text-text-medium text-xs">Social Vel.</th>
                                        <th className="px-4 py-3 text-left font-medium text-text-medium text-xs">Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        {t:'$WIF', s:92, v:'Very High', time:'7 min', c:'bg-primary-green'}, 
                                        {t:'$BONK', s:87, v:'Extreme', time:'18 min', c:'bg-primary-green-light'}, 
                                        {t:'$MOODENG', s:80, v:'High', time:'3 min', c:'bg-primary-yellow'}
                                    ].map((row, i) => (
                                        <tr key={i} className="border-b border-border last:border-0 hover:bg-card-hover/50">
                                            <td className="px-4 py-4 font-bold">{row.t}</td>
                                            <td className="px-4 py-4">
                                                <div className="w-4/5 h-1.5 bg-[#2A2E33] rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${row.c}`} style={{width: `${row.s}%`}}></div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-sm">{row.v}</td>
                                            <td className="px-4 py-4 text-sm text-text-medium">{row.time}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-card border border-border rounded-2xl p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                            <h3 className="text-lg font-semibold">Virality Trend Graph</h3>
                            <div className="flex gap-1.5 flex-wrap">
                                {['1H', '6H', '12H', '1D', '1W', '1M'].map(tf => (
                                    <button 
                                        key={tf} 
                                        className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${timeFilter === tf ? 'bg-card-hover border-primary-green text-primary-green' : 'bg-transparent border-border text-text-medium hover:text-text-light'}`}
                                        onClick={() => setTimeFilter(tf)}
                                    >{tf}</button>
                                ))}
                            </div>
                        </div>
                        <div ref={timelineRef} className="w-full min-h-[300px]"></div>
                    </div>

                    {/* AI Signal */}
                    <div className="bg-card border border-border rounded-2xl p-6">
                        <h3 className="text-lg font-semibold mb-3">AI-Generated Signal</h3>
                        <p className="text-text-light text-[0.95rem] leading-relaxed">
                            Mentions up <strong>220%</strong> in the last hour. Meme activity is picking up. Two whale tweets + several KOLs mentioned it. Linked to <strong className="text-primary-green">"Solana memes"</strong> narrative.
                        </p>
                    </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-6">
                    {/* Probability Card */}
                    <div className="bg-gradient-to-br from-card to-[#0F1113] border border-primary-green rounded-2xl p-6 flex flex-col gap-4">
                        <div className="text-xl font-semibold leading-snug text-white">
                            <span className="text-primary-green text-2xl font-extrabold">92%</span> chance this token will go <span className="text-primary-green text-2xl font-extrabold">VIRAL</span> in the next 24 hours
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-3 items-center text-sm text-text-medium"><Check size={16} className="text-primary-green" /> Extremely High social velocity</div>
                            <div className="flex gap-3 items-center text-sm text-text-medium"><Check size={16} className="text-primary-green" /> High meme activity</div>
                            <div className="flex gap-3 items-center text-sm text-text-medium"><Check size={16} className="text-primary-green" /> Very High KOL amplification</div>
                            <div className="flex gap-3 items-center text-sm text-text-medium"><Check size={16} className="text-primary-green" /> Solana memes narrative trending</div>
                        </div>
                    </div>

                    {/* Narrative Map */}
                    <div className="bg-card border border-border rounded-2xl p-6">
                        <h3 className="text-lg font-semibold mb-4">Narrative Map</h3>
                        <div className="relative w-full h-[240px] bg-sidebar rounded-xl overflow-hidden">
                            {narratives.map((n, i) => (
                                <div 
                                    key={i} 
                                    className="absolute rounded-full flex items-center justify-center text-white font-semibold text-xs cursor-pointer shadow-lg animate-float hover:scale-110 hover:z-10 transition-transform duration-300"
                                    style={{
                                        width: `${n.size}px`, 
                                        height: `${n.size}px`, 
                                        backgroundColor: n.color, 
                                        top: `${n.top}%`, 
                                        left: `${n.left}%`,
                                        animationDelay: `${i * 0.5}s`
                                    }}
                                >
                                    {n.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Related Candidates */}
                    <div className="bg-card border border-border rounded-2xl p-6">
                        <h3 className="text-lg font-semibold mb-4">Related Viral Candidates</h3>
                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-center py-4 border-b border-border">
                                <div>
                                    <div className="text-[10px] text-text-medium uppercase mb-1">VIRAL SCORE</div>
                                    <div className="font-semibold">$BONK</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-text-medium uppercase mb-1">VIRAL SCORE</div>
                                    <div className="font-bold text-lg">87</div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center py-4">
                                <div>
                                    <div className="text-[10px] text-text-medium uppercase mb-1">VIRAL SCORE</div>
                                    <div className="font-semibold">$POPCAT</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-text-medium uppercase mb-1">VIRAL SCORE</div>
                                    <div className="font-bold text-lg">76</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};