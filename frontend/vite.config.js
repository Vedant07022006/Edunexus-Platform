import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        timeout: 300000,       // 5 min — AssemblyAI transcription can take several minutes
        proxyTimeout: 300000,  // match the timeout for the proxy connection itself
      },
    },
  },
})
