import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Read dynamically generated routes (could be used for standard SSG later)
let prerenderRoutes = ['/', '/products', '/travel-guide', '/faq', '/reviews', '/custom-estimate', '/travel-mates'];
try {
  const routesPath = path.resolve(__dirname, 'prerender-routes.json');
  if (fs.existsSync(routesPath)) {
    prerenderRoutes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
  }
} catch (e) {
  console.warn('Failed to load prerender-routes.json, using fallback routes');
}

export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    emptyOutDir: false,
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
