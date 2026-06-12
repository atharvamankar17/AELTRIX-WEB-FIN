import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        demo: resolve(__dirname, 'demo.html'),
        tryon: resolve(__dirname, 'tryon.html')
      }
    }
  }
});
