import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Resolve the workspace package from source so the web app and API share
      // one domain model without a separate build step.
      '@vidyagram/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VIDYAGRAM_API_URL || 'http://localhost:4000',
        changeOrigin: false,
      },
    },
  },
  preview: { port: 4173 },
  // Absolute base keeps assets working on nested client-side routes such as
  // /admin/approvals. Change this only if the whole app is served from a subpath.
  base: '/',
})
