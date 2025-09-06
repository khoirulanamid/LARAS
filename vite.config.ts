import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Sesuaikan base dengan nama repo Pages
export default defineConfig({
  plugins: [react()],
  base: '/LARAS/'
})
