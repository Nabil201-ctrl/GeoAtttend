import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env variables from .env file
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [react({
      jsxRuntime: 'automatic', // 👈 Enable modern JSX transform
    })],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_URL, // Correct way to access .env vars here
          changeOrigin: true,
        },
      },
    },
  };
});
