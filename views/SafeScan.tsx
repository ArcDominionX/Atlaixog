import React, { useState } from 'react';
import { Shield, CheckCircle, AlertTriangle, XCircle, Search, ShieldCheck } from 'lucide-react';

export const SafeScan: React.FC = () => {
    const [scanned, setScanned] = useState(false);
    const [contract, setContract] = useState('');

    const handleScan = () => { 
        if (contract.trim() !== '') setScanned(true); 
    };

    if (!scanned) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto px-4">
                <div className="w-full max-w-[550px] flex flex-col items-center gap-5">
                    <div className="bg-[#16181A] border border-border w-full p-2 rounded-xl flex items-center pr-3">
                        <input 
                            type="text" 
                            className="bg-transparent text-text-light w-full p-3 outline-none placeholder-text-dark text-base" 
                            placeholder="Enter Token Contract Address" 
                            value={contract} 
                            onChange={(e) => setContract(e.target.value)} 
                        />
                    </div>
                    <button 
                        className="bg-primary-green text-main font-bold py-3 px-10 rounded-xl hover:bg-primary-green-darker transition-colors w-full sm:w-auto text-base"
                        onClick={handleScan}
                    >
                        Safe Scan
                    </button>
                </div>
                
                <div className="mt-10 bg-card border border-border rounded-2xl p-10 flex flex-col items-center text-center max-w-[480px] w-full">
                    <div className="w-[60px] h-[60px] text-primary-green mb-5">
                        <Shield size={60} strokeWidth={1.5} />
                    </div>
                    <h2 className="text-2xl font-bold mb-3">Security & Risk Analysis</h2>
                    <p className="text-text-medium text-base leading-relaxed">
                        Scan any token for honeypots, liquidity risks, malicious code, and get an AI-powered safety grade.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <img src="https://cryptologos.cc/logos/bonk1-bonk-logo.png" className="w-8 h-8 rounded-full" /> 
                        Bonk ($BONK) 
                        <span className="bg-[rgba(38,211,86,0.15)] text-primary-green border border-[rgba(38,211,86,0.3)] px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide">Safe</span>
                    </h2>
                    <p className="text-sm text-text-medium font-medium">Contract: DezX..B263 • Scanned 2m ago</p>
                </div>
                <button className="bg-primary-green text-main font-bold px-5 py-2 rounded-lg hover:bg-primary-green-darker transition-colors text-xs uppercase tracking-wide">
                    Re-scan
                </button>
            </div>

            {/* Top Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Token Overview */}
                <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="flex items-center gap-2 font-bold text-lg mb-5">Token Overview</h3>
                    <div className="flex flex-col gap-3">
                        {[
                            {l: 'Price', v: '$0.000024'},
                            {l: 'Age', v: '1.2 Years'},
                            {l: 'Market Cap', v: '$1.6B'},
                            {l: 'Holders', v: '650K+'},
                            {l: '24h Volume', v: '$200M'},
                        ].map((i, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                                <span className="text-text-medium font-medium">{i.l}</span>
                                <span className="text-text-light font-bold">{i.v}</span>
                            </div>
                        ))}
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-text-medium font-medium">Liquidity</span>
                            <span className="text-primary-green font-bold">$12M+</span>
                        </div>
                        <div className="mt-2">
                            <div className="flex justify-between text-[10px] font-bold mb-1 uppercase tracking-wide">
                                <span className="text-primary-green">Buy 52%</span>
                                <span className="text-primary-red">Sell 48%</span>
                            </div>
                            <div className="w-full h-1.5 bg-primary-red rounded-full overflow-hidden">
                                <div className="h-full bg-primary-green w-[52%]"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* LP Risk Scanner */}
                <div className="bg-card border border-border rounded-2xl p-6 flex flex-col h-full">
                    <h3 className="flex items-center gap-2 font-bold text-lg mb-5">LP Risk Scanner</h3>
                    <div className="flex flex-col gap-4 flex-grow">
                        <div>
                            <div className="flex justify-between items-center mb-2 text-sm">
                                <span className="text-text-medium font-medium">Liquidity Locked</span>
                                <span className="text-primary-green font-bold">100%</span>
                            </div>
                            <div className="w-full h-2 bg-[#2A2E33] rounded-full overflow-hidden">
                                <div className="h-full bg-primary-green w-full"></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] text-text-medium mb-1 font-bold uppercase tracking-wide">Lock Duration</div>
                                <div className="font-bold text-base">Burnt</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-text-medium mb-1 font-bold uppercase tracking-wide">Unlock Date</div>
                                <div className="font-bold text-base">Never</div>
                            </div>
                        </div>
                        <div className="mt-auto bg-[rgba(38,211,86,0.1)] border border-[rgba(38,211,86,0.2)] rounded-xl p-4 flex justify-between items-center">
                            <div>
                                <div className="text-primary-green font-bold text-sm mb-0.5">LP RISK: LOW</div>
                                <div className="text-text-light text-xs font-medium">Liquidity is burnt (Safest)</div>
                            </div>
                            <span className="bg-[rgba(38,211,86,0.15)] text-primary-green border border-[rgba(38,211,86,0.3)] px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide">Safe</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fraud Detection */}
                <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="flex items-center gap-2 font-bold text-lg mb-5">Fraud Detection</h3>
                    <div className="flex flex-col">
                        {[
                            {label: 'Honeypot Test', status: 'Passed', type: 'safe'},
                            {label: 'Trading Status', status: 'Enabled', type: 'safe'},
                            {label: 'Mint Function', status: 'Disabled', type: 'safe'},
                            {label: 'Ownership', status: 'Renounced', type: 'safe'},
                            {label: 'Blacklist Function', status: 'None', type: 'safe'},
                            {label: 'Suspicious Functions', status: 'None', type: 'safe'},
                            {label: 'Dev Wallet Activity', status: 'Clean', type: 'safe'},
                            {label: 'Large Mints/Burns', status: 'Passed', type: 'safe'},
                        ].map((item, i) => (
                            <div key={i} className="flex justify-between items-center py-2.5 border-b border-border last:border-0 text-sm">
                                <div className="flex items-center gap-2 text-text-medium font-medium">
                                    <CheckCircle size={16} className="text-primary-green" /> {item.label}
                                </div>
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                    item.type === 'safe' ? 'bg-[rgba(38,211,86,0.15)] text-primary-green' : 'bg-primary-red/15 text-primary-red'
                                }`}>
                                    {item.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Token Health Grade */}
                <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="flex items-center gap-2 font-bold text-lg mb-5">Token Health Grade</h3>
                    <div className="flex justify-between items-center mb-6">
                        <p className="text-sm text-text-medium leading-relaxed max-w-[60%] font-medium">
                            Excellent liquidity and organic volume growth.
                        </p>
                        <div className="text-6xl font-extrabold text-primary-green leading-none">A</div>
                    </div>
                    <div className="flex flex-col gap-3.5">
                        {[
                            {l: 'Liquidity Depth', v: '95%'},
                            {l: 'Volume Consistency', v: '88%'},
                            {l: 'Buy/Sell Momentum', v: '75%'},
                            {l: 'Holder Distribution', v: '92%'},
                            {l: 'Volatility', v: '60%'},
                            {l: 'Token Age', v: '100%'}
                        ].map((m, i) => (
                            <div key={i} className="flex justify-between items-center text-xs gap-4">
                                <span className="text-text-medium min-w-[120px] font-semibold">{m.l}</span>
                                <div className="flex-1 h-1.5 bg-main rounded-full overflow-hidden">
                                    <div className="h-full bg-primary-green rounded-full" style={{width: m.v}}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI Risk Score (Full Width) */}
            <div className="bg-gradient-to-br from-card to-[#111315] border border-border rounded-2xl p-8 mt-2">
                <div className="max-w-4xl mx-auto text-center">
                    <h3 className="text-xl font-bold text-text-light mb-6">AI-Based Risk Score</h3>
                    <div className="text-6xl font-extrabold text-primary-green leading-none mb-3">12</div>
                    <div className="inline-block bg-[rgba(38,211,86,0.15)] text-primary-green border border-[rgba(38,211,86,0.3)] px-6 py-2 rounded-full font-bold text-base mb-8">
                        Very Safe
                    </div>
                    
                    {/* Custom Slider Visualization */}
                    <div className="relative w-full h-2.5 bg-[#2A2E33] rounded-full mb-8">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#26D356] via-[#F2C94C] to-[#EB5757]"></div>
                        <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-500" style={{left: '12%'}}></div>
                    </div>

                    <div className="text-left bg-black/20 rounded-xl p-6 border border-border/50">
                        <h4 className="text-base font-bold text-text-medium mb-4">AI Analysis Summary:</h4>
                        <ul className="space-y-3 text-sm text-text-light font-medium">
                            <li className="flex items-start gap-3">
                                <span className="text-primary-green text-lg leading-none">•</span>
                                Token contract is fully renounced and immutable. No hidden mint functions detected.
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-primary-green text-lg leading-none">•</span>
                                Liquidity is permanently burnt, removing rug-pull risk from developers.
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-primary-green text-lg leading-none">•</span>
                                Holder distribution is healthy with no single wallet holding &gt; 2% of supply (excluding exchange hot wallets).
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};