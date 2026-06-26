import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import FileUpload from '../components/FileUpload';
import QuickActions from '../components/QuickActions';

function StatCard({ label, value, sub, color = 'blue' }) {
  const textColors = {
    blue: 'text-blue-600',
    emerald: 'text-emerald-600',
    violet: 'text-violet-600',
    amber: 'text-amber-600'
  };
  const colorClass = textColors[color] || 'text-slate-600';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover-glow shadow-sm flex flex-col justify-between h-32">
      <div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-3xl font-extrabold ${colorClass}`}>{value}</p>
      </div>
      {sub && <p className="text-[10px] text-slate-400 font-medium">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadFiles = () => {
    api.get('/files/').then(r => setFiles(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { loadFiles(); }, []);

  const totalRows = files.reduce((a, f) => a + f.row_count, 0);
  const readyFiles = files.filter(f => f.status === 'ready').length;

  const handleUploaded = (file) => {
    setFiles(prev => [file, ...prev]);
    navigate(`/data?file=${file.id}`);
  };

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-xs text-slate-400 mt-0.5">Overview of your data workspace</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Files" value={files.length} sub={`${readyFiles} ready`} color="blue" />
        <StatCard label="Total Rows" value={totalRows.toLocaleString()} sub="across all files" color="emerald" />
        <StatCard label="Columns" value={files[0]?.column_count ?? 0} sub="in latest file" color="violet" />
        <StatCard label="Actions Run" value="—" sub="today" color="amber" />
      </div>

      {/* Upload */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 hover-glow shadow-sm">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Upload New File</h2>
        <FileUpload onUploaded={handleUploaded} />
      </div>

      {/* Recent Files */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 hover-glow shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Recent Files</h2>
          <Link to="/files" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">View all</Link>
        </div>
        {loading ? (
          <div className="text-xs text-slate-400 py-6 text-center animate-pulse">Loading files…</div>
        ) : files.length === 0 ? (
          <div className="text-xs text-slate-400 py-8 text-center">No files uploaded yet.</div>
        ) : (
          <div className="space-y-2">
            {files.slice(0, 5).map(f => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer"
                onClick={() => navigate(`/data?file=${f.id}`)}>
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{f.name}</p>
                  <p className="text-[10px] text-slate-400">{f.row_count.toLocaleString()} rows · {f.size_display}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  f.status === 'ready' ? 'bg-emerald-50 text-emerald-700' :
                  f.status === 'error' ? 'bg-red-50 text-red-700' :
                  'bg-amber-50 text-amber-700'}`}>
                  {f.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions overview */}
      {files.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 hover-glow shadow-sm">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Quick Actions — {files[0].name}</h2>
          <QuickActions fileId={files[0].id} fileName={files[0].name} columns={files[0].columns} onComplete={loadFiles} />
        </div>
      )}
    </div>
  );
}
