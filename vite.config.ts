import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 4173 },
  // Absolute base keeps assets working on nested client-side routes such as
  // /admin/approvals. Change this only if the whole app is served from a subpath.
  base: '/',
})
