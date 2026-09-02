import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MiB
      },
      manifest: {
        name: 'BIB Logistics Assessment Platform',
        short_name: 'BIB Logistics',
        description: 'Penilaian kinerja berimbang & kompetensi logistik tergamifikasi',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'https://raw.githubusercontent.com/KANAN-lab/WFG-DAM/refs/heads/main/DAM%20LOGO.ico',
            sizes: '192x192',
            type: 'image/x-icon',
          },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          pdf: ['jspdf', 'jspdf-autotable'],
          icons: ['lucide-react'],
          charts: ['recharts'],
          supabase: ['@supabase/supabase-js'],
          ai: ['@google/generative-ai'],
          confetti: ['canvas-confetti'],
          dateFns: ['date-fns'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
