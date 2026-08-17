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
// One entry per page. Each interior page lives in its own directory, which is
// what gives it a trailing-slash URL matching the live site, with no server
// rewrite rules (which Pages doesn't offer anyway).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        about: resolve(root, 'about/index.html'),
        contact: resolve(root, 'contact/index.html'),
      },
    },
  },
})
