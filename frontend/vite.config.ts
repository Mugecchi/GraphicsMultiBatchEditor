import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['tarp.cyngfps.com', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8812',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://127.0.0.1:8812',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: ['tarp.cyngfps.com', 'localhost', '127.0.0.1'],
  },
})

