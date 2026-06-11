import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // Firebase has been fully removed — all aliases point to local stubs/API client
        'firebase/firestore': path.resolve(__dirname, './src/lib/firestore-fallback.ts'),
        'firebase/auth': path.resolve(__dirname, './src/lib/firebase-auth-stub.ts'),
        'firebase/app': path.resolve(__dirname, './src/lib/firebase-app-stub.ts'),
        '@firebase/firestore': path.resolve(__dirname, './src/lib/firestore-fallback.ts'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
