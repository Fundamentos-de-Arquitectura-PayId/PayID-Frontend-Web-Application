import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(() => ({
    // GitHub Pages serves this repository under a subpath; Vercel serves it at the domain root.
    base: process.env.VERCEL ? '/' : '/PayID-Frontend-Web-Application/',
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    plugins: [vue()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
}))
