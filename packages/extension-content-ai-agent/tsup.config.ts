import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  tsconfig: '../../tsconfig.build.json',
  outDir: 'dist',
  dts: true,
  clean: true,
  sourcemap: true,
  format: ['esm', 'cjs'],
  external: ['@tiptap/core', '@tiptap/pm/state', '@tiptap/pm/view', 'diff-match-patch'],
})
