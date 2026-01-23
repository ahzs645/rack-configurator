import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/rack-configurator/' : '/',
  plugins: [react()],
  worker: {
    format: 'iife', // Use classic worker format instead of ES modules
  },
})
