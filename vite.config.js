import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' keeps asset paths relative so the build works on GitHub Pages
// (both user pages and project pages) as well as any static host.
export default defineConfig({
  base: './',
  plugins: [react()],
})
