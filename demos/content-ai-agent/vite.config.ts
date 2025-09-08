import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@tiptap/core/jsx-runtime': path.resolve(__dirname, '../../packages/core/dist/jsx-runtime/jsx-runtime.js'),
    },
  },
  optimizeDeps: {
    include: [
      '@tiptap/core',
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-content-ai-agent',
      '@tiptap/pm/state',
      '@tiptap/pm/view',
      '@tiptap/pm/model',
      '@tiptap/pm/transform',
      '@tiptap/pm/commands',
      '@tiptap/pm/keymap',
      '@tiptap/pm/history',
      '@tiptap/pm/inputrules',
      '@tiptap/pm/gapcursor',
      '@tiptap/pm/dropcursor',
      '@tiptap/pm/schema-basic',
      '@tiptap/pm/schema-list',
      'diff-match-patch',
    ],
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
