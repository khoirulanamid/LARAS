# LARAS Cinematic Pro (Auto-Fallback)

- React + Vite + TS, siap GitHub Pages (`base: /LARAS/`)
- Engine konsistensi (design_id, seed, look_lock)
- Output ganda: **full** & **per_scene**
- Ekspor: **Copy** / **Download**
- **Auto-fallback model**: coba model awal → `gemini-1.5-flash` → `gemini-2.0-flash`
- UI indikator model dipakai & jalur switch

## Jalankan
```bash
npm ci
npm run dev
