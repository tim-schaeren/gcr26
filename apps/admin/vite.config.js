import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // In development the server functions run locally (local/functions-dev.mjs)
  server: {
    proxy: { '/api': 'http://localhost:8888' },
  },
})
