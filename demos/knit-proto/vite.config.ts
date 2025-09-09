import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  resolve: {
    alias: [
      {
        find: '@tiptap/core/jsx-runtime',
        replacement: path.resolve(
          __dirname,
          '../../packages/core/dist/jsx-runtime/jsx-runtime.js',
        ),
      },
      {
        find: '@tiptap/core',
        replacement: path.resolve(
          __dirname,
          '../../packages/core/dist/index.js',
        ),
      },
    ],
  },
  build: {
    minify: false,
    sourcemap: true,
  },
  optimizeDeps: {
    exclude: ['@tiptap/core/jsx-runtime', '@tiptap/core'],
    include: ['@huggingface/transformers'],
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
