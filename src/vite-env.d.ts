import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GANTI 'LARAS' dengan NAMA REPO kamu
export default defineConfig({
  base: '/LARAS/', 
  plugins: [react()],
})