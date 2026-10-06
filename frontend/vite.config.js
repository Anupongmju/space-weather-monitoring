import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react-router-dom',
      'lucide-react',
      'echarts',
      'echarts-for-react',
      'axios',
      'date-fns',
      'i18next',
      'react-i18next',
      'tslib',
      'zustand',
      'idb'
    ]
  },
  server: {
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**']
    },
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_TARGET || process.env.BACKEND_URL || (process.env.HOSTNAME ? 'http://backend:8000' : 'http://127.0.0.1:8000'),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('[vite proxy error]', err.message);
          });
        },
      },
      '/noaa': {
        target: 'https://services.swpc.noaa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/noaa/, ''),
      },
      '/nmdb': {
        target: 'https://www.nmdb.eu',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nmdb/, ''),
      },
      '/jpl': {
        target: 'https://ssd.jpl.nasa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/jpl/, ''),
      },
      '/sdo': {
        target: 'https://sdo.gsfc.nasa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sdo/, ''),
      }
    }
  }
})