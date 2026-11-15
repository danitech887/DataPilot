import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const COMMANDS = [
  // Navigation
  { id: 'nav-dash', category: 'Navigation', title: 'Go to Dashboard', icon: '📊', path: '/' },
  { id: 'nav-files', category: 'Navigation', title: 'Go to My Files', icon: '📁', path: '/files' },
  { id: 'nav-grid', category: 'Navigation', title: 'Go to Data Grid', icon: '▦', path: '/data' },
  { id: 'nav-analytics', category: 'Navigation', title: 'Go to Visual Analytics Studio', icon: '📈', path: '/analytics' },
  { id: 'nav-ai', category: 'Navigation', title: 'Go to AI Copilot', icon: '✨', path: '/ai' },
  { id: 'nav-settings', category: 'Navigation', title: 'Go to Settings & Preferences', icon: '⚙️', path: '/settings' },

  // Data Cleaning Quick Actions
  { id: 'act-dedup', category: 'Data Cleaning', title: 'Remove Duplicate Rows (dedup)', icon: '⊖', path: '/data?action=dedup' },
  { id: 'act-trim', category: 'Data Cleaning', title: 'Trim Whitespace (trim)', icon: '✂', path: '/data?action=trim' },
  { id: 'act-fill', category: 'Data Cleaning', title: 'Fill Empty Cells with Fallback (fill)', icon: '⬜', path: '/data?action=fill' },
  { id: 'act-drop', category: 'Data Cleaning', title: 'Purge Blank Rows (drop_empty)', icon: '🗑', path: '/data?action=drop_empty' },
  { id: 'act-headers', category: 'Data Cleaning', title: 'Normalize Headers to snake_case', icon: '≡', path: '/data?action=normalize_headers' },

  // Feature Engineering
  { id: 'act-impute', category: 'Feature Engineering', title: 'Statistical Imputation (Mean/Median/Mode)', icon: '🔧', path: '/data?tool=impute' },
  { id: 'act-outliers', category: 'Feature Engineering', title: 'IQR Outlier Detection & Remediation', icon: '📈', path: '/data?tool=outliers' },
  { id: 'act-onehot', category: 'Feature Engineering', title: 'One-Hot Categorical Encoding', icon: '🔠', path: '/data?tool=one_hot' },
  { id: 'act-scale', category: 'Feature Engineering', title: 'Feature Scaling (Min-Max / Z-Score)', icon: '⚖', path: '/data?tool=scale' },

  // Analytics & Modeling
  { id: 'act-ols', category: 'Analytics & Studio', title: 'Fit Bivariate OLS Linear Regression', icon: '📐', path: '/analytics?tab=regression' },
  { id: 'act-heatmap', category: 'Analytics & Studio', title: 'Open Pearson Correlation Heatmap', icon: '🔥', path: '/analytics?tab=corr' },
  { id: 'act-report', category: 'Analytics & Studio', title: 'Generate Executive Data Quality Report', icon: '📋', path: '/analytics?tab=report' },
];

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredCommands = COMMANDS.filter(cmd =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const execute = (cmd) => {
    onClose();
    if (cmd.path) {
      navigate(cmd.path);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filteredCommands.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          execute(filteredCommands[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[75vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center px-4 py-3 border-b border-slate-100 gap-3">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command, tool, or page name..."
            className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
          />
          <kbd className="text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No matching commands or actions found for "{query}".
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <button
                key={cmd.id}
                onClick={() => execute(cmd)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  selectedIndex === idx
                    ? 'bg-blue-50 text-blue-900 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-sm flex-shrink-0">{cmd.icon}</span>
                  <span className="text-xs truncate">{cmd.title}</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-100/70 flex-shrink-0">
                  {cmd.category}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>Use <kbd className="font-mono bg-white border px-1 rounded text-slate-600">↑</kbd> <kbd className="font-mono bg-white border px-1 rounded text-slate-600">↓</kbd> to navigate</span>
            <span><kbd className="font-mono bg-white border px-1 rounded text-slate-600">↵</kbd> to select</span>
          </div>
          <span>DataPilot Fast Command Launcher</span>
        </div>
      </div>
    </div>
  );
}
