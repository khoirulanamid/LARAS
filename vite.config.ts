import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Wajib: sesuaikan dengan nama repo GitHub Pages-mu
export default defineConfig({
  plugins: [react()],
  base: '/LARAS/'
})
