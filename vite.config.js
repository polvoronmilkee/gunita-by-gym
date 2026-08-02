import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    proxy: {
      '/portal-api': {
        target: 'https://gameonportal.ph',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/portal-api/, '/api'),
      },
    },
  },
});
