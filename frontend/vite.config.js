import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['tslib', 'echarts', 'echarts-for-react']
  },
  server: {
    watch: {
      usePolling: true
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
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