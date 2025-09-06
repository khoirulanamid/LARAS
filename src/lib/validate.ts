export type ValidationResult = { ok: boolean; messages: string[] }

/** pemeriksaan praktis agar hasil lebih konsisten */
export function validateStory(data: any, expectedScenes?: number): ValidationResult {
  const msgs: string[] = []
  try{
    const full = data?.full; const per = data?.per_scene
    if (!full || !Array.isArray(per)) return { ok:false, messages:['Struktur tidak lengkap (full/per_scene).'] }

    const scenes: any[] = full?.scenes || []
    const roster: any[] = full?.roster || []
    const locations: any[] = full?.locations || []

    if (expectedScenes && scenes.length !== expectedScenes)
      msgs.push(`Jumlah scenes ${scenes.length} ≠ input ${expectedScenes}.`)

    if (per.length !== scenes.length)
      msgs.push(`Jumlah per_scene (${per.length}) ≠ scenes (${scenes.length}).`)

    // durasi 8 detik wajib
    scenes.forEach((s,i)=>{ if (s?.durationSec !== 8) msgs.push(`Scene ${s?.id || i+1}: durationSec=${s?.durationSec} (harus 8).`) })

    // id scene berurutan S001..Snnn
    scenes.forEach((s,i)=>{
      const target = `S${String(i+1).padStart(3,'0')}`
      if (s?.id !== target) msgs.push(`ID scene tidak berurutan: dapat ${s?.id}, seharusnya ${target}.`)
    })

    // ref karakter & lokasi harus ada
    const rosterIds = new Set((roster||[]).map((r:any)=>r?.id))
    const locIds = new Set((locations||[]).map((l:any)=>l?.id))
    scenes.forEach((s,i)=>{
      (s?.characters||[]).forEach((c:any)=>{
        if (!rosterIds.has(c?.ref)) msgs.push(`Scene ${s?.id || i+1}: ref "${c?.ref}" tidak ada di roster.`)
      })
      if (s?.location_id && !locIds.has(s.location_id))
        msgs.push(`Scene ${s?.id || i+1}: location_id "${s.location_id}" tidak ada di daftar locations.`)
    })

    // intro & outro
    if ((scenes[0]?.tag || '').toLowerCase() !== 'intro') msgs.push('Scene 1 harus bertag "Intro".')
    const last = scenes[scenes.length-1]
    if (last && (last?.tag || '').toLowerCase() !== 'outro') msgs.push('Scene terakhir harus bertag "Outro".')

    return { ok: msgs.length===0, messages: msgs }
  }catch(e:any){
    return { ok:false, messages:[`Validator error: ${e?.message || e}`] }
  }
}
