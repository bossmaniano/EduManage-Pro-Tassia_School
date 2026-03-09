import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Get API URL from environment variable or use local proxy
const apiTarget = process.env.VITE_API_URL || 'http://localhost:18080';

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      }
    }
  },
})
