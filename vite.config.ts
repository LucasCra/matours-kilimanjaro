import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5173, strictPort: true },
  build: { chunkSizeWarningLimit: 1500 }, // MapLibre alone is ~1 MB
});
