import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (import.meta.env.DEV && new URLSearchParams(location.search).has('demo')) {
  const { installMockMode } = await import('./mock/index');
  installMockMode();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
