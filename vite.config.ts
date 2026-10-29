import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './', // Ensures relative assets work on GitHub Pages, Vercel, or local IP
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: true, // Allow external devices (like iPad) on same Wi-Fi to test locally
    port: 5173
  }
})
