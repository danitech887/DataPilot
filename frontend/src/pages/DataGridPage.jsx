import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import QuickActions from '../components/QuickActions';

function HighlightMatch({ value, search }) {
  if (value === '' || value === null || value === undefined) {
    return <span className="text-slate-300 italic font-light">null</span>;
  }
  const str = String(value);
  if (!search || !search.trim()) {
    return <span>{str}</span>;
  }
  const query = search.trim();
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = str.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-amber-200 text-amber-900 font-semibold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

export default function DataGridPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFileId = searchParams.get('file');

  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => Number(localStorage.getItem('dp_page_size')) || 50);
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
    api.get(`/files/${activeFile.id}/preview/`, { params: { page, page_size: pageSize, search } })
      .then(r => setPreview(r.data))
      .catch(err => console.error('Failed to load preview:', err))
      .finally(() => setLoading(false));
  }, [activeFile, page, pageSize, search]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handlePageSizeChange = (newSize) => {
    const sizeNum = Number(newSize);
    setPageSize(sizeNum);
    localStorage.setItem('dp_page_size', String(sizeNum));
    setPage(1);
  };

  const handleActionComplete = () => {
    setPage(1);
    setTimeout(() => loadPreview(), 300);
  };

  const startRow = preview ? (page - 1) * pageSize + 1 : 0;
  const endRow = preview ? Math.min(page * pageSize, preview.total_rows) : 0;

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-slide-up">
      {/* Top bar */}
      <div className="px-6 py-3.5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Interactive Data Grid</h1>
            {activeFile && (
              <p className="text-xs text-slate-400">
                {activeFile.name} · <span className="font-mono">{activeFile.row_count.toLocaleString()}</span> total rows · <span className="font-mono">{activeFile.column_count}</span> columns
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* File selector */}
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dataset:</label>
            <select
              value={activeFile?.id || ''}
              onChange={e => {
                const f = files.find(x => String(x.id) === e.target.value);
                setActiveFile(f);
                setPage(1);
                if (f) setSearchParams({ file: f.id });
              }}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              <option value="">— select dataset —</option>
              {files.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.row_count.toLocaleString()} rows)
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex items-center gap-1.5">
            <div className="relative">
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search across cells…"
                className="text-xs border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
              <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              type="submit"
              className="text-xs bg-blue-600 text-white font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shadow-2xs"
            >
              Filter
            </button>
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
                className="text-xs text-slate-500 hover:text-slate-800 px-1.5 py-1 hover:bg-slate-100 rounded"
              >
                ✕ Clear
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Quick actions & Feature Engineering Toolbar */}
      {activeFile && (
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
          <QuickActions
            fileId={activeFile?.id}
            fileName={activeFile?.name}
            columns={activeFile?.columns}
            onComplete={handleActionComplete}
          />
        </div>
      )}

      {/* Paginated Data Grid Table */}
      <div className="flex-1 overflow-auto bg-slate-50/50">
        {!activeFile ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-2">
            <span className="text-2xl">▦</span>
            <span>Select or upload a tabular dataset to inspect records.</span>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm animate-pulse gap-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Fetching dataset rows…</span>
          </div>
        ) : preview && preview.rows ? (
          <table className="w-full text-xs border-collapse bg-white shadow-2xs">
            <thead>
              <tr className="sticky top-0 bg-slate-100/95 backdrop-blur-xs z-10 border-b border-slate-200 shadow-xs">
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12 border-r border-slate-200/60 select-none">
                  #
                </th>
                {preview.columns.map(col => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap border-r border-slate-200/60 last:border-r-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{col}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {preview.rows.length === 0 ? (
                <tr>
                  <td colSpan={preview.columns.length + 1} className="py-12 text-center text-slate-400 text-xs">
                    No rows match the search query "{search}".
                  </td>
                </tr>
              ) : (
                preview.rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className="hover:bg-blue-50/30 transition-colors duration-100 group border-b border-slate-100"
                  >
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-[10px] select-none border-r border-slate-100 bg-slate-50/50 group-hover:bg-blue-50/50">
                      {(page - 1) * pageSize + ri + 1}
                    </td>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-4 py-2.5 max-w-xs truncate text-[11px] text-slate-700 border-r border-slate-100 last:border-r-0"
                      >
                        <HighlightMatch value={cell} search={search} />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : null}
      </div>

      {/* Pagination & Configurable Rows Controls */}
      {preview && (
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-slate-800 font-mono">{startRow.toLocaleString()}–{endRow.toLocaleString()}</strong> of <strong className="text-slate-800 font-mono">{preview.total_rows.toLocaleString()}</strong> rows
            </span>
            {preview.duplicate_count > 0 && (
              <span className="text-amber-600 font-medium px-2 py-0.5 bg-amber-50 rounded-full text-[10px]">
                ⚠ {preview.duplicate_count} duplicate rows detected
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Rows Per Page Configurator */}
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rows per page:</label>
              <select
                value={pageSize}
                onChange={e => handlePageSizeChange(e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>

            {/* Prev / Page / Next */}
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-200 text-xs font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                ← Prev
              </button>
              <span className="text-xs font-mono text-slate-600 px-1">
                {preview.page} / {preview.total_pages || 1}
              </span>
              <button
                disabled={page >= preview.total_pages}
                onClick={() => setPage(p => p + 1)}
                className="px-2.5 py-1 rounded border border-slate-200 text-xs font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
