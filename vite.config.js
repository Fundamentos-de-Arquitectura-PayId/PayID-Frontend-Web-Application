import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(() => ({
    base: '/PayID-Frontend-Web-Application/',
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    plugins: [vue()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
}))
