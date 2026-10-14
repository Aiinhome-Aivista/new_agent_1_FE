import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Monitor, 
  Send, 
  Sparkles, 
  Check, 
  RefreshCw, 
  X, 
  Bot, 
  Layers, 
  RotateCcw
} from 'lucide-react';
import { DynamicScreenRenderer } from './DynamicScreenRenderer';
import { simulationApi } from '../services/api/endpoints';

interface SimulationModalProps {
  proposalId: string;
  proposalClient?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SimulationModal: React.FC<SimulationModalProps> = ({ 
  proposalId, 
  proposalClient,
  isOpen, 
  onClose 
}) => {
  const [schema, setSchema] = useState<any>(null);
  const [activeScreenId, setActiveScreenId] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; time: string }>>([
    { 
      role: 'assistant', 
      text: 'Hello! Interactive prototype screens have been generated from the solution architecture and requirements. Select any screen or instruct the Copilot to add, refine, or update components.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'mobile' | 'desktop'>('all');

  useEffect(() => {
    if (isOpen && proposalId) {
      setInitialLoading(true);
      simulationApi.getScreens(proposalId)
        .then((res: any) => {
          // Supports both direct object or wrapped { status: 'success', data: ... }
          const receivedData = res?.data ? res.data : res;
          if (receivedData && receivedData.screens && receivedData.screens.length > 0) {
            setSchema(receivedData);
            setActiveScreenId(receivedData.screens[0].id);
          } else if (receivedData && typeof receivedData === 'object') {
            setSchema(receivedData);
          }
        })
        .catch((err) => {
          console.error("Failed to load simulation schema:", err);
        })
        .finally(() => {
          setInitialLoading(false);
        });
    }
  }, [isOpen, proposalId]);

  const handleSendMessage = async () => {
    if (!inputMsg.trim() || loading) return;
    const userText = inputMsg.trim();
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setInputMsg('');
    setMessages(prev => [...prev, { role: 'user', text: userText, time: currentTime }]);
    setLoading(true);

    try {
      const res = await simulationApi.chatRefine(proposalId, userText, schema);
      const resPayload = res?.data ? res.data : res;
      if (resPayload?.updated_schema) {
        setSchema(resPayload.updated_schema);
        setMessages(prev => [
          ...prev, 
          { 
            role: 'assistant', 
            text: resPayload.reply || 'Screen simulation has been updated per your instruction.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        if (!resPayload.updated_schema.screens?.find((s: any) => s.id === activeScreenId)) {
          if (resPayload.updated_schema.screens?.length > 0) {
            setActiveScreenId(resPayload.updated_schema.screens[0].id);
          }
        }
      }
    } catch (err) {
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          text: 'Sorry, there was an error updating the screen prototype. Please try again.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Do you want to regenerate all prototype screens from the solution architecture?")) return;
    setInitialLoading(true);
    try {
      const res = await simulationApi.resetScreens(proposalId);
      const resPayload = res?.data ? res.data : res;
      if (resPayload && resPayload.screens?.length > 0) {
        setSchema(resPayload);
        setActiveScreenId(resPayload.screens[0].id);
      }
    } catch (err) {
      console.error("Failed to reset screens:", err);
    } finally {
      setInitialLoading(false);
    }
  };

  if (!isOpen) return null;
  const activeScreen = schema?.screens?.find((s: any) => s.id === activeScreenId) || schema?.screens?.[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full h-[94vh] max-w-7xl flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Navbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-950/90 select-none">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100">
                  {schema?.application_name || (proposalClient ? `${proposalClient} Solution Simulator` : 'Application Simulator')}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold tracking-wide">
                  HLA Powered
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                  Stage 7: Simulation
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Interactive Multi-Device Screen Simulator & Copilot</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Viewport Filter */}
            <div className="flex bg-slate-850 p-1 rounded-xl border border-slate-800 text-xs">
              <button 
                onClick={() => setDeviceFilter('all')} 
                className={`px-3 py-1 rounded-lg transition font-medium cursor-pointer ${deviceFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                All Viewports
              </button>
              <button 
                onClick={() => setDeviceFilter('mobile')} 
                className={`px-3 py-1 rounded-lg transition font-medium flex items-center gap-1.5 cursor-pointer ${deviceFilter === 'mobile' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Smartphone size={13} /> Mobile
              </button>
              <button 
                onClick={() => setDeviceFilter('desktop')} 
                className={`px-3 py-1 rounded-lg transition font-medium flex items-center gap-1.5 cursor-pointer ${deviceFilter === 'desktop' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Monitor size={13} /> Desktop
              </button>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              title="Reset screens from architecture"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <RotateCcw size={15} />
            </button>

            {/* Close Button */}
            <button 
              onClick={onClose} 
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Panel: Screen List & Copilot Chat */}
          <div className="w-full md:w-96 border-r border-slate-800 bg-slate-950 flex flex-col justify-between shrink-0">
            
            {/* Screen Selector Header */}
            <div className="p-3.5 border-b border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-blue-400" />
                  HLA Screens ({schema?.screens?.length || 0})
                </span>
                {initialLoading && <span className="text-[10px] text-blue-400 animate-pulse">Loading...</span>}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {schema?.screens?.map((scr: any) => (
                  <button
                    key={scr.id}
                    onClick={() => setActiveScreenId(scr.id)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg text-left transition flex items-center justify-between gap-2 border cursor-pointer ${
                      (activeScreenId === scr.id || (!activeScreenId && schema.screens[0].id === scr.id))
                        ? 'bg-blue-600 border-blue-500 text-white font-semibold shadow-sm' 
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="truncate max-w-[140px]">{scr.name}</span>
                    {(activeScreenId === scr.id || (!activeScreenId && schema.screens[0].id === scr.id)) && (
                      <Check size={12} className="shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Copilot Chat Feed */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 font-sans text-xs">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-[90%] shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-sm' 
                      : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-sm leading-relaxed'
                  }`}>
                    {m.role === 'assistant' && (
                      <div className="flex items-center gap-1 text-[10px] text-blue-400 font-semibold mb-1">
                        <Bot size={11} /> Copilot
                      </div>
                    )}
                    {m.text}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 px-1">{m.time}</span>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-blue-400 text-xs">
                  <RefreshCw size={13} className="animate-spin text-blue-400" />
                  <span>Updating screen prototype schema...</span>
                </div>
              )}
            </div>

            {/* Chatbot Input Box */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/40">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="e.g. Add date range filter to the dashboard..."
                  disabled={loading}
                  className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={loading || !inputMsg.trim()}
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white disabled:opacity-40 transition shadow-sm cursor-pointer"
                >
                  <Send size={13} />
                </button>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                💡 Tip: Ask Copilot to add cards, widgets, metrics, or custom workflows.
              </span>
            </div>
          </div>

          {/* Right Panel: Multi-Device Live Canvas */}
          <div className="flex-1 bg-slate-950/70 p-6 overflow-auto flex items-start justify-center gap-8">
            {initialLoading ? (
              <div className="flex flex-col items-center justify-center py-28 text-slate-400 gap-3">
                <RefreshCw size={28} className="animate-spin text-blue-500" />
                <span className="text-sm font-medium">Analyzing solution architecture & generating interactive screens...</span>
              </div>
            ) : activeScreen ? (
              <>
                {/* 1. Mobile Phone Viewport (iPhone 15 aspect ratio) */}
                {(deviceFilter === 'all' || deviceFilter === 'mobile') && (
                  <div className="flex flex-col items-center shrink-0">
                    <span className="text-xs text-slate-400 mb-2 flex items-center gap-1.5 font-medium">
                      <Smartphone size={13} className="text-blue-400" /> Mobile View (375 × 760)
                    </span>
                    <div className="w-[360px] h-[720px] bg-slate-950 border-4 border-slate-800 rounded-[42px] p-3 shadow-2xl overflow-y-auto relative flex flex-col">
                      {/* Notch / Dynamic Island */}
                      <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-3 shrink-0" />
                      
                      {/* Content */}
                      <div className="flex-1 overflow-y-auto px-1 pb-4">
                        <DynamicScreenRenderer screen={activeScreen} platform="mobile" />
                      </div>

                      {/* Home Indicator */}
                      <div className="w-32 h-1 bg-slate-700 rounded-full mx-auto mt-2 shrink-0" />
                    </div>
                  </div>
                )}

                {/* 2. Web Desktop Viewport (Mac/Windows style browser container) */}
                {(deviceFilter === 'all' || deviceFilter === 'desktop') && (
                  <div className="flex flex-col items-center flex-1 max-w-[850px] min-w-[420px]">
                    <span className="text-xs text-slate-400 mb-2 flex items-center gap-1.5 font-medium">
                      <Monitor size={13} className="text-indigo-400" /> Web / Enterprise Portal View
                    </span>
                    <div className="w-full h-[720px] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                      
                      {/* Browser Address Bar */}
                      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center gap-2 text-xs text-slate-400 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                        </div>
                        <span className="ml-3 bg-slate-950 px-4 py-1 rounded-lg text-[11px] text-slate-400 flex-1 truncate font-mono border border-slate-800">
                          https://enterprise-portal.internal/{activeScreen.id || 'overview'}
                        </span>
                      </div>

                      {/* Viewport Content */}
                      <div className="p-5 flex-1 overflow-y-auto">
                        <DynamicScreenRenderer screen={activeScreen} platform="web" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-slate-500 text-sm py-28 text-center">
                No screens available.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
