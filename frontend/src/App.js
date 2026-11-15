import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './utils/AuthContext';
import Sidebar from './components/Sidebar';
import CommandPalette from './components/CommandPalette';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FilesPage from './pages/FilesPage';
import DataGridPage from './pages/DataGridPage';
import AICopilotPage from './pages/AICopilotPage';
import SettingsPage from './pages/SettingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import iconImg from './assets/icon.png';

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 p-2 flex items-center justify-center">
          <img src={iconImg} alt="DataPilot" className="w-full h-full object-contain animate-pulse" />
        </div>
        <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider animate-pulse">Loading DataPilot…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar onOpenCommandPalette={() => setPaletteOpen(true)} />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/data" element={<DataGridPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/ai" element={<AICopilotPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}
