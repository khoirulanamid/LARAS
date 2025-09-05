// src/components/SmartLarasCinematicPro.tsx
import { useMemo, useState } from "react";
import { generateScenes, downloadText, type Scene } from "../lib/aiClient";

const STYLES = ["Marvel", "Pixar", "Anime", "Cartoon", "Real Film"] as const;
const ASPECTS = ["16:9", "9:16", "1:1"] as const;

export default function SmartLarasCinematicPro() {
  const [desc, setDesc] = useState(
    "Buat film kartun edukatif 1 menit tema kebun binatang; ceria, ramah, positif."
  );
  const [style, setStyle] = useState<(typeof STYLES)[number]>("Cartoon");
  const [aspect, setAspect] = useState<(typeof ASPECTS)[number]>("16:9");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [error, setError] = useState<string>("");

  const fullJson = useMemo(() => JSON.stringify({ scenes }, null, 2), [scenes]);

  async function onGenerate() {
    setError("");
    setLoading(true);
    setScenes([]);
    try {
      const out = await generateScenes({ apiKey, description: desc, style, aspect });
      setScenes(out);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="logo-dot" />
          <h1>LARAS Cinematic Pro — <span>AI Only</span></h1>
        </header>

        <div className="layout">
          {/* LEFT: FORM */}
          <section className="panel">
            <div className="field">
              <label>Deskripsi</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={6}
              />
            </div>

            <div className="row">
              <div className="field">
                <label>Style</label>
                <select value={style} onChange={(e) => setStyle(e.target.value as any)}>
                  {STYLES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Aspect</label>
                <select value={aspect} onChange={(e) => setAspect(e.target.value as any)}>
                  {ASPECTS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label>API Key (Gemini)</label>
              <input
                type="password"
                placeholder="AI Studio API key…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <div className="hint">
                Bisa dikosongkan jika sudah set <code>VITE_GEMINI_KEY</code>.
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={onGenerate}
              disabled={loading || !desc.trim()}
            >
              {loading ? "Generating…" : "Generate (AI)"}
            </button>

            {error && <div className="alert">{error}</div>}
          </section>

          {/* RIGHT: RESULTS */}
          <section className="panel">
            <div className="panel-head">
              <h2>Preview per Scene (≤8s)</h2>
              {scenes.length > 0 && (
                <button className="btn-link" onClick={() => copy(fullJson)}>
                  Copy Full JSON
                </button>
              )}
            </div>

            {scenes.length === 0 ? (
              <p className="muted">Belum ada scene. Klik Generate dulu.</p>
            ) : (
              <div className="scene-list">
                {scenes.map((s) => (
                  <div key={s.index} className="scene-card">
                    <div className="scene-head">
                      <div className="scene-title">
                        Scene {s.index} — {s.name} <span>({s.seconds}s)</span>
                      </div>
                      <button
                        className="btn-link"
                        onClick={() => copy(JSON.stringify(s, null, 2))}
                      >
                        Copy JSON Scene
                      </button>
                    </div>
                    <div className="scene-body">
                      <div><b>Kamera:</b> {s.camera}</div>
                      <div><b>Lingkungan:</b> {s.environment}</div>
                      <div><b>Aksi:</b> {s.action}</div>
                      {s.dialogue && <div><b>Dialog:</b> {s.dialogue}</div>}
                      <div><b>Musik:</b> {s.music_cue}</div>
                      {s.sfx?.length ? <div><b>SFX:</b> {s.sfx.join(", ")}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="divider" />

            <div className="export-row">
              <button
                className="btn"
                onClick={() => downloadText("full.json", fullJson)}
                disabled={!scenes.length}
              >
                Download Full JSON
              </button>
              <button
                className="btn"
                onClick={() =>
                  scenes.forEach((s) =>
                    downloadText(
                      'scene_${String(s.index).padStart(2, "0")}.json',
                      JSON.stringify(s, null, 2)
                    )
                  )
                }
                disabled={!scenes.length}
              >
                Download per Scene (JSON)
              </button>
              <button
                className="btn"
                onClick={() =>
                  downloadText(
                    "vo.txt",
                    scenes
                      .map(
                        (s) =>
                          'Scene ${s.index} (${s.seconds}s)\n${(s.dialogue || "").trim()}\n'
                      )
                      .join("\n")
                  )
                }
                disabled={!scenes.length}
              >
                Export VO .txt
              </button>
              <button
                className="btn"
                onClick={() =>
                  downloadText(
                    "vo.md",
                    scenes
                      .map(
                        (s) =>
                          '### Scene ${s.index} (${s.seconds}s)\n\n${(s.dialogue || "").trim()}\n'
                      )
                      .join("\n\n")
                  )
                }
                disabled={!scenes.length}
              >
                Export VO .md
              </button>
            </div>

            <h3 className="subhead">Full JSON (gabungan)</h3>
            <pre className="code">{fullJson}</pre>
          </section>
        </div>
      </div>
    </div>
  );
}