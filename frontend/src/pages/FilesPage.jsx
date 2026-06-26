import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import FileUpload from '../components/FileUpload';

function FileCard({ file, onDelete, onSelect }) {
  const statusColors = {
    ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    processing: 'bg-amber-50 text-amber-700 border-amber-200',
    pending: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {file.row_count.toLocaleString()} rows · {file.column_count} cols · {file.size_display}
          </p>
          <p className="text-xs text-slate-300 mt-0.5">{new Date(file.uploaded_at).toLocaleDateString()}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[file.status] || statusColors.pending}`}>
          {file.status}
        </span>
      </div>

      {file.columns.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {file.columns.slice(0, 6).map(col => (
            <span key={col} className="text-xs bg-slate-50 border border-slate-200 text-slate-500 px-2 py-0.5 rounded">{col}</span>
          ))}
          {file.columns.length > 6 && (
            <span className="text-xs text-slate-400 px-1">+{file.columns.length - 6} more</span>
          )}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={() => onSelect(file)}
          className="flex-1 text-xs py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          Open in Grid
        </button>
        <button onClick={() => onDelete(file.id)}
          className="text-xs px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}

export default function FilesPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    api.get('/files/')
      .then(r => setFiles(r.data))
      .catch(err => console.error('Failed to load files:', err))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const deleteFile = async (id) => {
    if (!window.confirm('Delete this file? This cannot be undone.')) return;
    try {
      await api.delete(`/files/${id}/`);
      setFiles(f => f.filter(x => x.id !== id));
    } catch (err) {
      console.error('Failed to delete file:', err);
      alert(err.response?.data?.error || 'An error occurred while deleting the file.');
    }
  };

  const handleUploaded = (file) => {
    setFiles(f => [file, ...f]);
    navigate(`/data?file=${file.id}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">My Files</h1>
        <p className="text-sm text-slate-500 mt-0.5">{files.length} file{files.length !== 1 ? 's' : ''} in your workspace</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Upload New File</h2>
        <FileUpload onUploaded={handleUploaded} />
      </div>

      {loading ? (
        <div className="text-sm text-slate-400 text-center py-8">Loading…</div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="text-sm">No files yet. Upload your first CSV or Excel file.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map(f => (
            <FileCard key={f.id} file={f}
              onDelete={deleteFile}
              onSelect={file => navigate(`/data?file=${file.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
