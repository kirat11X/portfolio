import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Pre-bundle the 3D stack up front so the dev server never re-optimises
  // mid-session (which forced reloads and "Outdated Optimize Dep" 504s).
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing', 'postprocessing', 'troika-three-text', 'maath', 'zustand'],
  },
  build: {
    // The 3D world (with three.js) is one lazy chunk loaded behind the neon
    // loader, so its size never affects the first paint of any page.
    chunkSizeWarningLimit: 1600,
  },
  server: {
    host: true,
    allowedHosts: true,
  },
})
