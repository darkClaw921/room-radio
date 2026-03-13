import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    allowedHosts: [
      'radio.alteran-industries.ru',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8074',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8074',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8074',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
