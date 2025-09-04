import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Ganti 'laras-cinematic-pro' sesuai nama repo GitHub kamu
const base = process.env.GHP_BASE || '/laras-cinematic-pro/'

export default defineConfig({
  plugins: [react()],
  base,
})
