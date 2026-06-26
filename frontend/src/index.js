// Suppress benign ResizeObserver warnings in dev environment overlay
window.addEventListener('error', e => {
  if (e.message === 'ResizeObserver loop completed with undelivered notifications' || e.message === 'ResizeObserver loop limit exceeded') {
    const resizeObserverErrDiv = document.getElementById('webpack-dev-server-client-overlay-div');
    const resizeObserverErr = document.getElementById('webpack-dev-server-client-overlay');
    if (resizeObserverErrDiv) resizeObserverErrDiv.style.display = 'none';
    if (resizeObserverErr) resizeObserverErr.style.display = 'none';
    e.stopImmediatePropagation();
  }
});

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
