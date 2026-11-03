import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const neonUrl = env.VITE_NEON_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL || '';

  return {
    base: './', // Ensures relative assets work on GitHub Pages, Vercel, or local IP
    plugins: [
      react(),
      tailwindcss()
    ],
    define: {
      'import.meta.env.VITE_NEON_DATABASE_URL': JSON.stringify(neonUrl),
    },
    server: {
      host: true, // Allow external devices (like iPad) on same Wi-Fi to test locally
      port: 5173
    }
  };
})
