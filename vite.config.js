import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'pages/about.html'),
        demo: resolve(__dirname, 'pages/demo.html'),
        eyewear: resolve(__dirname, 'category/eyewear/eyewear.html'),
        apparel: resolve(__dirname, 'category/apparel/apparel.html'),
        jewelry: resolve(__dirname, 'category/jewelry/jewelry.html'),
        cosmetics: resolve(__dirname, 'category/cosmetics/cosmetics.html')
      }
    }
  }
});
