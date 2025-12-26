
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
  const [view, setView] = useState<ViewState>('overview');
  // 'viewData' holds state for detailed views (e.g., the selected token object, wallet address, etc.)
  const [viewData, setViewData] = useState<any>(null);

  // --- BACKGROUND WORKER ---
  useEffect(() => {
    DatabaseService.checkAndTriggerIngestion();
    const intervalId = setInterval(() => {
        DatabaseService.checkAndTriggerIngestion();
    }, 15000);
    return () => clearInterval(intervalId);
  }, []);

  // --- HISTORY API INTEGRATION ---
  useEffect(() => {
    // 1. Ensure we have a state object for the initial load
    if (!window.history.state) {
      window.history.replaceState({ view: 'overview', data: null }, '');
    }

    // 2. Listen for Back/Forward buttons
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        setView(event.state.view);
        setViewData(event.state.data);
      } else {
        // Fallback if history state is missing
        setView('overview');
        setViewData(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Central Navigation Function
  // Usage: navigate('token-details', selectedTokenObject)
  const navigate = (newView: ViewState, data: any = null) => {
    setView(newView);
    setViewData(data);
    // Push new state to browser history
    window.history.pushState({ view: newView, data }, '');
    // Scroll to top on navigation
    window.scrollTo(0, 0);
  };

  // Helper to go back (native browser behavior)
  const goBack = () => {
    window.history.back();
  };

  const handleLogin = () => navigate('overview');
  const handleLogout = () => navigate('auth');

  if (view === 'auth') {
    return <AuthScreen onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (view) {
      // DASHBOARD: Clicking a token navigates to details
      case 'overview': 
        return <Dashboard onTokenSelect={(t) => navigate('token-details', t)} />;
      
      // TOKEN DETAILS: Receives token data from viewData
      case 'token-details': 
        return <TokenDetails token={viewData} onBack={goBack} />;
      
      case 'kol-feed': 
        return <KolFeed />;
      
      case 'heatmap': 
        return <Heatmap />;
      
      // SENTIMENT: Supports drill-down if viewData is provided
      case 'sentiment': 
        return <Sentiment 
          initialContract={viewData} 
          onAnalyze={(contract) => navigate('sentiment', contract)} 
          onBack={goBack} 
        />;
      
      // DETECTION: Search triggers specific token detection view
      case 'detection': 
        return <Detection onSearch={(t) => navigate('token-detection', t)} />;
      
      case 'token-detection': 
        return <TokenDetection token={viewData} onBack={goBack} />;
      
      case 'virality': 
        return <Virality />;
      
      case 'chatbot': 
        return <Chatbot />;
      
      // WALLET TRACKING: Supports drilling down into a specific wallet profile
      case 'wallet-tracking': 
        return <WalletTracking 
          initialWallet={viewData} 
          onSelectWallet={(w) => navigate('wallet-tracking', w)} 
          onBack={goBack}
        />;
      
      // SAFE SCAN: Supports drill-down result
      case 'safe-scan': 
        return <SafeScan 
          initialContract={viewData} 
          onScan={(c) => navigate('safe-scan', c)} 
          onBack={goBack} 
        />;
      
      case 'custom-alerts': return <EmptyView title="Custom Alerts" icon={<AlertCircle size={32} />} />;
      case 'smart-money': return <EmptyView title="Smart Money Tracking" icon={<Zap size={32} />} />;
      case 'settings': return <EmptyView title="Settings" icon={<SettingsIcon size={32} />} />;
      default: return <Dashboard onTokenSelect={(t) => navigate('token-details', t)} />;
    }
  };

  return (
    <Layout currentView={view} onViewChange={(v) => navigate(v)} onLogout={handleLogout}>
      {renderContent()}
    </Layout>
  );
};

export default App;
