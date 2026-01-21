
import React, { useState, useEffect, useCallback } from 'react';
import {
  Navigation,
  Settings,
  History,
  LogOut,
  MapPin,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Clock,
  Compass,
  Calendar,
  AlertTriangle,
  Wallet,
  Car
} from 'lucide-react';
import { GLMService } from './services/glmService';
import { RouteService } from './services/routeService';
import { RouteData, AIPlanResponse, ChatMessage, HistoryRecord } from './types';
import MapView from './components/MapView';
import ChatPanel from './components/ChatPanel';
import ErrorNotification from './components/ErrorNotification';
import ApiKeyModal from './components/ApiKeyModal';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem('voyage_api_key'));
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [aiPlan, setAiPlan] = useState<AIPlanResponse | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>(() => {
    const saved = localStorage.getItem('voyage_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [errorMessage, setErrorMessage] = useState<string>('');

  // Route service instance
  const routeService = new RouteService();

  // Show welcome modal when no API key
  useEffect(() => {
    if (!apiKey) {
      setShowWelcomeModal(true);
    }
  }, [apiKey]);

  const handleSaveApiKey = async (key: string) => {
    localStorage.setItem('voyage_api_key', key);
    setApiKey(key);
  };

  const handleUseDemoMode = () => {
    const demoKey = '0a0620e8b7394690b2945f3dc3dca502.xghC4HTyFgWFKZbx';
    localStorage.setItem('voyage_api_key', demoKey);
    setApiKey(demoKey);
    setShowWelcomeModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('voyage_api_key');
    setApiKey(null);
    setRoute(null);
    setAiPlan(null);
    setMessages([]);
  };

  const startPlanning = async () => {
    if (!origin || !destination || !apiKey) return;
    setIsPlanning(true);
    setRoute(null);
    setAiPlan(null);
    setMessages([]);

    try {
      const routeData = await routeService.getRoute(origin, destination);
      setRoute(routeData);

      const service = new GLMService(apiKey);
      const plan = await service.generatePlan(routeData, "General tourism, medium budget");
      setAiPlan(plan);
      
      const assistantMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: plan.replyMarkdown,
        timestamp: Date.now()
      };
      setMessages([assistantMsg]);

      // Save to history
      const newHistory: HistoryRecord = {
        id: Date.now().toString(),
        origin: routeData.origin,
        destination: routeData.destination,
        timestamp: Date.now(),
        routeSummary: routeData.summary,
        aiResponse: plan
      };
      const updatedHistory = [newHistory, ...history].slice(0, 10);
      setHistory(updatedHistory);
      localStorage.setItem('voyage_history', JSON.stringify(updatedHistory));

    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : 'Planning failed. Please check your API key and try again.';
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsPlanning(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!apiKey || !route) return;
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsPlanning(true);

    try {
      const service = new GLMService(apiKey);
      const plan = await service.generatePlan(
        route,
        text,
        messages.map(m => `${m.role}: ${m.content}`)
      );
      
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: plan.replyMarkdown,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, assistantMsg]);
      setAiPlan(plan);
    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to get AI response. Please try again.';
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsPlanning(false);
    }
  };

  const loadHistory = (record: HistoryRecord) => {
    setOrigin(record.origin);
    setDestination(record.destination);
    setAiPlan(record.aiResponse);
    setMessages([{
      id: 'history-' + record.id,
      role: 'assistant',
      content: record.aiResponse.replyMarkdown,
      timestamp: record.timestamp
    }]);
    // Note: in a real app we'd refetch the route polyline here
    setRoute({
      origin: record.origin,
      destination: record.destination,
      distanceKm: 0,
      durationMin: 0,
      polyline: [[39.9, 116.4], [31.2, 121.4]], // Simplified for history view
      summary: record.routeSummary
    });
  };

  // Welcome Modal (first time visit)
  if (!apiKey && showWelcomeModal) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-blue-200/50 p-8 border border-white">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-300">
                <Navigation size={32} />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">欢迎使用 VoyageAI</h1>
            <p className="text-slate-500 text-center text-sm mb-8">智能旅行规划助手，让旅程更美好</p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowWelcomeModal(false);
                  setShowApiKeyModal(true);
                }}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2"
              >
                <Sparkles size={18} />
                配置我的 API Key
              </button>

              <button
                onClick={handleUseDemoMode}
                className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all"
              >
                体验模式（使用默认配置）
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-2">
              <p className="text-[10px] text-slate-400 text-center uppercase tracking-widest leading-relaxed">
                Powered by GLM-4<br/>
                安全 & 私密
              </p>
            </div>
          </div>
        </div>
        <ApiKeyModal
          isOpen={showApiKeyModal}
          onClose={() => setShowApiKeyModal(false)}
          onSave={handleSaveApiKey}
          currentApiKey={apiKey}
        />
      </>
    );
  }

  // If no API key and modal dismissed, redirect to welcome
  if (!apiKey) {
    setShowWelcomeModal(true);
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {errorMessage && (
        <ErrorNotification
          message={errorMessage}
          onClose={() => setErrorMessage('')}
        />
      )}

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={handleSaveApiKey}
        currentApiKey={apiKey}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Navigation size={18} />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">VoyageAI</span>
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              CONNECTED
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowApiKeyModal(true)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              title="API 设置"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="退出登录"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Planning & Map */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Controls Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="mb-4 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
              <Sparkles size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-700">
                <p className="font-semibold mb-1">AI-Powered Journey Planning</p>
                <p className="text-blue-600">Try: Beijing → Shanghai, Guangzhou → Shenzhen, or any Chinese city pair!</p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-3">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Origin (e.g. Beijing)"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  />
                </div>
                <div className="relative">
                  <Compass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Destination (e.g. Shanghai)"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  />
                </div>
              </div>
              <button 
                onClick={startPlanning}
                disabled={isPlanning || !origin || !destination}
                className="md:w-32 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-100 flex flex-col items-center justify-center gap-1 group py-4 md:py-0"
              >
                {isPlanning ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Sparkles size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-wider">Plan trip</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Map Display */}
          <div className="aspect-video lg:aspect-auto lg:h-[400px] bg-slate-200 rounded-3xl overflow-hidden border border-slate-200 shadow-inner relative">
            {route ? (
              <MapView polyline={route.polyline} origin={route.origin} destination={route.destination} />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                <Compass size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">Ready to visualize your journey</p>
              </div>
            )}
            
            {route && (
              <div className="absolute top-4 left-4 z-[1000] space-y-2">
                <div className="bg-white/90 backdrop-blur p-3 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Car size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Distance</p>
                    <p className="text-sm font-bold text-slate-800">{route.distanceKm} km</p>
                  </div>
                </div>
                <div className="bg-white/90 backdrop-blur p-3 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Est. Time</p>
                    <p className="text-sm font-bold text-slate-800">~{Math.round(route.durationMin / 60)} hrs</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Structured Data Section */}
          {aiPlan && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Wallet size={18} />
                  <span className="font-semibold text-sm">Budget</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{aiPlan.budgetEstimate}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle size={18} />
                  <span className="font-semibold text-sm">Warnings</span>
                </div>
                <ul className="text-xs text-slate-600 list-disc list-inside space-y-1">
                  {aiPlan.risks.slice(0, 3).map((risk, i) => <li key={i}>{risk}</li>)}
                </ul>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-blue-600">
                  <Calendar size={18} />
                  <span className="font-semibold text-sm">Itinerary</span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  {aiPlan.itinerary.slice(0, 2).map((day, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="font-bold text-blue-500">D{day.day}:</span>
                      <span className="truncate">{day.title}</span>
                    </div>
                  ))}
                  {aiPlan.itinerary.length > 2 && <p className="text-[10px] italic">+{aiPlan.itinerary.length - 2} more days</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Chat & History */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="h-[500px] lg:h-auto lg:flex-1">
            <ChatPanel 
              messages={messages} 
              onSendMessage={handleSendMessage} 
              isLoading={isPlanning} 
            />
          </div>

          {/* History Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-800">
                <History size={18} />
                <h3 className="font-semibold text-sm">Recent Journeys</h3>
              </div>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 no-scrollbar">
              {history.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 italic">No history yet.</p>
              ) : (
                history.map((record) => (
                  <button 
                    key={record.id}
                    onClick={() => loadHistory(record)}
                    className="w-full group text-left p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 group-hover:bg-white rounded-lg transition-colors">
                        <Navigation size={14} className="text-slate-400 group-hover:text-blue-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <span className="truncate max-w-[80px]">{record.origin}</span>
                          <ArrowRight size={10} className="text-slate-300" />
                          <span className="truncate max-w-[80px]">{record.destination}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">{new Date(record.timestamp).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="p-8 text-center text-slate-400 text-xs border-t border-slate-100 mt-10">
        &copy; 2024 VoyageAI Intelligence Systems. All travel advice is AI-generated and should be verified.
      </footer>
    </div>
  );
};

export default App;

const Loader2: React.FC<{className?: string, size?: number}> = ({className, size=24}) => (
  <svg className={`animate-spin ${className}`} width={size} height={size} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
