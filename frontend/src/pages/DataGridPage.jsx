import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import QuickActions from '../components/QuickActions';

export default function DataGridPage() {
  const [searchParams] = useSearchParams();
  const initialFileId = searchParams.get('file');

  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    api.get('/files/').then(r => {
      setFiles(r.data);
      if (initialFileId) {
        const f = r.data.find(x => String(x.id) === initialFileId);
        if (f) setActiveFile(f);
      } else if (r.data.length > 0) {
        setActiveFile(r.data[0]);
      }
    });
  }, [initialFileId]);

  const loadPreview = useCallback(() => {
    if (!activeFile) return;
    setLoading(true);
    api.get(`/files/${activeFile.id}/preview/`, { params: { page, page_size: 50, search } })
      .then(r => setPreview(r.data))
      .finally(() => setLoading(false));
  }, [activeFile, page, search]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleActionComplete = () => {
    setPage(1);
    setTimeout(() => loadPreview(), 300);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-slide-up">
      {/* Top bar */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center gap-4">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Data Grid</h1>
          {activeFile && <p className="text-xs text-slate-400">{activeFile.name} · {activeFile.row_count.toLocaleString()} rows</p>}
        </div>

        {/* File selector */}
        <select value={activeFile?.id || ''} onChange={e => {
          const f = files.find(x => String(x.id) === e.target.value);
          setActiveFile(f); setPage(1);
        }} className="ml-auto text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">— select file —</option>
          {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="Search rows…"
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 w-44 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">Search</button>
          {search && <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
            className="text-xs text-slate-500 hover:text-slate-800 px-2">✕ Clear</button>}
        </form>
      </div>

      {/* Quick actions */}
      {activeFile && (
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
          <QuickActions fileId={activeFile?.id} fileName={activeFile?.name} columns={activeFile?.columns} onComplete={handleActionComplete} />
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {!activeFile ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Select or upload a file to view data.
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm animate-pulse">Loading data…</div>
        ) : preview ? (
          <table className="w-full text-xs border-collapse bg-white">
            <thead>
              <tr className="sticky top-0 bg-slate-100/90 z-10 border-b border-slate-200 shadow-sm backdrop-blur-sm">
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider w-10">#</th>
                {preview.columns.map(col => (
                  <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-blue-50/20 transition-all duration-150 border-b border-slate-100">
                  <td className="px-4 py-2.5 text-slate-300 font-medium select-none">{(page - 1) * 50 + ri + 1}</td>
                  {row.map((cell, ci) => (
                    <td key={ci} className={`px-4 py-2.5 max-w-xs truncate text-[11px] ${cell === '' || cell === null ? 'text-slate-300 italic font-light' : 'text-slate-600 font-medium'}`}>
                      {cell === '' || cell === null ? 'null' : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      {/* Pagination */}
      {preview && (
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
          <span>{preview.total_rows.toLocaleString()} rows · {preview.duplicate_count} duplicates detected</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors">← Prev</button>
            <span>Page {preview.page} of {preview.total_pages}</span>
            <button disabled={page >= preview.total_pages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
