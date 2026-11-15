import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import FileUpload from '../components/FileUpload';
import QuickActions from '../components/QuickActions';

const PROVIDER_NAMES = {
  ollama: { label: 'Local Ollama (Qwen 3.5)', type: 'Local / Offline', color: 'emerald', icon: '🔒' },
  anthropic: { label: 'Anthropic Claude', type: 'Cloud API', color: 'violet', icon: '⚡' },
  openai: { label: 'OpenAI GPT-4o', type: 'Cloud API', color: 'blue', icon: '🌐' },
  gemini: { label: 'Google Gemini', type: 'Cloud API', color: 'sky', icon: '✨' },
};

export default function DashboardPage() {
  const [files, setFiles] = useState([]);
  const [activeStats, setActiveStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const provider = localStorage.getItem('dp_provider') || 'ollama';
  const model = localStorage.getItem('dp_model') || (provider === 'ollama' ? 'qwen3.5:4b' : 'default');
  const providerInfo = PROVIDER_NAMES[provider] || PROVIDER_NAMES.ollama;

  const loadFiles = () => {
    api.get('/files/')
      .then(r => {
        setFiles(r.data);
        if (r.data.length > 0) {
          api.get(`/files/${r.data[0].id}/stats/`)
            .then(res => setActiveStats(res.data))
            .catch(() => setActiveStats(null));
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadFiles(); }, []);

  const totalRows = files.reduce((a, f) => a + (f.row_count || 0), 0);
  const primaryFile = files[0];

  // Calculate Data Health Score
  let missingPct = 0;
  let healthScore = 100;
  let duplicateCount = 0;

  if (activeStats && primaryFile && primaryFile.row_count > 0 && primaryFile.column_count > 0) {
    const totalCells = primaryFile.row_count * primaryFile.column_count;
    const nullValues = Object.values(activeStats.null_counts || {}).reduce((a, b) => a + b, 0);
    duplicateCount = activeStats.duplicate_count || 0;
    missingPct = totalCells > 0 ? (nullValues / totalCells) * 100 : 0;
    const dupPct = (duplicateCount / primaryFile.row_count) * 100;
    healthScore = Math.max(10, Math.min(100, Math.round(100 - (missingPct * 0.7 + dupPct * 0.3))));
  }

  const handleUploaded = (file) => {
    setFiles(prev => [file, ...prev]);
    navigate(`/data?file=${file.id}`);
  };

  return (
    <div className="p-6 space-y-6 animate-slide-up max-w-7xl mx-auto">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Workspace Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">Real-time data health monitoring & AI copilot status</p>
        </div>

        {/* Live AI Provider Status Indicator */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-xs">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="absolute w-2.5 h-2.5 rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-800">{providerInfo.label}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                {model}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <span>{providerInfo.icon}</span>
              <span>{providerInfo.type} · Engine Ready</span>
            </p>
          </div>
          <Link
            to="/settings"
            title="Configure AI Model & Provider"
            className="ml-2 text-slate-400 hover:text-blue-600 text-xs transition-colors p-1"
          >
            ⚙
          </Link>
        </div>
      </div>

      {/* Bento Grid: Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Dataset Shape */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 hover-glow shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dataset Shape (N × M)</p>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs">▦</span>
          </div>
          <div className="my-2">
            <p className="text-2xl font-extrabold text-slate-900 font-mono">
              {primaryFile ? `${primaryFile.row_count.toLocaleString()} × ${primaryFile.column_count}` : '0 × 0'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {primaryFile ? primaryFile.name : 'No active dataset'}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span>{files.length} dataset{files.length === 1 ? '' : 's'} loaded</span>
            <span>{totalRows.toLocaleString()} total rows</span>
          </div>
        </div>

        {/* Card 2: Overall Data Health Score */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 hover-glow shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Data Health Score</p>
            <span className={`p-1.5 rounded-lg text-xs ${healthScore >= 85 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              ♥
            </span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <p className={`text-3xl font-extrabold font-mono ${healthScore >= 85 ? 'text-emerald-600' : healthScore >= 70 ? 'text-amber-600' : 'text-red-500'}`}>
              {primaryFile ? `${healthScore}%` : '—'}
            </p>
            <span className="text-xs font-semibold text-slate-500">
              {primaryFile ? (healthScore >= 90 ? 'Grade A · Optimal' : healthScore >= 75 ? 'Grade B · Minor issues' : 'Needs Cleaning') : 'Awaiting data'}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${healthScore >= 85 ? 'bg-emerald-500' : healthScore >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${primaryFile ? healthScore : 0}%` }}
            />
          </div>
        </div>

        {/* Card 3: Missing Values Ratio */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 hover-glow shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Missing Values Ratio</p>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs">⚠️</span>
          </div>
          <div className="my-2">
            <p className="text-2xl font-extrabold text-amber-600 font-mono">
              {primaryFile ? `${missingPct.toFixed(1)}%` : '0.0%'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {primaryFile ? `${duplicateCount} duplicate rows detected` : 'No anomalies'}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <Link to="/data" className="text-blue-600 hover:text-blue-700 font-medium">
              Run Imputation →
            </Link>
            <span className="text-slate-400">{missingPct === 0 ? 'Fully populated' : 'Imputation suggested'}</span>
          </div>
        </div>

        {/* Card 4: AI Provider Architecture */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 hover-glow shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AI Copilot Architecture</p>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs">🤖</span>
          </div>
          <div className="my-2">
            <p className="text-lg font-bold text-slate-800 capitalize truncate">
              {provider === 'ollama' ? 'Zero-Cloud Private' : 'High-Capacity Cloud'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {provider === 'ollama' ? 'Local Qwen 3.5 LLM' : `${provider} Foundation Model`}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <Link to="/ai" className="text-indigo-600 hover:text-indigo-700 font-semibold">
              Open Copilot Chat →
            </Link>
            <span className="text-emerald-600 font-medium">Ready</span>
          </div>
        </div>
      </div>

      {/* Main Bento Sections: Upload & Recent Datasets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Zone (1 col) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 hover-glow shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Ingest Tabular Data</h2>
              <span className="text-[10px] font-mono text-slate-400">CSV, TSV, XLSX</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Drop your raw spreadsheet or export file to parse schemas and run AI transformations.
            </p>
          </div>
          <FileUpload onUploaded={handleUploaded} />
        </div>

        {/* Recent Datasets Table (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 hover-glow shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Recent Datasets</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Quick access to inspected tables</p>
              </div>
              <Link to="/files" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                View all ({files.length}) →
              </Link>
            </div>

            {loading ? (
              <div className="text-xs text-slate-400 py-10 text-center animate-pulse">Loading datasets…</div>
            ) : files.length === 0 ? (
              <div className="text-xs text-slate-400 py-10 text-center">No datasets uploaded yet. Drop a file to get started.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {files.slice(0, 4).map(f => (
                  <div
                    key={f.id}
                    onClick={() => navigate(`/data?file=${f.id}`)}
                    className="py-3 px-2 flex items-center justify-between hover:bg-slate-50/80 rounded-lg cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                          {f.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {f.row_count.toLocaleString()} rows × {f.column_count} cols · {f.size_display}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        f.status === 'ready' ? 'bg-emerald-50 text-emerald-700' :
                        f.status === 'error' ? 'bg-red-50 text-red-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {f.status}
                      </span>
                      <span className="text-slate-300 group-hover:text-blue-600 text-xs transition-colors">→</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions & Transformation Launcher */}
      {files.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 hover-glow shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Quick Actions Toolbar — {files[0].name}
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Run reversible, atomic transformations directly on the primary dataset
              </p>
            </div>
            <Link
              to={`/data?file=${files[0].id}`}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Open Full Data Grid →
            </Link>
          </div>
          <QuickActions
            fileId={files[0].id}
            fileName={files[0].name}
            columns={files[0].columns}
            onComplete={loadFiles}
          />
        </div>
      )}
    </div>
  );
}
