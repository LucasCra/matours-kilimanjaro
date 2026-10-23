import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative asset URLs, so the build works at a sub-path such as GitHub Pages
  server: { port: 5173, strictPort: true },
  build: { chunkSizeWarningLimit: 1500 }, // MapLibre alone is ~1 MB
});
