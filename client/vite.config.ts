/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
  // Dependencies first used inside lazy routes. Pre-bundling them avoids Vite's mid-session
  // re-optimization (HTTP 504 "Outdated Optimize Dep") on a cold dev server.
  // The Nexconn SDK (~200 kB gzip) is its own chunk, loaded only when a live user opens Messages.
  build: { chunkSizeWarningLimit: 1100 },
  optimizeDeps: {
    include: ['@tanstack/react-query', 'zod', 'react-hook-form', '@hookform/resolvers/zod', 'clsx', 'lucide-react', '@nexconn/chat', '@nexconn/engine'],
  },
  server: {
    port: 5173,
    // The API server arrives in Milestone 3. Until then, requests to /api fail
    // and the UI shows a "server unavailable" state.
    proxy: {
      '/api': { target: process.env.VITE_DEV_API_TARGET ?? 'http://localhost:4000', changeOrigin: true },
    },
  },
})
