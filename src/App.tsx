
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
  // viewData holds the context for the view (e.g., Token Object, Wallet Address string, etc.)
  const [viewData, setViewData] = useState<any>(null);

  // --- BACKGROUND DATA SYNC ---
  useEffect(() => {
    DatabaseService.checkAndTriggerIngestion();
    const intervalId = setInterval(() => {
        DatabaseService.checkAndTriggerIngestion();
    }, 15000);
    return () => clearInterval(intervalId);
  }, []);

  // --- ROUTER ENGINE ---

  // 1. Function to read URL and set React State
  const syncStateFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const currentView = (params.get('view') as ViewState) || 'overview';
    const rawData = params.get('data');
    
    let parsedData = null;
    if (rawData) {
        try {
            // Try to parse as JSON (for objects)
            parsedData = JSON.parse(rawData);
        } catch {
            // If fail, treat as simple string (e.g. 'SOL', '0x123...')
            parsedData = rawData;
        }
    }

    setView(currentView);
    setViewData(parsedData);
  };

  // 2. Initial Load & Listen for Browser Back/Forward
  useEffect(() => {
    syncStateFromUrl(); // Run once on mount
    
    const handlePopState = () => {
        syncStateFromUrl(); // Run whenever history changes (Back button)
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 3. Navigation Action (Updates URL + State)
  const navigate = (newView: ViewState, data: any = null) => {
    const params = new URLSearchParams();
    
    // Only set 'view' param if not overview (default)
    if (newView !== 'overview') {
        params.set('view', newView);
    }
    
    // Smart URL Serialization
    if (data) {
        if (typeof data === 'string') {
            params.set('data', data);
        } else if (typeof data === 'object') {
            // Prefer short identifiers for URL cleanliness
            if (data.ticker) params.set('data', data.ticker);
            else if (data.addr) params.set('data', data.addr);
            else if (data.address) params.set('data', data.address);
            else {
               // Fallback: If no ID found, don't put massive object in URL. 
               // We rely on memory state for the transition, but refresh might lose detail if not backed by ID.
            }
        }
    }

    // Construct new URL
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : window.location.pathname;

    // Push to Browser History
    window.history.pushState({}, '', newUrl);
    
    // Update React State
    setView(newView);
    setViewData(data);
    
    // Reset Scroll
    window.scrollTo(0, 0);
  };

  // 4. Back Helper
  const goBack = () => {
    // Uses browser history to ensure 'Back' logic aligns with UX expectation
    if (window.history.length > 1) {
        window.history.back();
    } else {
        // Fallback if opened in new tab with no history
        navigate('overview');
    }
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
