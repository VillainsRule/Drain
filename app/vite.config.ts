import { defineConfig } from 'vite'

import path from 'node:path'

import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],

    resolve: {
        alias: {
            '@': path.join(import.meta.dirname, 'src'),
            'lucide-react/icons': path.join(import.meta.dirname, 'node_modules', 'lucide-react', 'dist', 'esm', 'icons')
        }
    },

    build: {
        rollupOptions: {
            output: {
                chunkFileNames: '$/[hash].[name]js',
                entryFileNames: '$/[hash].[name].js',
                assetFileNames: '$/[hash].[name][extname]'
            }
        }
    }
})