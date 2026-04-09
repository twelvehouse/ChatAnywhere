import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import pkg from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
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
