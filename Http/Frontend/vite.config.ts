import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      // Forward all API routes to the plugin server — avoids CORS in dev
      '^/(auth|send|sse|history|channels|avatar|ogp|settings|emotes|icon|files)': {
        target: 'http://localhost:3000',
        changeOrigin: false,
      },
    },
  },
});
