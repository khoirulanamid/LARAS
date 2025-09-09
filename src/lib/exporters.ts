export function downloadCsvFromScenes(scenes:any[], filename:string){
  const headers = ["index","id","title","durationSec","camera","characters","notes"];
  const rows = scenes.map((s:any, i:number)=>([
    i+1,
    quote(s.id),
    quote(s.title || ""),
    s.durationSec ?? "",
    quote(shortCam(s.camera)),
    quote((s.characters||[]).map((c:any)=>c?.ref||c?.id).filter(Boolean).join("; ")),
    quote((s.notes||s.description||"").toString().replace(/\n/g," / "))
  ]));
  const csv = [headers.join(","), ...rows.map(r=>r.join(","))].join("\n");
  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}

export function openPrintableStoryboard(title:string, scenes:any[]){
  const w = window.open("", "_blank");
  if (!w) return;
  const style = `
  <style>
    body{font-family:Inter,system-ui,Arial;background:#0b0f14;color:#e5e7eb;margin:0;padding:24px}
    h1{margin:0 0 12px 0}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .card{border:1px solid #1f2937;border-radius:12px;background:#0f172a;padding:12px}
    .pill{display:inline-block;font-size:12px;border:1px solid #334155;border-radius:999px;padding:2px 8px;color:#93c5fd}
    .id{color:#9aa4b2;font-size:12px;margin-left:8px}
    .title{font-weight:700;margin:6px 0}
    .line{font-size:12px;color:#cbd5e1}
  </style>`;
  const items = scenes.map((s:any,i:number)=>`
    <div class="card">
      <div><span class="pill">#${String(i+1).padStart(2,"0")}</span><span class="id">${s.id||""}</span></div>
      <div class="title">${escapeHtml(s.title||"Scene")}</div>
      <div class="line"><b>Durasi:</b> ${s.durationSec||8}s</div>
      <div class="line"><b>Camera:</b> ${escapeHtml(shortCam(s.camera)||"-")}</div>
      <div class="line"><b>Chars:</b> ${escapeHtml((s.characters||[]).map((c:any)=>c?.ref||c?.id).filter(Boolean).join(", ")||"-")}</div>
      <div class="line"><b>Notes:</b> ${escapeHtml(s.notes||s.description||"-")}</div>
    </div>`).join("");

  w.document.write(`<html><head><title>${escapeHtml(title)}</title>${style}</head>
  <body><h1>${escapeHtml(title)} – Storyboard</h1><div class="grid">${items}</div>
  <script>window.onload=()=>setTimeout(()=>window.print(),400)</script></body></html>`);
  w.document.close();
}

function quote(v:any){ const s=String(v??""); if (s.includes(",")||s.includes("\"")) return `"${s.replace(/"/g,'""')}"`; return s }
function shortCam(cam:any){ if(!cam) return ""; const lens=cam?.lens||cam?.focal||cam?.focalLength; const move=cam?.movement||cam?.move; return [lens?`${lens}mm`:null, move].filter(Boolean).join(", ") }
function escapeHtml(s:string){ return s.replace(/[&<>"']/g,(c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c] as string)) }
