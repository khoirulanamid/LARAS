import React, { useState } from "react";

interface Scene {
  id: string;
  title?: string;
  description?: string;
  durationSec?: number;
  camera?: any;
  characters?: any[];
  dialog?: any;
  notes?: string;
}

export function Storyboard(props:{
  scenes: Scene[];
  onReorder: (sourceId:string, targetId:string)=>void;
  onDurationChange: (sceneId:string, newDur:number)=>void;
}){
  const { scenes, onReorder, onDurationChange } = props;
  const [dragId, setDragId] = useState<string>("");

  function handleDragStart(e:React.DragEvent, id:string){
    setDragId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDrop(e:React.DragEvent, targetId:string){
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain") || dragId;
    if (sourceId && sourceId !== targetId) onReorder(sourceId, targetId);
    setDragId("");
  }
  function onAllowDrop(e:React.DragEvent){ e.preventDefault(); e.dataTransfer.dropEffect = "move"; }

  return (
    <div className="storyboard-grid">
      {scenes.map((s, idx)=>(
        <div
          key={s.id || idx}
          className="sb-card"
          draggable
          onDragStart={(e)=>handleDragStart(e, s.id)}
          onDragOver={onAllowDrop}
          onDrop={(e)=>handleDrop(e, s.id)}
          title="Drag untuk pindah urutan"
        >
          <div className="sb-head">
            <div className="pill">#{String(idx+1).padStart(2,"0")}</div>
            <div className="sb-id">{s.id}</div>
          </div>

          <div className="sb-title">{s.title || "Tanpa Judul Scene"}</div>

          <div className="sb-body">
            <div className="sb-line"><b>Camera:</b> {shortCam(s.camera)}</div>
            <div className="sb-line"><b>Chars:</b> {(s.characters||[]).map((c:any)=>c?.ref||c?.id).filter(Boolean).join(", ") || "-"}</div>
            <div className="sb-desc">{s.description || s.notes || "-"}</div>
          </div>

          <div className="sb-foot">
            <label>Durasi</label>
            <input
              className="sb-input"
              type="number"
              min={1}
              max={60}
              value={s.durationSec || 8}
              onChange={e=>onDurationChange(s.id, Math.max(1, Math.min(60, Number(e.target.value)||8)))}
              />
            <span>detik</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function shortCam(cam:any){
  if (!cam) return "-";
  const lens = cam?.lens || cam?.focal || cam?.focalLength;
  const move = cam?.movement || cam?.move;
  return [lens?`${lens}mm`:null, move].filter(Boolean).join(", ");
}
