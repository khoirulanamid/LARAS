// src/lib/exporters.ts

export function downloadText(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type: type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function buildSceneVOText(sceneObj: any): string {
  const sc = Array.isArray(sceneObj && sceneObj.scenes) ? sceneObj.scenes[0] : (sceneObj && sceneObj.scenes);
  if (!sc) return "";
  const who = (sceneObj && sceneObj.characters && sceneObj.characters[0] && sceneObj.characters[0].display_name) || "Narator";
  const dialSrc = (sc.dialogue || "");
  const dial = dialSrc.replace(/^["“”]+|["“”]+$/g, "");
  const sec = sc.seconds || 0;

  const lines: string[] = [];
  lines.push("Durasi: " + String(sec) + " detik");
  lines.push("Dialog (" + who + "): " + (dial || "-"));
  if (sc.expressions) lines.push("Ekspresi: " + String(sc.expressions));
  if (sc.action) lines.push("Aksi: " + String(sc.action));
  return lines.join("\n");
}

export function buildGlobalVOText(full: any): string {
  const scenes = (full && full.scenes) || [];
  const rows: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const dial = (s.dialogue || "").replace(/^["“”]+|["“”]+$/g, "");
    rows.push("Scene " + String(i + 1) + " (" + String(s.seconds || 0) + "s) — Dialog: " + (dial || "-"));
  }
  return rows.join("\n");
}

export function buildPerSceneTextPrompt(sceneObj: any): string {
  const sc = Array.isArray(sceneObj && sceneObj.scenes) ? sceneObj.scenes[0] : (sceneObj && sceneObj.scenes);
  const ch = (sceneObj && sceneObj.characters) || [];
  const names = ch.map(function(c:any){ return c.display_name; }).filter(function(x:any){return !!x;}).join(", ");
  const env = (sc && sc.environment && sc.environment.location) ? ("Lokasi: " + sc.environment.location + ".") : "";
  const act = (sc && sc.action) ? ("Aksi: " + sc.action + ".") : "";
  const mood = (sc && sc.music_cue) ? ("Suasana: " + sc.music_cue + ".") : "";
  const dialog = (sc && sc.dialogue) ? ("Dialog: " + sc.dialogue.replace(/^["“”]+|["“”]+$/g,"") + ".") : "";

  const parts: string[] = [];
  parts.push("Buat video pendek berdurasi " + String((sc && sc.seconds) || 0) + " detik.");
  if (names) parts.push("Karakter: " + names + ".");
  if (env) parts.push(env);
  if (act) parts.push(act);
  if (dialog) parts.push(dialog);
  if (mood) parts.push(mood);
  return parts.join(" ");
}

// ====== STORYBOARD (PNG) ======
export function drawStoryboardToCanvasAndDownload(opts: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  title?: string;
  scenes: Array<any>;
  aspect: string;
}) {
  const canvas = opts && opts.canvasRef && opts.canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const title = (opts && opts.title) || "Storyboard";
  const scenes = (opts && opts.scenes) || [];
  const aspect = (opts && opts.aspect) || "16:9";

  // background
  ctx.fillStyle = "#0B1220";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // title
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 42px system-ui, sans-serif";
  ctx.fillText(title, 40, 70);
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText("Aspect " + aspect + " — Scenes: " + String(scenes.length), 40, 100);

  // grid
  const cols = 3;
  const pad = 24;
  const gridTop = 140;
  const boxW = (canvas.width - pad * (cols + 1)) / cols;
  const rows = Math.ceil(scenes.length / cols);
  const boxH = (canvas.height - gridTop - pad * (rows + 1)) / rows;

  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.fillStyle = "rgba(255,255,255,0.06)";

  for (let idx = 0; idx < scenes.length; idx++) {
    const sc = scenes[idx];
    const c = idx % cols;
    const r = Math.floor(idx / cols);
    const x = pad + c * (boxW + pad);
    const y = gridTop + r * (boxH + pad);

    // box
    roundRect(ctx, x, y, boxW, boxH, 18);
    ctx.fill();
    ctx.stroke();

    // labels
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.fillText("Scene " + String(sc.index || (idx + 1)), x + 16, y + 34);
    ctx.font = "16px system-ui, sans-serif";
    const titleText = (sc.name || "").toString();
    drawMultiline(ctx, titleText, x + 16, y + 60, boxW - 32, 22, 2);

    // duration badge
    const badge = String(sc.seconds || 0) + "s";
    const tw = ctx.measureText(badge).width + 24;
    const bh = 28;
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    roundRect(ctx, x + boxW - tw - 16, y + 16, tw, bh, 12);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(badge, x + boxW - tw - 16 + 12, y + 36);

    // vignette
    const grad = ctx.createRadialGradient(x + boxW / 2, y + boxH / 2, 10, x + boxW / 2, y + boxH / 2, Math.max(boxW, boxH));
    grad.addColorStop(0, "rgba(255,255,255,0.04)");
    grad.addColorStop(1, "rgba(255,255,255,0.0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, boxW, boxH);

    // reset fill/stroke
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
  }

  // download
  canvas.toBlob(function(blob){
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Storyboard_" + String(Date.now()) + ".png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function roundRect(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number, r:number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawMultiline(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3
) {
  const words = (text || "").split(/\s+/);
  let line = "";
  const lines: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const test = line ? (line + " " + w) : w;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line) lines.push(line);
  const use = lines.slice(0, maxLines);
  for (let i = 0; i < use.length; i++) {
    ctx.fillText(use[i], x, y + i * lineHeight);
  }
}