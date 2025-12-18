import React from 'react';
import { ArrowLeft, ShieldCheck, Users, TrendingUp, AlertTriangle } from 'lucide-react';

interface TokenDetectionProps {
    token: string;
    onBack: () => void;
}

export const TokenDetection: React.FC<TokenDetectionProps> = ({ token, onBack }) => {
    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-text-medium hover:text-text-light transition-colors">
                <ArrowLeft size={20} /> Back to Search
            </button>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center text-2xl font-bold">
                        {token.substring(1, 2)}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">{token}</h1>
                        <div className="flex items-center gap-2 text-text-medium">
                            <span className="bg-card px-2 py-0.5 rounded text-xs border border-border">Solana</span>
                            <span className="text-sm">7ey...29a</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold text-primary-green">$0.00421</div>
                    <div className="text-sm text-primary-green">+12.4% (24h)</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center gap-2 font-bold mb-4 text-primary-green">
                        <ShieldCheck /> Security Score: 95/100
                    </div>
                    <ul className="space-y-3 text-sm">
                        <li className="flex items-center justify-between"><span>Mint Auth Disabled</span> <span className="text-primary-green">Yes</span></li>
                        <li className="flex items-center justify-between"><span>Freeze Auth Disabled</span> <span className="text-primary-green">Yes</span></li>
                        <li className="flex items-center justify-between"><span>LP Burned</span> <span className="text-primary-green">98%</span></li>
                        <li className="flex items-center justify-between"><span>Top 10 Holders</span> <span className="text-primary-yellow">15%</span></li>
                    </ul>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center gap-2 font-bold mb-4 text-primary-purple">
                        <Users /> Holder Distribution
                    </div>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs mb-1"><span>Whales</span> <span>12%</span></div>
                            <div className="w-full bg-border h-1.5 rounded-full"><div className="w-[12%] bg-primary-purple h-full rounded-full"></div></div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1"><span>Smart Money</span> <span>5%</span></div>
                            <div className="w-full bg-border h-1.5 rounded-full"><div className="w-[5%] bg-primary-green h-full rounded-full"></div></div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1"><span>Retail</span> <span>83%</span></div>
                            <div className="w-full bg-border h-1.5 rounded-full"><div className="w-[83%] bg-primary-blue h-full rounded-full"></div></div>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center gap-2 font-bold mb-4 text-primary-yellow">
                        <AlertTriangle /> Risk Analysis
                    </div>
                     <p className="text-sm text-text-medium leading-relaxed">
                         No critical risks detected. Volatility is moderate. Smart money inflow has increased by 15% in the last 4 hours, suggesting accumulation.
                     </p>
                </div>
            </div>
        </div>
    );
};