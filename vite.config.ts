import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// VITE_BASE_PATH is injected by the GitHub Actions deploy workflow so that
// assets resolve correctly under the repo sub-path on GitHub Pages
// (e.g. /apartment-investment-analyzer/).  Locally it is always '/'.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? '/',
})
