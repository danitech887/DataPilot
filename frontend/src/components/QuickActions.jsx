import React, { useState } from 'react';
import api from '../utils/api';

const CLEANING_ACTIONS = [
  { id: 'dedup',            label: 'Remove Duplicates',   icon: '⊖', desc: 'Drops exact duplicate rows' },
  { id: 'trim',             label: 'Trim Whitespace',     icon: '✂', desc: 'Strips leading/trailing spaces' },
  { id: 'fill',             label: 'Fill Empty Cells',    icon: '⬜', desc: 'Replaces nulls with N/A' },
  { id: 'drop_empty',       label: 'Drop Empty Rows',     icon: '🗑', desc: 'Removes fully blank rows' },
  { id: 'sort',             label: 'Sort A → Z',          icon: '↑', desc: 'Sort by first column ascending' },
  { id: 'normalize_headers',label: 'Normalize Headers',   icon: '≡', desc: 'snake_case column names' },
];

const SCIENCE_ACTIONS = [
  { id: 'impute',           label: 'Impute Nulls',        icon: '🔧', desc: 'Fills column nulls using mean/median/mode', isColSpecific: true },
  { id: 'outliers',         label: 'Clip Outliers',       icon: '📈', desc: 'Clips outliers using IQR (1.5x)', isColSpecific: true },
  { id: 'one_hot',          label: 'One-Hot Encode',      icon: '🔠', desc: 'Converts categorical values to binary columns', isColSpecific: true },
  { id: 'scale',            label: 'Scale Column',        icon: '⚖', desc: 'Normalizes column using MinMax/Z-score scaling', isColSpecific: true },
];

const EXPORT_ACTIONS = [
  { id: 'export_csv',       label: 'Export CSV',          icon: '⬇', desc: 'Download as .csv' },
  { id: 'export_excel',     label: 'Export Excel',        icon: '📊', desc: 'Download as .xlsx' },
];

export default function QuickActions({ fileId, fileName, columns = [], onComplete }) {
  const [running, setRunning] = useState(null);
  const [toast, setToast] = useState(null);

  // Data Science Settings
  const [selectedCol, setSelectedCol] = useState('');
  const [imputeStrategy, setImputeStrategy] = useState('mean');
  const [scalingMethod, setScalingMethod] = useState('minmax');
  const [outlierMethod, setOutlierMethod] = useState('clip');

  // Initialize selectedCol if columns change
  React.useEffect(() => {
    if (columns && columns.length > 0 && !selectedCol) {
      setSelectedCol(columns[0]);
    }
  }, [columns, selectedCol]);

  const run = async (action) => {
    if (!fileId) { setToast({ type: 'error', msg: 'Select a file first' }); return; }
    setRunning(action.id);

    // Export actions
    if (action.id === 'export_csv' || action.id === 'export_excel') {
      try {
        const resp = await api.post(`/files/${fileId}/action/`, { action: action.id }, { responseType: 'blob' });
        
        const ext = action.id === 'export_csv' ? 'csv' : 'xlsx';
        let downloadName = `export.${ext}`;
        if (fileName) {
          const dotIndex = fileName.lastIndexOf('.');
          const baseName = dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
          downloadName = `${baseName}_export.${ext}`;
        }

        const url = URL.createObjectURL(new Blob([resp.data]));
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = downloadName; 
        a.click();
        setToast({ type: 'success', msg: `${action.label} — downloaded!` });
      } catch {
        setToast({ type: 'error', msg: 'Export failed' });
      } finally { setRunning(null); }
      return;
    }

    // Preprocessing actions
    const payload = { action: action.id };
    if (action.isColSpecific) {
      if (!selectedCol) { 
        setToast({ type: 'error', msg: 'Please select a target column' }); 
        setRunning(null);
        return; 
      }
      payload.column = selectedCol;
      if (action.id === 'impute') payload.strategy = imputeStrategy;
      if (action.id === 'outliers') payload.outlier_method = outlierMethod;
      if (action.id === 'scale') payload.scaling_method = scalingMethod;
    }

    try {
      const { data } = await api.post(`/files/${fileId}/action/`, payload);
      setToast({ type: 'success', msg: data.description || `${action.label} complete` });
      onComplete && onComplete(data.preview);
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.error || 'Action failed' });
    } finally {
      setRunning(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category: Standard Data Cleaning */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clean & Format Operations</p>
        <div className="flex flex-wrap gap-2">
          {CLEANING_ACTIONS.map(action => (
            <button key={action.id} onClick={() => run(action)}
              disabled={running !== null}
              title={action.desc}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-all
                ${running === action.id
                  ? 'bg-blue-50 border-blue-200 text-blue-600 animate-pulse cursor-wait'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40'
                }`}>
              <span>{action.icon}</span>
              {running === action.id ? 'Running…' : action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category: Advanced Data Science Operations */}
      {columns && columns.length > 0 && (
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-slate-50 p-3 rounded-lg border border-slate-250">
            {/* Target Column Selector */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Target Column:</label>
              <select value={selectedCol} onChange={e => setSelectedCol(e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[150px]">
                {columns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>

            {/* Imputation settings */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Impute:</label>
              <select value={imputeStrategy} onChange={e => setImputeStrategy(e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="mean">Mean</option>
                <option value="median">Median</option>
                <option value="mode">Mode</option>
              </select>
            </div>

            {/* Outliers settings */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Outliers:</label>
              <select value={outlierMethod} onChange={e => setOutlierMethod(e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="clip">Clip (IQR)</option>
                <option value="drop">Drop Rows</option>
              </select>
            </div>

            {/* Scale settings */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Scaling:</label>
              <select value={scalingMethod} onChange={e => setScalingMethod(e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="minmax">MinMax [0,1]</option>
                <option value="standard">Z-Score</option>
              </select>
            </div>
          </div>

          {/* Science Buttons */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Feature Preprocessing & Scaling</p>
            <div className="flex flex-wrap gap-2">
              {SCIENCE_ACTIONS.map(action => (
                <button key={action.id} onClick={() => run(action)}
                  disabled={running !== null}
                  title={action.desc}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-all
                    ${running === action.id
                      ? 'bg-blue-50 border-blue-200 text-blue-600 animate-pulse cursor-wait'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40'
                    }`}>
                  <span>{action.icon}</span>
                  {running === action.id ? 'Running…' : action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category: Exports */}
      <div className="pt-3 border-t border-slate-100 space-y-1.5">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Downloads & Exports</p>
        <div className="flex flex-wrap gap-2">
          {EXPORT_ACTIONS.map(action => (
            <button key={action.id} onClick={() => run(action)}
              disabled={running !== null}
              title={action.desc}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-all
                ${running === action.id
                  ? 'bg-blue-50 border-blue-200 text-blue-600 animate-pulse cursor-wait'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40'
                }`}>
              <span>{action.icon}</span>
              {running === action.id ? 'Running…' : action.label}
            </button>
          ))}
        </div>
      </div>

      {toast && (
        <div className={`text-xs px-3 py-2 rounded-lg border transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {toast.type === 'success' ? '✓' : '⚠️'} {toast.msg}
        </div>
      )}
    </div>
  );
}
