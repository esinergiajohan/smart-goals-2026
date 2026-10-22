import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API_TARGET = `http://127.0.0.1:${process.env.BRANCH_SERVER_PORT ?? 8787}`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': API_TARGET },
  },
})
