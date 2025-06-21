import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `${import.meta.env.VITE_API_URL}`,
        changeOrigin: true,
      },
    },
  },
});