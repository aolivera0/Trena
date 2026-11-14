/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // La versión nueva se activa sola; la app decide cuándo recargar (src/lib/pwa.ts)
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Trena',
        short_name: 'Trena',
        description: 'Programación y registro de entrenamientos de fuerza',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0d10',
        theme_color: '#0b0d10',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Con injectRegister: false el plugin no los activa solo: la versión
        // nueva toma el control al instalarse y src/lib/pwa.ts decide la recarga
        skipWaiting: true,
        clientsClaim: true,
        // SPA: cualquier ruta sin red sirve index.html desde la caché
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/__\//],
        runtimeCaching: [
          {
            // Ilustraciones de ejercicios (workout-guide en jsDelivr): no cambian por versión
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@bryllim\/workout-guide@/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-images',
              expiration: { maxEntries: 1000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
