export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function buildPerSceneTextPrompt(sceneObj: any) {
  const sc = Array.isArray(sceneObj?.scenes) ? sceneObj.scenes[0] : sceneObj?.scenes;
  if (!sc) return "";
  const who = sceneObj?.characters?.[0]?.display_name || "Narator";
  const dial = (sc.dialogue || "").replace(/^["“”]+|["“”]+$/g, "");
  const lines: string[] = [];
  lines.push(`Durasi: ${sc.seconds || 0} detik`);
  lines.push(`Dialog (${who}): ${dial || "-"}`);
  if (sc.expressions) lines.push(`Ekspresi: ${sc.expressions}`);
  if (sc.action) lines.push(`Aksi: ${sc.action}`);
  if (sc.environment?.location) lines.push(`Lokasi: ${sc.environment.location}`);
  if (Array.isArray(sc.sfx) && sc.sfx.length) lines.push("SFX: " + sc.sfx.join(", "));
  if (sc.music_cue) lines.push("Musik: " + sc.music_cue);
  return lines.filter(Boolean).join("\n");
}

/** Storyboard sederhana berbasis Canvas dan download PNG */
export function drawStoryboardToCanvasAndDownload(opts: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  title: string;
  scenes: any[];
  aspect: string;
}) {
  const canvas = opts.canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // header
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, W, 80);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px ui-sans-serif, system-ui";
  ctx.fillText(opts.title || "Storyboard", 32, 50);

  // grid gambar dummy
  const cols = 3;
  const gap = 24;
  const cellW = Math.floor((W - (gap * (cols + 1))) / cols);
  const cellH = Math.floor(cellW * (opts.aspect === "9:16" ? 16/9 : opts.aspect === "1:1" ? 1 : opts.aspect === "2.35:1" ? 1/2.35 : 9/16));

  let x = gap, y = 120;
  ctx.font = "14px ui-sans-serif, system-ui";
  ctx.fillStyle = "#111827";

  for (let i = 0; i < opts.scenes.length; i++) {
    const sc = opts.scenes[i];
    // box
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(x, y, cellW, cellH);
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cellW, cellH);

    // caption
    ctx.fillStyle = "#111827";
    const cap = `Scene ${i + 1} • ${sc?.seconds || 0}s`;
    ctx.fillText(cap, x, y + cellH + 18);

    x += cellW + gap;
    if ((i + 1) % cols === 0) { x = gap; y += cellH + 64; }
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "Storyboard.png";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}
