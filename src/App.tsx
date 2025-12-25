
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { AuthScreen } from './views/Auth';
import { Dashboard } from './views/Dashboard';
import { KolFeed } from './views/KolFeed';
import { Heatmap } from './views/Heatmap';
import { Sentiment } from './views/Sentiment';
import { Detection } from './views/Detection';
import { TokenDetection } from './views/TokenDetection';
import { Virality } from './views/Virality';
import { Chatbot } from './views/Chatbot';
import { WalletTracking } from './views/WalletTracking';
import { SafeScan } from './views/SafeScan';
import { TokenDetails } from './views/TokenDetails';
import { ViewState, MarketCoin } from './types';
import { AlertCircle, Zap, Settings as SettingsIcon } from 'lucide-react';
import { DatabaseService } from './services/DatabaseService';

const EmptyView: React.FC<{ title: string; icon: React.ReactNode }> = ({ title, icon }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center p-6">
    <div className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center mb-6 text-text-medium">
      {icon}
    </div>
    <h2 className="text-2xl font-bold mb-2">{title}</h2>
    <p className="text-text-medium max-w-xs">This feature is currently under construction and will be available in the next update.</p>
  </div>
);

const App: React.FC = () => {
  // Changed initial view to 'overview' to skip auth/network on first load
  const [view, setView] = useState<ViewState>('overview');
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [selectedTokenData, setSelectedTokenData] = useState<MarketCoin | string>('');

  // --- BACKGROUND WORKER ---
  // This ensures the database stays populated even if the user isn't on the dashboard
  useEffect(() => {
    // 1. Initial check on mount
    DatabaseService.checkAndTriggerIngestion();

    // 2. Periodic check every 15 seconds (Aggressive Keep-Alive)
    // We check frequently so that the MOMENT data is > 60s old, we refresh it.
    const intervalId = setInterval(() => {
        DatabaseService.checkAndTriggerIngestion();
    }, 15000);

    return () => clearInterval(intervalId);
  }, []);

  const handleLogin = () => setView('overview');
  const handleLogout = () => setView('auth');

  const handleTokenSelect = (token: MarketCoin | string) => {
      setSelectedTokenData(token);
      setView('token-details');
  };

  if (view === 'auth') {
    return <AuthScreen onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (view) {
      case 'overview': return <Dashboard onTokenSelect={handleTokenSelect} />;
      case 'token-details': return <TokenDetails token={selectedTokenData} onBack={() => setView('overview')} />;
      case 'kol-feed': return <KolFeed />;
      case 'heatmap': return <Heatmap />;
      case 'sentiment': return <Sentiment />;
      case 'detection': return <Detection onSearch={(t) => { setSelectedToken(t); setView('token-detection'); }} />;
      case 'token-detection': return <TokenDetection token={selectedToken} onBack={() => setView('detection')} />;
      case 'virality': return <Virality />;
      case 'chatbot': return <Chatbot />;
      case 'wallet-tracking': return <WalletTracking />;
      case 'safe-scan': return <SafeScan />;
      case 'custom-alerts': return <EmptyView title="Custom Alerts" icon={<AlertCircle size={32} />} />;
      case 'smart-money': return <EmptyView title="Smart Money Tracking" icon={<Zap size={32} />} />;
      case 'settings': return <EmptyView title="Settings" icon={<SettingsIcon size={32} />} />;
      default: return <Dashboard onTokenSelect={handleTokenSelect} />;
    }
  };

  return (
    <Layout currentView={view} onViewChange={setView} onLogout={handleLogout}>
      {renderContent()}
    </Layout>
  );
};

export default App;
