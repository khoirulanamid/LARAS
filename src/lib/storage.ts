export function savePreset(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
export function loadPreset<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key); 
    if (!raw) return fallback; 
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}