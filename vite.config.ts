import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'background.html'),
        desktop: resolve(__dirname, 'desktop.html'),
        overlay: resolve(__dirname, 'overlay.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
