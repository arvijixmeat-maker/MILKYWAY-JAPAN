import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import prerender from '@prerenderer/rollup-plugin'
import PuppeteerRenderer from '@prerenderer/renderer-puppeteer'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    prerender({
      routes: ['/', '/products', '/travel-guide', '/faq'],
      renderer: new PuppeteerRenderer({
        renderAfterTime: 2000,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }),
      staticDir: path.join(__dirname, 'dist'),
      fallback: 'index.html',
    })
  ],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts': ['recharts', '@fullcalendar/react', '@fullcalendar/core', '@fullcalendar/daygrid'],
          'vendor-utils': ['@tanstack/react-query', 'dexie', 'dexie-react-hooks'],
        }
      }
    }
  }
})
