import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => {
          // Special case for conversations to add trailing slash if needed
          if (path === '/api/conversations') {
            return '/conversations/'
          }
          return path.replace(/^\/api/, '')
        },
      },
    },
  },
})
