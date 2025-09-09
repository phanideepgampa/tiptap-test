import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@tiptap/core/jsx-runtime': path.resolve(
        __dirname,
        '../../packages/core/dist/jsx-runtime/jsx-runtime.js',
      ),
    },
  },
  optimizeDeps: {
    exclude: ['@tiptap/core/jsx-runtime'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
})
