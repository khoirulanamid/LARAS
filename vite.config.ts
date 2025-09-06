import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Sesuaikan dengan nama repo Pages-mu
export default defineConfig({
  plugins: [react()],
  base: '/LARAS/'
})
