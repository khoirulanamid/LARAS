import { useEffect, useMemo, useState } from 'react'
import { callGeminiStrict } from '../lib/aiClient'

type OutShape = { full:any; per_scene:any[]; __meta?: { attempts: { modelTried:string; switched?:boolean; reason?:string }[] } }

function copy(text: string) { navigator.clipboard.writeText(text) }
function download(name: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob); const a = document.createElement('a')
  a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)
}

export default function SmartLarasCinematicPro() {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gemini-1.5-pro')
  const [title, setTitle] = useState('Kartun Edukasi Anak: Menjaga Lingkungan')
  const [scenes, setScenes] = useState(20)
  const [secPerScene, setSecPerScene] = useState(8)
  const [designId, setDesignId] = useState('kids_enviro_v1')
  const [seed, setSeed] = useState('782364')
  const [mainChars, setMainChars] = useState('Ari, Beni, Citra')
  const [support, setSupport] = useState('Kucing Piko; Burung kecil; Tetangga Pak Tani')
  const [locations, setLocations] = useState('Rumah Ari; Rumah Beni; Rumah Citra; SD 05; Taman kota; Jalan depan rumah')
  const [userNotes, setUserNotes] = useState('Fokus edukasi: hemat air & buang sampah di tempatnya. Humor sopan. Tanpa kekerasan.')

  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'full'|'per'>('full')
  const [out, setOut] = useState<OutShape|null>(null)
  const [error, setError] = useState<string|undefined>()
  const [modelUsed, setModelUsed] = useState<string>('')
  const [switchNote, setSwitchNote] = useState<string>('')

  useEffect(() => { const k = localStorage.getItem('GEMINI_KEY'); if (k) setApiKey(k) }, [])
  function saveKey(k:string){ setApiKey(k); localStorage.setItem('GEMINI_KEY', k) }

  const canGo = useMemo(() =>
    apiKey.trim().length>20 && scenes>0 && secPerScene>0 && title.trim().length>2, [apiKey, scenes, secPerScene, title])

  function buildPrompt(){
    return `
Kamu adalah "LARAS Story Orchestrator".
OUTPUT KETAT: JSON saja { "full":{...}, "per_scene":[...] }.
Wajib ${scenes} scene; durasi tiap scene ${secPerScene} detik; ID karakter & lokasi konsisten.

### LOCK
design_id="${designId}", seed="${seed}", look_lock={face:true,body:true,clothes:true,colors:true}
- Kunci sifat visual: rambut, muka, mata (warna+pupil), hidung, telinga, tangan, tubuh, kaki, baju (model+hex), celana/rok (model+hex), sepatu.
- Karakter dan lokasi punya id persisten: contoh char_ari, loc_rumah_ari.

### METADATA
judul="${title}"
karakter_utama=${mainChars}
pendamping_hewannya=${support}
lokasi=${locations}
catatan="${userNotes}"

### AUDIO & KAMERA
Audio global filmic, musik ramah anak, SFX relevan. Kamera tulis per scene (frame, lensa, movement, composition).
Dialog edukatif & sopan.

### BENTUK
{
 "full": {
   "version":"3.0","schema":"laras.story",
   "consistency":{"lock":true,"design_id":"${designId}","seed":"${seed}","look_lock":{"face":true,"body":true,"clothes":true,"colors":true}},
   "roster":[ /* daftar karakter lengkap dgn warna hex & pakaian */ ],
   "locations":[ /* daftar lokasi lengkap */ ],
   "audio":{"mix_profile":"film","music_global":["..."],"sfx_global":["langkah_kaki","kicau_burung"]},
   "scenes":[
     {"id":"S001","durationSec":${secPerScene},"camera":{"frame":"...","lens":"28mm","movement":"...","composition":"rule_of_thirds"},"location_id":"loc_rumah_ari","characters":[{"ref":"char_ari","pose":"...","expression":"...","action":"..."}],"dialog":[{"ref":"char_ari","text":"..."}],"sfx":["..."],"music_cue":"...","notes":""}
     // total ${scenes} scene
   ]
 },
 "per_scene":[ /* salin scene satu-per-item */ ]
}
`.trim()
  }

  async function onGenerate(){
    try{
      setLoading(true); setError(undefined); setOut(null); setModelUsed(''); setSwitchNote('')
      const data = await callGeminiStrict({ apiKey, model, prompt: buildPrompt() }) as OutShape
      if (!data?.full || !Array.isArray(data?.per_scene)) throw new Error('Output tidak sesuai bentuk { full, per_scene }')
      setOut(data)
      // baca meta attempt untuk indikator switch
      const attempts = data.__meta?.attempts || []
      if (attempts.length){
        setModelUsed(attempts[attempts.length-1].modelTried)
        const switched = attempts.find(a=>a.switched)
        if (switched) setSwitchNote(`Model otomatis berpindah (${attempts.map(a=>a.modelTried).join(' → ')})${switched.reason ? ` karena ${switched.reason}`:''}`)
      }
    }catch(e:any){
      setError(e?.message || 'Unknown error')
    }finally{ setLoading(false) }
  }

  const outTextFull = useMemo(()=> out ? JSON.stringify(out.full, null, 2) : '', [out])
  const outTextPer = useMemo(()=> out ? JSON.stringify(out.per_scene, null, 2) : '', [out])

  return (
    <div className="card">
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
        <div style={{fontWeight:900, letterSpacing:.3, fontSize:18}}>Story Controls</div>
        <div className="row">
          {modelUsed && <span className="badge">Model: {modelUsed}</span>}
          <button className="button" disabled={!canGo || loading} onClick={onGenerate}>
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>
      {switchNote && <div className="note" style={{marginTop:6}}>⚠️ {switchNote}</div>}

      <div className="grid" style={{marginTop:12}}>
        <div>
          <div className="kv">
            <label>Gemini API Key</label>
            <input type="text" placeholder="AIza..." value={apiKey} onChange={e=>{saveKey(e.target.value)}} />
            <small className="helper">Disimpan lokal (localStorage).</small>

            <label>Model awal</label>
            <input type="text" value={model} onChange={e=>setModel(e.target.value)} />

            <label>Judul</label>
            <input type="text" value={title} onChange={e=>setTitle(e.target.value)} />

            <label>Jumlah Scene</label>
            <input type="number" value={scenes} min={1} onChange={e=>setScenes(parseInt(e.target.value||'1'))} />

            <label>Detik per Scene</label>
            <input type="number" value={secPerScene} min={1} onChange={e=>setSecPerScene(parseInt(e.target.value||'8'))} />

            <label>Design ID</label>
            <input type="text" value={designId} onChange={e=>setDesignId(e.target.value)} />

            <label>Seed</label>
            <input type="text" value={seed} onChange={e=>setSeed(e.target.value)} />

            <label>Karakter Utama</label>
            <input type="text" value={mainChars} onChange={e=>setMainChars(e.target.value)} />

            <label>Pendamping/Hewan</label>
            <input type="text" value={support} onChange={e=>setSupport(e.target.value)} />

            <label>Lokasi Utama</label>
            <input type="text" value={locations} onChange={e=>setLocations(e.target.value)} />

            <label>Catatan</label>
            <textarea value={userNotes} onChange={e=>setUserNotes(e.target.value)} />
          </div>
        </div>

        <div>
          <div className="tabs">
            <div className={`tab ${tab==='full'?'active':''}`} onClick={()=>setTab('full')}>FULL JSON</div>
            <div className={`tab ${tab==='per'?'active':''}`} onClick={()=>setTab('per')}>PER-SCENE JSON</div>
          </div>
          <div className="row" style={{marginTop:10}}>
            <button className="button secondary" disabled={!out} onClick={()=> tab==='full' ? copy(outTextFull) : copy(outTextPer)}>Copy</button>
            <button className="button ghost" disabled={!out} onClick={()=> tab==='full' ? download('full.json', out!.full) : download('per_scene.json', out!.per_scene)}>Download</button>
          </div>
          <div className="output" style={{marginTop:10}}>
            { error
              ? `❌ ${error}`
              : out
                ? (tab==='full' ? outTextFull : outTextPer)
                : 'Belum ada output. Klik Generate setelah mengisi kontrol.' }
          </div>
        </div>
      </div>
    </div>
  )
}
