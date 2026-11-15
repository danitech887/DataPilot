import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import iconImg from '../assets/icon.png';

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/files', label: 'My Files', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
  { to: '/data', label: 'Data Grid', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7' },
  { to: '/analytics', label: 'Analytics', icon: 'M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z' },
  { to: '/ai', label: 'AI Copilot', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { to: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

export default function Sidebar({ onOpenCommandPalette }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('dp_sidebar_collapsed') === 'true';
  });

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('dp_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-56'
      } bg-white border-r border-slate-200 flex flex-col h-full transition-all duration-300 ease-in-out flex-shrink-0 z-20 select-none`}
    >
      {/* Header & Logo */}
      <div className={`py-4 border-b border-slate-100 flex items-center ${collapsed ? 'px-3 justify-center' : 'px-4 justify-between'}`}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50/80 p-0.5 shadow-sm border border-blue-100">
            <img src={iconImg} alt="DataPilot Logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <span className="font-bold text-slate-900 text-sm tracking-tight truncate">DataPilot</span>
          )}
        </div>

        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Quick Command Launcher pill (when expanded) */}
      {!collapsed && onOpenCommandPalette && (
        <div className="px-3 pt-3">
          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-400 bg-slate-50 hover:bg-blue-50/60 hover:text-blue-700 border border-slate-200/80 rounded-lg transition-all group"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Commands</span>
            </span>
            <kbd className="text-[10px] font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs text-slate-500">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Workspace</p>
        )}
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `group relative flex items-center ${
                collapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-3 py-2.5'
              } rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50/50 text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-blue-600 rounded-r" />
                )}
                <svg
                  className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} />
                </svg>
                {!collapsed && <span className="truncate">{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className={`p-3 border-t border-slate-100 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center flex-col gap-2' : 'gap-2.5 px-2 py-1.5'} rounded-lg hover:bg-slate-50 transition-colors`}>
          <div
            title={user?.username || 'User'}
            className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
          >
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-800 truncate">{user?.username}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email || 'No email'}</p>
            </div>
          )}

          <button
            onClick={logout}
            title="Sign out"
            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
            aria-label="Sign out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
