import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Clarity - Wellness & Mindfulness App',
        short_name: 'Clarity',
        description: 'Your personal wellness companion for meditation, water tracking, workouts, and mental health support',
        theme_color: '#6c5ce7',
        background_color: '#f8f9fa',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any'
          }
        ],
        shortcuts: [
          {
            name: 'Start Meditation',
            short_name: 'Meditate',
            description: 'Begin a meditation session',
            url: '/meditation',
            icons: [
              {
                src: '/icons/meditation-shortcut.png',
                sizes: '96x96'
              }
            ]
          },
          {
            name: 'Log Water',
            short_name: 'Water',
            description: 'Track your water intake',
            url: '/water',
            icons: [
              {
                src: '/icons/water-shortcut.png',
                sizes: '96x96'
              }
            ]
          },
          {
            name: 'Workout',
            short_name: 'Exercise',
            description: 'Log your workout',
            url: '/workout',
            icons: [
              {
                src: '/icons/workout-shortcut.png',
                sizes: '96x96'
              }
            ]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
  root: '.',
  build: {
    outDir: 'dist'
  }
})