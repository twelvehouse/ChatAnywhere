import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import App from './App.tsx';
import { dispatchUnauthorized } from './lib/authEvent';
import { bootstrapTheme } from './lib/themeBootstrap';
import { useSettingsStore } from './store/settingsStore';
import './index.css';
import './theme';

// Apply cached theme to <body> and seed the store before render — otherwise
// AppContent's mount would briefly overwrite body class with the store
// default before useSettingsSync hydrates from the server.
useSettingsStore.setState({ theme: bootstrapTheme() });

if (import.meta.env.DEV && new URLSearchParams(location.search).has('demo')) {
  const { installDemoMode } = await import('./test/msw/browser');
  await installDemoMode();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof Response && error.status === 401) {
        dispatchUnauthorized();
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (error instanceof Response && error.status === 401) {
        dispatchUnauthorized();
      }
    },
  }),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
