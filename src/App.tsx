
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
  const [viewData, setViewData] = useState<any>(null);

  // --- BACKGROUND WORKER ---
  useEffect(() => {
    DatabaseService.checkAndTriggerIngestion();
    const intervalId = setInterval(() => {
        DatabaseService.checkAndTriggerIngestion();
    }, 15000);
    return () => clearInterval(intervalId);
  }, []);

  // --- ROUTER: SYNC STATE FROM URL ---
  const syncStateFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const currentViewParam = params.get('view') as ViewState;
    const dataParam = params.get('data');

    if (currentViewParam) {
      setView(currentViewParam);
      // Try to parse data if it looks like JSON, otherwise use as string
      if (dataParam) {
        try {
            setViewData(JSON.parse(dataParam));
        } catch {
            setViewData(dataParam);
        }
      } else {
        setViewData(null);
      }
    } else {
      setView('overview');
      setViewData(null);
    }
  };

  // --- INITIAL LOAD & POPSTATE LISTENER ---
  useEffect(() => {
    // 1. Initial Load
    syncStateFromUrl();

    // 2. Listen for Browser Back/Forward
    const handlePopState = () => {
      syncStateFromUrl();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- NAVIGATION HANDLER ---
  const navigate = (newView: ViewState, data: any = null) => {
    // 1. Update React State
    setView(newView);
    setViewData(data);

    // 2. Update URL & History
    const params = new URLSearchParams();
    params.set('view', newView);
    
    if (data) {
        // If data is an object (like MarketCoin), we prefer to store just the ID/Ticker in URL for cleanliness
        // But for this SPA to work seamlessly with complex objects without re-fetching, 
        // we will store the string identifier if possible, or stringify small objects.
        if (typeof data === 'string') {
            params.set('data', data);
        } else if (data.ticker) {
            params.set('data', data.ticker); // Prefer Ticker for cleaner URLs
        } else if (data.addr) {
            params.set('data', data.addr);   // Prefer Address for wallets
        } else {
            // Fallback: don't put complex huge objects in URL, just handle state in memory if needed
            // But for deep linking to work, we usually need an ID. 
            // We'll skip adding 'data' to URL if it's too complex and rely on state, 
            // BUT this breaks refresh. So we try to use ID strings where possible in child components.
        }
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ view: newView, data }, '', newUrl);
    
    // 3. Scroll to top
    window.scrollTo(0, 0);
  };

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
      case 'overview': 
        return <Dashboard onTokenSelect={(t) => navigate('token-details', t)} />;
      
      case 'token-details': 
        return <TokenDetails token={viewData} onBack={goBack} />;
      
      case 'kol-feed': return <KolFeed />;
      case 'heatmap': return <Heatmap />;
      
      case 'sentiment': 
        return <Sentiment 
          initialContract={viewData} 
          onAnalyze={(c) => navigate('sentiment', c)} 
          onBack={goBack} 
        />;
      
      case 'detection': 
        return <Detection onSearch={(t) => navigate('token-detection', t)} />;
      
      case 'token-detection': 
        return <TokenDetection token={viewData} onBack={goBack} />;
      
      case 'virality': return <Virality />;
      case 'chatbot': return <Chatbot />;
      
      case 'wallet-tracking': 
        return <WalletTracking 
          initialWallet={viewData} 
          onSelectWallet={(w) => navigate('wallet-tracking', w)}
          onBack={goBack}
        />;
      
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
