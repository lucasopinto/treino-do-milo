import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// No GitHub Pages o app fica em https://<usuario>.github.io/treino-do-milo/
// O workflow de deploy define BASE_PATH=/treino-do-milo/
const base = process.env.BASE_PATH ?? '/'
const version = process.env.npm_package_version ?? '0.0.0'

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(version) },
  // Pré-empacota o Recharts junto (é carregado sob demanda e senão gera uma 2ª cópia do React no modo dev).
  optimizeDeps: { include: ['recharts', 'react', 'react-dom', 'dexie', 'dexie-react-hooks'] },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Treino do Milo',
        short_name: 'Treino Milo',
        description: 'Treino com reforço positivo: sessões, clicker, xixi e progresso.',
        lang: 'pt-BR',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1c1917',
        theme_color: '#c2410c',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Código próprio do service worker (cliques em notificação; push na Fase 2).
        importScripts: ['sw-extra.js'],
      },
      devOptions: { enabled: false },
    }),
  ],
})
