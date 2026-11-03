import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/PayID-Frontend-Web-Application/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    // Desactiva la generación de mapas de código y asegura un empaquetado plano seguro
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Agrupa todas las librerías de terceros en un vendor separado para evitar colisiones de parser
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://kapak-fake-api.onrender.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})