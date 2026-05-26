import React, { useState, useEffect, useRef, useContext } from 'react';
import { Bot, X, Send, Loader2, Download, Clock, RefreshCw } from 'lucide-react';
import { request } from '../services/api';
import { ToastContext } from '../context/ToastContext';

const SESSION_TTL = 30 * 60 * 1000;

const AiChatModal = ({ panelName = 'general' }) => {
  const { showToast } = useContext(ToastContext);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [expired, setExpired] = useState(false);
  const messagesEndRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('monitores_current_role') || '{}');

  useEffect(() => {
    if (isOpen && !sessionId) startSession();
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!sessionId || expired) return;
    const tick = () => {
      const saved = localStorage.getItem(`ai_session_${sessionId}`);
      if (saved) {
        const expiresAt = JSON.parse(saved).expiresAt;
        const left = Math.max(0, expiresAt - Date.now());
        setTimeLeft(left);
        if (left <= 0) { setExpired(true); setSessionId(null); localStorage.removeItem(`ai_session_${sessionId}`); }
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sessionId, expired]);

  const startSession = async () => {
    try {
      const data = await request('/ai/session', { method: 'POST' });
      setSessionId(data.sessionId);
      setExpired(false);
      setMessages([]);
      localStorage.setItem(`ai_session_${data.sessionId}`, JSON.stringify({ expiresAt: data.expiresAt }));
      setTimeLeft(data.expiresAt - Date.now());
    } catch { showToast('Error al iniciar sesión con RevayBot.', 'error'); }
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || loading) return;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setLoading(true);
    try {
      const data = await request('/ai/ask', {
        method: 'POST',
        body: JSON.stringify({ sessionId, message: trimmed })
      });
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.error }]);
        if (data.error.includes('expirada')) setExpired(true);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        const saved = localStorage.getItem(`ai_session_${sessionId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.expiresAt = data.expiresAt;
          localStorage.setItem(`ai_session_${sessionId}`, JSON.stringify(parsed));
        }
      }
    } catch { showToast('Error al comunicarse con RevayBot.', 'error'); }
    finally { setLoading(false); }
  };

  const handleDownload = async () => {
    if (!sessionId) return;
    try {
      const history = await request(`/ai/session/${sessionId}/history`);
      if (!Array.isArray(history)) return;
      let text = `RevayBot — Conversación\nFecha: ${new Date().toLocaleString()}\n\n`;
      history.forEach(m => { text += `${m.role}: ${m.content}\n\n`; });
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `revaybot-${panelName}-${Date.now()}.txt`;
      a.click(); URL.revokeObjectURL(url);
    } catch { showToast('Error al descargar la conversación.', 'error'); }
  };

  const formatTime = (ms) => {
    if (ms === null) return '';
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 w-12 h-12 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-full shadow-xl flex items-center justify-center z-50 transition-all active:scale-90 border-none">
          <Bot size={22} />
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed bottom-6 left-6 w-[380px] max-w-[calc(100vw-24px)] h-[560px] max-h-[calc(100vh-120px)] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-brand-blue text-white shrink-0">
            <div className="flex items-center gap-2">
              <Bot size={18} />
              <div>
                <p className="text-xs font-black">RevayBot</p>
                <p className="text-[9px] text-white/70">{panelName}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {sessionId && !expired && (
                <button onClick={handleDownload} title="Descargar conversación"
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors border-none bg-transparent text-white/80 hover:text-white">
                  <Download size={14} />
                </button>
              )}
              {timeLeft !== null && !expired && (
                <span className="text-[9px] font-black text-white/80 flex items-center gap-1">
                  <Clock size={10} /> {formatTime(timeLeft)}
                </span>
              )}
              <button onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors border-none bg-transparent text-white/80 hover:text-white">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50" style={{ scrollbarWidth: 'thin' }}>
            {messages.length === 0 && !expired && (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-4">
                <Bot size={36} className="text-slate-300 mb-3" />
                <p className="text-sm font-black text-slate-500">¡Hola! Soy RevayBot</p>
                <p className="text-[11px] text-slate-400 mt-1">Pregúntame sobre la plataforma MONITORES.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-[11px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brand-blue text-white rounded-tr-none'
                    : 'bg-white border border-gray-200 text-slate-800 rounded-tl-none shadow-sm'
                }`}>
                  <p className="font-medium whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5 items-center">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Expired overlay */}
          {expired && (
            <div className="p-4 bg-gray-50 border-t border-gray-200 text-center space-y-2">
              <p className="text-xs font-black text-slate-500">⏰ Sesión expirada</p>
              <button onClick={startSession}
                className="px-4 py-2 bg-brand-blue text-white text-[10px] font-black rounded-xl flex items-center gap-1.5 mx-auto border-none">
                <RefreshCw size={12} /> Nueva conversación
              </button>
            </div>
          )}

          {/* Input */}
          {!expired && (
            <div className="p-3 bg-white border-t border-gray-200 shrink-0">
              <div className="flex items-end gap-2 bg-white rounded-xl border border-gray-200 pr-2 pl-3 py-2 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20 transition-all">
                <textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Pregunta a RevayBot..." rows={1}
                  className="flex-1 resize-none outline-none text-xs font-medium max-h-20 py-1 leading-relaxed border-none bg-transparent"
                  style={{ minHeight: '24px' }} />
                <button onClick={handleSend} disabled={!inputValue.trim() || loading}
                  className="w-8 h-8 rounded-xl bg-gray-900 hover:bg-black text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 transition-all shadow-md shrink-0 border-none">
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default AiChatModal;
