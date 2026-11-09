
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'pwa-icon.svg',
        'pwa-192.png',
        'pwa-512.png',
        'apple-touch-icon.png'
      ],
      manifest: {
        name: 'Moje recepty',
        short_name: 'Kuchařka',
        description: 'Osobní kuchařka pro vaše oblíbené recepty.',
        lang: 'cs',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#211d19',
        theme_color: '#211d19',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png,webp}']
      }
    })
  ]
})
