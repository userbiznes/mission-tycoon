import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Relative base so the build works at any GitHub Pages path (/<repo>/) and locally.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
  },
  server: { host: true, port: 5173 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
