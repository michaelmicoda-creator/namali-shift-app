import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      },
      includeAssets: ['/logo-namali-192.png', '/logo-namali-512.png', '/manifest.json'],
      devOptions: {
        enabled: false
      }
    })
  ],
  server: { port: 5173, host: true }
})