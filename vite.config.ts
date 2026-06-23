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
    build: {
      outDir: './microservices/core-service-springboot/src/main/resources/static',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks cached independently from app code changes
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui': ['lucide-react'],
          },
        },
      },
    },
    server: {
      host: '127.0.0.1',
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
