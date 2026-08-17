import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'

// This config is loaded as ESM ("type": "module"), where __dirname is undefined.
const root = dirname(fileURLToPath(import.meta.url))

// base: './' keeps asset paths relative so the build works on GitHub Pages
// (both user pages and project pages) as well as any static host. Because of
// that, every cross-page link in the app is relative too — see linksFor() in
// src/data.js.
//
// Two entries: the landing page, and /contact/ — the directory name is what
// gives the contact page a trailing-slash URL that matches the live site,
// with no server rewrite rules (which Pages doesn't offer anyway).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        contact: resolve(root, 'contact/index.html'),
      },
    },
  },
})
