import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

const SUGGESTIONS = [
  'Summarize this dataset for me',
  'What columns have missing values?',
  'Show me the top 5 most common values in each column',
  'Find outliers in numeric columns',
  'What is the average value of numeric columns?',
  'Identify any data quality issues',
];

function Message({ msg }) {
  return (
    <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5 ${
        msg.role === 'bot' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
      }`}>
        {msg.role === 'bot' ? 'AI' : 'U'}
      </div>
      <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
        msg.role === 'bot'
          ? 'bg-white border border-slate-200 text-slate-800'
          : 'bg-blue-600 text-white'
      } ${msg.thinking ? 'animate-pulse text-slate-400 italic' : ''}`}>
        {msg.text.split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}
      </div>
    </div>
  );
}

export default function AICopilotPage() {
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [messages, setMessages] = useState([{
    role: 'bot',
    text: "Hello! I'm your AI Data Copilot. Select a file and ask me anything about your data — analysis, cleaning suggestions, summaries, or specific lookups.",
  }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [provider, setProvider] = useState(() => localStorage.getItem('dp_provider') || 'anthropic');
  const [model, setModel] = useState(() => {
    let saved = localStorage.getItem('dp_model') || 'claude-sonnet-4-20250514';
    if (saved === 'gemini-1.5-pro') return 'gemini-2.5-pro';
    if (saved === 'gemini-1.5-flash') return 'gemini-2.5-flash';
    return saved;
  });
  const bottomRef = useRef();

  useEffect(() => {
    api.get('/files/').then(r => {
      setFiles(r.data);
      if (r.data.length > 0) setActiveFile(r.data[0]);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    if (!text.trim()) return;
    if (!activeFile) { alert('Please select a file first.'); return; }

    setMessages(m => [...m, { role: 'user', text }, { role: 'bot', text: 'Thinking…', thinking: true }]);
    setInput('');
    setSending(true);

    try {
      const { data } = await api.post(`/files/${activeFile.id}/ai/`, {
        prompt: text, provider, model,
      });
      setMessages(m => [...m.slice(0, -1), { role: 'bot', text: data.reply }]);
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Check your API key.';
      setMessages(m => [...m.slice(0, -1), { role: 'bot', text: `⚠️ ${msg}` }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center gap-4">
        <div>
          <h1 className="text-base font-semibold text-slate-900">AI Copilot</h1>
          <p className="text-xs text-slate-400">Natural language data analysis</p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* File */}
          <select value={activeFile?.id || ''} onChange={e => {
            const f = files.find(x => String(x.id) === e.target.value); setActiveFile(f);
          }} className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— select file —</option>
            {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>

          {/* Provider */}
          <select value={provider} onChange={e => {
            setProvider(e.target.value);
            setModel(e.target.value === 'anthropic' ? 'claude-sonnet-4-20250514' : e.target.value === 'gemini' ? 'gemini-2.5-pro' : 'gpt-4o');
          }} className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Google (Gemini)</option>
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-slate-50">
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="px-6 py-3 bg-white border-t border-slate-100 flex gap-2 overflow-x-auto">
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => send(s)} disabled={sending}
            className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-full whitespace-nowrap hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors flex-shrink-0 disabled:opacity-50">
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-6 py-4 bg-white border-t border-slate-200 flex gap-3">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send(input))}
          placeholder="Ask anything about your data…"
          disabled={sending}
          className="flex-1 text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60" />
        <button onClick={() => send(input)} disabled={sending || !input.trim()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors">
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
