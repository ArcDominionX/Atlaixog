import React, { useState } from 'react';
import { ViewState } from '../types';
import { 
  LayoutDashboard, Users, Target, Activity, Radar, Flame, MessageSquare, 
  Wallet, Zap, ShieldCheck, Bell, Settings, LogOut, Menu, User 
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  onLogout: () => void;
}

const NavItem: React.FC<{ 
  active: boolean; 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void;
  colorClass?: string;
  tag?: string;
}> = ({ active, icon, label, onClick, colorClass, tag }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center px-4 py-3.5 rounded-lg mb-1 transition-all duration-200 text-[0.95rem] font-medium relative group text-left
      ${active ? 'bg-card text-text-light font-semibold' : 'text-text-medium hover:bg-card hover:text-text-light'}
      ${active && colorClass ? colorClass : ''}
    `}
  >
    {active && (
      <div className="absolute left-[-1.5rem] top-0 bottom-0 w-1 rounded-r-md bg-primary-green" />
    )}
    <span className={`mr-3.5 ${active ? 'text-current' : 'text-text-dark group-hover:text-current'}`}>
      {icon}
    </span>
    <span className="flex-1">{label}</span>
    {tag && (
      <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded bg-primary-green/10 text-primary-green">
        {tag}
      </span>
    )}
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onViewChange, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleViewChange = (view: ViewState) => {
    onViewChange(view);
    setSidebarOpen(false);
  };

  const getPageTitle = () => {
    switch (currentView) {
      case 'overview': return 'Overview';
      case 'kol-feed': return 'KOL / Influencer Feed';
      case 'heatmap': return 'Token Heatmap';
      case 'sentiment': return 'Sentiment Analysis';
      case 'detection': return 'Global Detection';
      case 'token-detection': return 'Detection';
      case 'virality': return 'Virality Prediction Engine';
      case 'chatbot': return 'AI Chatbot';
      case 'wallet-tracking': return 'Wallet Tracking';
      case 'safe-scan': return 'Safe Scan';
      case 'settings': return 'Settings';
      default: return 'Overview';
    }
  };
  
  const getPageSubtitle = () => {
    switch (currentView) {
        case 'overview': return 'Track token and stay ahead of the crowd'; 
        case 'kol-feed': return 'Real-time posts from top crypto influencers ranked by impact, engagement, and narrative momentum.';
        case 'heatmap': return 'Visualize concentration of normal vs. abnormal activity';
        case 'sentiment': return 'Monitor user opinions, reviews, and feedback trends.';
        case 'detection': return 'Identify anomalies, drift, or suspicious patterns';
        case 'virality': return 'AI predicts tokens likely to blow up from sentiment + engagement signals';
        case 'chatbot': return 'Interact with Atlaix Intelligence';
        case 'safe-scan': return 'Security analysis and risk scoring for tokens';
        case 'wallet-tracking': return 'Monitor wallet activity, performance and patterns';
        default: return '';
    }
  };

  return (
    <div className="flex h-screen bg-main overflow-hidden text-base">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/70 z-[1000] md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Highest Z-Index to prevent content overlap */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-[1100] w-[300px] bg-sidebar border-r border-border
        transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl md:shadow-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 text-2xl font-bold text-text-light">
            <img src="./logo.png" alt="Logo" className="w-9 h-9 object-contain" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/32')} />
            Atlaix
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="text-xs font-bold text-text-dark uppercase tracking-wider mb-3 mt-2 pl-2">Overview</div>
          <NavItem active={currentView === 'overview'} onClick={() => handleViewChange('overview')} icon={<LayoutDashboard size={22} />} label="Overview" />
          
          <div className="text-xs font-bold text-text-dark uppercase tracking-wider mb-3 mt-6 pl-2">Market Monitoring</div>
          <NavItem active={currentView === 'kol-feed'} onClick={() => handleViewChange('kol-feed')} icon={<Users size={22} />} label="KOL / Influencer Feed" />
          <NavItem active={currentView === 'custom-alerts'} onClick={() => handleViewChange('custom-alerts')} icon={<Bell size={22} />} label="Custom Alerts" />
          <NavItem active={currentView === 'heatmap'} onClick={() => handleViewChange('heatmap')} icon={<Activity size={22} />} label="Token Heatmap" />

          <div className="text-xs font-bold text-text-dark uppercase tracking-wider mb-3 mt-6 pl-2">Analytics & Insights</div>
          <NavItem active={currentView === 'sentiment'} onClick={() => handleViewChange('sentiment')} icon={<Target size={22} />} label="Sentiment Analysis" />
          <NavItem active={currentView === 'detection'} onClick={() => handleViewChange('detection')} icon={<Radar size={22} />} label="Detection" />
          <NavItem active={currentView === 'virality'} onClick={() => handleViewChange('virality')} icon={<Flame size={22} />} label="Virality Prediction Engine" />

          <div className="text-xs font-bold text-text-dark uppercase tracking-wider mb-3 mt-6 pl-2">Trading & Intelligence Tools</div>
          <NavItem active={currentView === 'wallet-tracking'} onClick={() => handleViewChange('wallet-tracking')} icon={<Wallet size={22} />} label="Wallet Tracking" />
          <NavItem active={currentView === 'chatbot'} onClick={() => handleViewChange('chatbot')} icon={<MessageSquare size={22} />} label="AI Chatbot" />
          <NavItem active={currentView === 'smart-money'} onClick={() => handleViewChange('smart-money')} icon={<Zap size={22} />} label="Smart Money Tracking" />
          
          <div className="text-xs font-bold text-text-dark uppercase tracking-wider mb-3 mt-6 pl-2">Security & Risk</div>
          <NavItem active={currentView === 'safe-scan'} onClick={() => handleViewChange('safe-scan')} icon={<ShieldCheck size={22} />} label="Safe Scan" />

          <div className="text-xs font-bold text-text-dark uppercase tracking-wider mb-3 mt-6 pl-2">Account</div>
          <NavItem active={currentView === 'settings'} onClick={() => handleViewChange('settings')} icon={<Settings size={22} />} label="Settings" />
          
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-card transition-colors cursor-pointer" onClick={onLogout}>
                <div className="w-8 h-8 rounded-full bg-primary-purple flex items-center justify-center text-xs font-bold text-white">
                  A
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-light truncate">Atlaix User</div>
                  <div className="text-[10px] text-text-medium">Free Plan</div>
                </div>
                <LogOut size={18} className="text-text-medium hover:text-primary-red transition-colors" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-main h-full">
        {/* Header */}
        <header className="h-[80px] md:h-[100px] px-6 md:px-10 flex items-center justify-between sticky top-0 bg-[#111315e6] backdrop-blur-md z-30 border-b border-border/50">
          <div className="flex items-center gap-5 overflow-hidden">
            <button 
              className="md:hidden text-text-medium hover:text-text-light"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={28} />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-text-light flex items-center gap-3 truncate">
                {getPageTitle()}
                {currentView === 'overview' && (
                  <span className="text-xs px-2.5 py-0.5 rounded bg-card border border-border text-text-light font-semibold uppercase">Free</span>
                )}
              </h1>
              <p className="text-base text-text-medium truncate hidden md:block mt-1">{getPageSubtitle()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 flex-shrink-0">
             <div className="relative">
                <button 
                  className="w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center text-text-medium hover:text-text-light hover:bg-card-hover transition-colors"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <User size={22} />
                </button>
                
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-14 w-72 bg-card border border-border rounded-xl shadow-2xl p-2 z-50 animate-fade-in">
                      <div className="flex items-center gap-3 p-3 border-b border-border mb-2">
                        <div className="w-10 h-10 rounded-full bg-primary-purple flex items-center justify-center font-bold text-white text-lg">A</div>
                        <div>
                          <div className="font-bold text-base">Atlaix User</div>
                          <div className="text-xs text-text-medium">user@example.com</div>
                        </div>
                      </div>
                      <button className="w-full text-left px-4 py-3 text-sm font-medium text-text-medium hover:bg-card-hover hover:text-text-light rounded-lg flex items-center gap-3">
                        <User size={18} /> Profile
                      </button>
                      <div className="h-px bg-border my-2" />
                      <button onClick={() => { handleViewChange('settings'); setUserMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-medium text-text-medium hover:bg-card-hover hover:text-text-light rounded-lg flex items-center gap-3">
                        <Settings size={18} /> Settings
                      </button>
                      <button onClick={onLogout} className="w-full text-left px-4 py-3 text-sm font-medium text-text-medium hover:bg-card-hover hover:text-primary-red rounded-lg flex items-center gap-3">
                        <LogOut size={18} /> Login / Switch
                      </button>
                    </div>
                  </>
                )}
             </div>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-y-auto p-5 md:p-8 relative">
           {children}
        </main>
      </div>
    </div>
  );
};