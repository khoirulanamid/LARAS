import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Ganti sesuai nama repo: /LARAS/
  base: '/LARAS/',
})
