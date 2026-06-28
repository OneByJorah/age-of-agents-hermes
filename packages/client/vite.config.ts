import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  build: {
    // Shared distribution directory at the repository root (root/dist/web).
    outDir: fileURLToPath(new URL('../../dist/web', import.meta.url)),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/ws': { target: 'ws://127.0.0.1:8124', ws: true, timeout: 60000 },
      '/session-token': 'http://127.0.0.1:8124',
      '/hooks': 'http://127.0.0.1:8124',
      '/health': 'http://127.0.0.1:8124',
      '/building-stats': 'http://127.0.0.1:8124',
      '/tool-mapping': 'http://127.0.0.1:8124',
      '/model-config': 'http://127.0.0.1:8124',
      '/permission-policy': 'http://127.0.0.1:8124',
      '/sessions': 'http://127.0.0.1:8124',
      '/fs': 'http://127.0.0.1:8124',
    },
  },
});
