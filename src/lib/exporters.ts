// src/lib/exporters.ts

export function downloadText(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function buildSceneVOText(sceneObj: any): string {
  const sc = Array.isArray(sceneObj?.scenes) ? sceneObj.scenes[0] : sceneObj?.scenes;
  if (!sc) return "";
  const who = (sceneObj?.characters?.[0]?.display_name) || "Narator";
  const dial = (sc.dialogue || "").replace(/^["“”]+|["“”]+$/g,"");
  const sec = sc.seconds || 0;
  return [
    Durasi: ${sec} detik,
    Dialog (${who}): ${dial || "-"},
    sc.expressions ? Ekspresi: ${sc.expressions} : "",
    sc.action ? Aksi: ${sc.action} : "",
  ].filter(Boolean).join("\n");
}

export function buildGlobalVOText(full: any): string {
  const scenes = full?.scenes || [];
  const rows = scenes.map((s: any, i: number) => {
    const dial = (s.dialogue || "").replace(/^["“”]+|["“”]+$/g,"");
    return Scene ${i+1} (${s.seconds||0}s) — Dialog: ${dial || "-"};
  });
  return rows.join("\n");
}

export function buildPerSceneTextPrompt(sceneObj: any): string {
  const sc = Array.isArray(sceneObj?.scenes) ? sceneObj.scenes[0] : sceneObj?.scenes;
  const ch = sceneObj?.characters || [];
  const names = ch.map((c:any)=>c.display_name).filter(Boolean).join(", ");
  const env = sc?.environment?.location ? Lokasi: ${sc.environment.location}. : "";
  const act = sc?.action ? Aksi: ${sc.action} : "";
  const mood = sc?.music_cue ? Suasana: ${sc.music_cue}. : "";
  const dialog = sc?.dialogue ? Dialog: ${sc.dialogue.replace(/^["“”]+|["“”]+$/g,"")} : "";
  return [
    Buat video pendek berdurasi ${sc?.seconds||0} detik.,
    names ? Karakter: ${names}. : "",
    env, act, dialog, mood
  ].filter(Boolean).join(" ");
}

// ====== STORYBOARD (PNG) ======
export function drawStoryboardToCanvasAndDownload(opts: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  title?: string;
  scenes: Array<any>;
  aspect: string;
}) {
  const { canvasRef, title = "Storyboard", scenes, aspect } = opts;
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // background
  ctx.fillStyle = "#0B1220";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // title
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 42px system-ui, sans-serif";
  ctx.fillText(title, 40, 70);
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText(Aspect ${aspect} — Scenes: ${scenes.length}, 40, 100);

  // grid
  const cols = 3;
  const pad = 24;
  const gridTop = 140;
  const boxW = (canvas.width - pad*(cols+1)) / cols;
  const rows = Math.ceil(scenes.length / cols);
  const boxH = (canvas.height - gridTop - pad*(rows+1)) / rows;

  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.fillStyle = "rgba(255,255,255,0.06)";

  scenes.forEach((sc, idx) => {
    const c = idx % cols;
    const r = Math.floor(idx / cols);
    const x = pad + c*(boxW+pad);
    const y = gridTop + r*(boxH+pad);

    // box
    roundRect(ctx, x, y, boxW, boxH, 18);
    ctx.fill();
    ctx.stroke();

    // labels
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.fillText(Scene ${sc.index}, x+16, y+34);
    ctx.font = "16px system-ui, sans-serif";
    const title = (sc.name || "").toString();
    drawMultiline(ctx, title, x+16, y+60, boxW-32, 22, 2);

    // duration badge
    const badge = ${sc.seconds||0}s;
    const tw = ctx.measureText(badge).width + 24;
    const bh = 28;
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    roundRect(ctx, x+boxW-tw-16, y+16, tw, bh, 12); ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(badge, x+boxW-tw-16+12, y+36);

    // vignette
    const grad = ctx.createRadialGradient(x+boxW/2, y+boxH/2, 10, x+boxW/2, y+boxH/2, Math.max(boxW,boxH));
    grad.addColorStop(0, "rgba(255,255,255,0.04)");
    grad.addColorStop(1, "rgba(255,255,255,0.0)");
    ctx.fillStyle = grad; ctx.fillRect(x,y,boxW,boxH);

    // reset fill/stroke
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
  });

  // download
  canvas.toBlob((blob)=>{
    if(!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = Storyboard_${Date.now()}.png;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function roundRect(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number, r:number) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

function drawMultiline(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3
) {
  const words = text.split(/\s+/);
  let line = "";
  let lines: string[] = [];
  for (let w of words) {
    const test = line ? ${line} ${w} : w;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      lines.push(line);
      line = w;
      if (lines.length === maxLines-1) break;
    }
  }
  if (line) lines.push(line);
  lines.slice(0,maxLines).forEach((ln, i)=>ctx.fillText(ln, x, y + i*lineHeight));
}