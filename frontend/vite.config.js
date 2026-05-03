import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': { target: 'http://localhost:5000', changeOrigin: true },
      '/assets': { target: 'http://localhost:5000', changeOrigin: true },
      '/trades': { target: 'http://localhost:5000', changeOrigin: true },
      '/positions': { target: 'http://localhost:5000', changeOrigin: true },
      '/analysis': { target: 'http://localhost:5000', changeOrigin: true },
      '/health': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
