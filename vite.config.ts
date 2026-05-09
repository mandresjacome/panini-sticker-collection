import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Tailwind CSS v4 via plugin de Vite
  ],
  optimizeDeps: {
    // xlsx-js-style es un paquete CJS sin entry ESM — forzar pre-bundling explícito
    include: ['xlsx-js-style'],
  },
})
