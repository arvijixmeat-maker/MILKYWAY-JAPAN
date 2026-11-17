import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

export default defineConfig({
  plugins: [
    react(),
    ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 80 },
      jpg: { quality: 80 },
      webp: { quality: 80 },
    }),
  ],
  // 로컬 개발: /api 요청을 로컬 Cloudflare Functions(wrangler pages dev, 8788)로 넘긴다.
  // 로컬 D1·R2(.wrangler/state)만 쓰므로 운영 데이터에는 영향이 없다.
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:8788', changeOrigin: false },
    },
  },
  build: {
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts', '@fullcalendar/react', '@fullcalendar/core', '@fullcalendar/daygrid'],
          'vendor-utils': ['@tanstack/react-query', 'dexie', 'dexie-react-hooks'],
        }
      }
    }
  }
})
