import React, { useEffect, useMemo, useRef, useState } from "react";
import { callGeminiAutoSwitch } from "../lib/aiClient";
import { enrichFullWithBible } from "../lib/enricher";
import { VISUAL_PRESETS, StyleProfile, styleHintFromPreset } from "../lib/presets";
import { Storyboard } from "./Storyboard";
import { downloadCsvFromScenes, openPrintableStoryboard } from "../lib/exporters";

interface OutShape { full?: any; per_scene?: any[] }

export default function SmartLarasCinematicPro(){
  // state utama
  const [apiKey, setApiKey] = useState("");
  const [title, setTitle] = useState("");
  const [scenes, setScenes] = useState<number>(8);

  // style/preset
  const [styleProfile, setStyleProfile] = useState<StyleProfile>("Pixar");
  const [visualPresetKey, setVisualPresetKey] = useState<string>("pixar_bright_kids");

  // opsi cerita & konsistensi
  const [presetCerita, setPresetCerita] = useState<"none"|"folklore_id"|"custom_pack">("folklore_id");
  const [autoConsistency, setAutoConsistency] = useState(true);

  // keluaran
  const [out, setOut] = useState<OutShape>({});
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("Ready");

  const rippleRef = useRef<HTMLSpanElement|null>(null);

  // load key tersimpan
  useEffect(()=>{ try{ const k=localStorage.getItem("LARAS_API_KEY"); if(k) setApiKey(k);}catch{} },[]);
  function saveKey(v:string){ setApiKey(v); try{ localStorage.setItem("LARAS_API_KEY", v);}catch{} }

  // bible konsistensi
  function getBible(): string { try{ return localStorage.getItem("LARAS_BIBLE")||"" }catch{ return "" } }
  function saveBible(full:any){ try{ const b=JSON.stringify({roster:full?.roster, consistency:full?.consistency}); localStorage.setItem("LARAS_BIBLE", b);}catch{} }

  // bangun prompt
  function buildPrompt(){
    const bible = getBible();
    const vp = VISUAL_PRESETS[visualPresetKey];
    const styleFromPreset = styleHintFromPreset(vp.style);

    const folkloreHint = presetCerita === 'folklore_id'
      ? `\nPILIHAN CERITA RAKYAT INDONESIA:
- Malin Kundang: malin_kundang, ibu_malin, pedagang_kapal, awak_kapal, warga_pantai.
  Lokasi: pelabuhan, dek kapal, rumah ibu, pantai berbatu. Emosi: penyesalan, amarah, sedih.`
      : '';

    const consistencyHint = autoConsistency
      ? `\nWAJIBKAN KONSISTENSI LINTAS SCENE (Character Bible):
- Roster ID stabil. Global design_id + seed + look_lock {face,body,clothes,colors}=true.
- Detail super rinci (mata, rambut hingga helai, kulit, baju/warna HEX/jahitan, sepatu/sol),
  juga suara (tone/tempo) & gerak (jalan/lari/gestur).`
      : '';

    const bibleHint = bible ? `\nGUNAKAN Character Bible lintas proyek:\n${bible}\n` : '';

    return `
KELUARKAN JSON SAJA (tanpa teks lain): { "full": { ... }, "per_scene": [ ... ] }
Judul: "${title}"
Jumlah scene: ${scenes}
Durasi/scene: 8 detik ("durationSec": 8)

VISUAL PRESET:
- name: ${vp.name}
- style: ${vp.style}
- palette: ${vp.palette.join(", ")}
- lenses: ${vp.lenses.join(", ")}
- lighting: ${vp.lighting}
- camera_mood: ${vp.cameraMood}

${folkloreHint}
${consistencyHint}
${bibleHint}

PERSYARATAN:
- Schema: {"version":"3.2","schema":"laras.story"}
- global.style: ${styleFromPreset}. Palet warna konsisten episode (gunakan ${vp.palette.join(", ")}).
- consistency: { lock:true, design_id:"story_${Date.now()}", seed:"stable_${String(scenes).padStart(3,'0')}", look_lock:{face:true,body:true,clothes:true,colors:true}}
- roster lengkap (utama & pendamping) + locations + audio.
- scenes panjang=${scenes} dengan id S001.., Scene1=Intro, SceneN=Outro.
- scene berisi camera(lens ${vp.lenses.join("/")}, movement), characters(ref pose exp action), dialog, sfx, music_cue, notes.
- per_scene: ringkas setiap scene, konsisten dengan full.scenes.`.trim();
  }

  // generate naskah JSON
  async function onGenerate(e?:React.MouseEvent){
    if (!apiKey) return alert("Isi API key dulu");
    if (!title) return alert("Isi Judul dulu");

    setLoading(true); setStatusText("Preparing prompt…");
    try {
      const prompt = buildPrompt();
      setStatusText("Contacting model… (auto-switch hidden)");
      const data: OutShape = await callGeminiAutoSwitch(apiKey, prompt, (s)=>setStatusText(s));
      // normalisasi durasi default 8 jika belum ada
      if (Array.isArray(data?.full?.scenes)) {
        data.full.scenes = data.full.scenes.map((s:any)=>({ durationSec: 8, ...s }));
      }
      setOut(data);
      if (data?.full) saveBible(data.full);
      setStatusText("Done ✅");
    } catch (err:any){
      console.error(err); setStatusText("Error"); alert(`Generate error: ${err?.message||err}`);
    } finally { setLoading(false); }
  }

  // auto ide judul + jumlah scene
  async function onAutoIdea(){
    if (!apiKey) return alert("Isi API key dulu");
    setLoading(true); setStatusText("Menyusun ide cerita…");
    try{
      const vp = VISUAL_PRESETS[visualPresetKey];
      const ideaPrompt = `
Keluarkan JSON singkat: {"title": "...", "logline": "...", "scenes": 8..20}
Tema: pendidikan anak, ramah keluarga. Gaya visual: ${vp.name} (${vp.style}).`;
      const resp:any = await callGeminiAutoSwitch(apiKey, ideaPrompt, (s)=>setStatusText(s));
      if (resp?.title) setTitle(resp.title);
      if (resp?.scenes) setScenes(Math.max(2, Math.min(50, Number(resp.scenes)||8)));
      setStatusText("Ide terpasang ✅");
    }catch(e:any){ console.error(e); setStatusText("Gagal membuat ide"); alert(e?.message||e); }
    finally{ setLoading(false); }
  }

  // enrich bible
  async function onEnrich(){
    if (!out?.full) return alert("Generate dulu agar ada FULL JSON.");
    try {
      setStatusText("Enriching Character Bible…");
      const enriched = enrichFullWithBible(out.full, {
        hairStrands: 1800, clothThreads: 2500, shoeStitches: 650,
        seed: `enrich_${Date.now()}`, attachContinuityToScenes: true
      });
      const newOut = { ...out, full: enriched };
      setOut(newOut);
      downloadJson(`${safe(title)}_FULL_ENRICHED.json`, enriched);
      setStatusText("Enriched ✅");
    } catch(e:any){ console.error(e); alert(`Enrich error: ${e?.message||e}`); }
  }

  // util download
  function downloadJson(name:string, obj:any){
    const blob = new Blob([JSON.stringify(obj,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url; a.download=name.endsWith('.json')?name:`${name}.json`; a.click(); URL.revokeObjectURL(url);
  }
  function safe(s:string){ return (s||"story").replace(/\s+/g,'_').toLowerCase() }

  // —— Storyboard handlers ——
  function handleSceneDurationChange(sceneId:string, newDur:number){
    if (!out?.full?.scenes) return;
    const nf = { ...out.full, scenes: out.full.scenes.map((s:any)=> s.id===sceneId ? {...s, durationSec:newDur} : s ) };
    setOut({ ...out, full: nf });
  }
  function handleReorderScenes(sourceId:string, targetId:string){
    if (!out?.full?.scenes) return;
    const arr = [...out.full.scenes];
    const si = arr.findIndex((s:any)=>s.id===sourceId);
    const ti = arr.findIndex((s:any)=>s.id===targetId);
    if (si<0 || ti<0) return;
    const [moved] = arr.splice(si,1);
    arr.splice(ti,0,moved);
    const nf = { ...out.full, scenes: arr };
    setOut({ ...out, full: nf });
  }

  // ripple
  function handleRipple(ev: React.MouseEvent){
    const el = rippleRef.current; if (!el) return;
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    el.style.left = `${ev.clientX - rect.left}px`; el.style.top = `${ev.clientY - rect.top}px`;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }

  // tombol export
  function onExportCSV(){
    if (!out?.full?.scenes) return alert("Belum ada scene.");
    downloadCsvFromScenes(out.full.scenes, `${safe(title)}_scenes.csv`);
  }
  function onPrintStoryboard(){
    if (!out?.full?.scenes) return alert("Belum ada scene.");
    openPrintableStoryboard(title||"Storyboard", out.full.scenes);
  }

  const presetOptions = useMemo(()=>Object.entries(VISUAL_PRESETS),[]);
  const currentPreset = VISUAL_PRESETS[visualPresetKey];

  return (
    <div className="laras-root fancy-scroll">
      <div className="card rise">
        <h2 className="title-pop">LARAS – Smart Cinematic Pro</h2>
        <p className="muted">Storyboard • Drag&Drop • Per-scene Duration • Auto Idea • Visual Presets</p>

        {/* INPUT GRID */}
        <div className="grid3">
          <div className="field">
            <label htmlFor="title">Judul</label>
            <input id="title" className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Misal: Malin Kundang" />
          </div>
          <div className="field">
            <label htmlFor="sceneCount">Jumlah Scene</label>
            <input id="sceneCount" className="input" type="number" min={2} max={50} value={scenes} onChange={e=>setScenes(Math.max(2,Math.min(50, Number(e.target.value)||8)))} />
          </div>
          <div className="field">
            <label htmlFor="style">Style</label>
            <select id="style" value={styleProfile} onChange={e=>setStyleProfile(e.target.value as StyleProfile)} className="input">
              <option value="2D">2D</option>
              <option value="3D">3D</option>
              <option value="Pixar">Pixar</option>
              <option value="Marvel">Marvel</option>
              <option value="Realistic">Realistic</option>
              <option value="Anime">Anime</option>
              <option value="Cartoon">Cartoon</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="preset">Preset Visual (10+)</label>
            <select id="preset" className="input" value={visualPresetKey} onChange={e=>setVisualPresetKey(e.target.value)}>
              {presetOptions.map(([k,v])=>(
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="consistency">Auto Konsistensi</label>
            <div className="switch">
              <input id="consistency" type="checkbox" checked={autoConsistency} onChange={e=>setAutoConsistency(e.target.checked)} />
              <label htmlFor="consistency"></label>
            </div>
          </div>

          <div className="field">
            <label htmlFor="key">Gemini API Key</label>
            <input id="key" className="input" type="password" value={apiKey} onChange={e=>saveKey(e.target.value)} placeholder="AIza..." />
          </div>
        </div>

        {/* tombol aksi */}
        <div className="btn-row">
          <button className="btn" onClick={onAutoIdea} disabled={loading}>Auto Ide Cerita</button>

          <button className="btn primary ripple" onClick={(e)=>{handleRipple(e); onGenerate(e);}} disabled={loading}>
            <span>{loading? 'Generating…' : 'Generate'}</span>
            <span ref={rippleRef} className="ripple-span"/>
          </button>

          <button className="btn" disabled={!out?.full} onClick={()=>downloadJson(`${(title||"story").replace(/\s+/g,'_')}_FULL.json`, out.full)}>Download FULL</button>
          <button className="btn" disabled={!out?.per_scene?.length} onClick={()=>downloadJson(`${(title||"story").replace(/\s+/g,'_')}_PER_SCENE.json`, out.per_scene)}>Download PER_SCENE</button>
          <button className="btn warn" disabled={!out?.full} onClick={onEnrich}>Perkaya Character Bible</button>

          <button className="btn" disabled={!out?.full?.scenes} onClick={onExportCSV}>Export CSV</button>
          <button className="btn" disabled={!out?.full?.scenes} onClick={onPrintStoryboard}>Print/Storyboard</button>
        </div>

        <div className="status-bar">
          <div className="dot"/><span>{statusText}</span>
        </div>

        {/* ringkas preset */}
        <div className="preset-note">
          <div><b>Preset:</b> {currentPreset.name}</div>
          <div><b>Palette:</b> {currentPreset.palette.join(", ")}</div>
          <div><b>Lenses:</b> {currentPreset.lenses.join(", ")}</div>
        </div>
      </div>

      {/* STORYBOARD VIEW */}
      {Array.isArray(out?.full?.scenes) && (
        <div className="card fade-in">
          <h3>Storyboard</h3>
          <Storyboard
            scenes={out.full.scenes}
            onReorder={handleReorderScenes}
            onDurationChange={handleSceneDurationChange}
          />
        </div>
      )}

      {/* JSON preview tetap ada */}
      <div className="card fade-in">
        <h3>Output JSON</h3>
        <pre className="pre">{JSON.stringify(out, null, 2)}</pre>
      </div>
    </div>
  );
}
