# LARAS Cinematic Pro (FIX)

- React + Vite + TypeScript
- base path sudah diset `/LARAS/` untuk GitHub Pages
- Engine prompt: konsistensi karakter & lokasi (design_id, seed, look_lock)
- Output ganda: `full` (satu objek lengkap) & `per_scene` (dipisah per item)
- Ekspor: tombol Copy & Download JSON
- Client-only: panggil Gemini langsung dari browser (API Key disimpan di localStorage)

## Jalankan Lokal
```bash
npm ci
npm run dev
