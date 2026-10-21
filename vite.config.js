import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import xenuProxy from './proxy/vite-plugin.mjs'

export default defineConfig({
  plugins: [react(), xenuProxy()],
  server: {
    port: 5173,
    // /xenu-proxy mounted by the plugin: same-origin server-side fetch, no CORS
  }
})
