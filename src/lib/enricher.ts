import { seededRandom, pickOne } from "./seed";

interface EnrichOptions { hairStrands?: number; clothThreads?: number; shoeStitches?: number; seed?: string; attachContinuityToScenes?: boolean }

export function enrichFullWithBible(full: any, opts: EnrichOptions = {}){
  const { hairStrands=1200, clothThreads=1800, shoeStitches=400, seed="enrich_default", attachContinuityToScenes=true } = opts;
  const rand = seededRandom(seed);
  const cloned = JSON.parse(JSON.stringify(full||{}));

  if (Array.isArray(cloned.roster)){
    cloned.roster = cloned.roster.map((ch:any, idx:number)=> enrichCharacter(ch, idx));
  }
  if (attachContinuityToScenes && Array.isArray(cloned.scenes)){
    cloned.scenes = cloned.scenes.map((sc:any, i:number)=>({
      ...sc,
      continuity_summary: {
        locked_ids: (sc?.characters||[]).map((c:any)=>c?.ref).filter(Boolean),
        wardrobe_lock: true, voice_lock: true, gesture_lock: true,
        note: `Continuity enforced for scene ${i+1}`
      }
    }))
  }
  return cloned;

  function enrichCharacter(ch:any, idx:number){
    const baseId = String(ch?.id || `char_${idx}`);
    const outCh = { ...ch };

    const strands:any[] = [];
    for (let i=1;i<=hairStrands;i++){
      strands.push({
        id: `${baseId}_strand_${String(i).padStart(4,'0')}`,
        length_mm: round(40 + rand()*25, 2),
        thickness_mm: round(0.05 + rand()*0.04, 3),
        direction: pickOne(rand, ["forward","back","left","right","forward-left","forward-right","up-then-forward"]),
        color: pickOne(rand, ["black","black-brown","dark-brown","brown-with-copper"]),
        reflection: pickOne(rand, ["matte","soft-sheen","silky","golden-shimmer","silver-hint"]),
        movement: pickOne(rand, ["stable","light-sway","micro-vibration","soft-bounce","elastic-recoil"])
      });
    }
    setDeep(outCh, ["details","head","hair","strands"], strands);

    const clothTargets = [["clothing","shirt"],["clothing","pants"],["clothing","jacket"],["clothing","dress"]];
    clothTargets.forEach(path=>{
      const item = getDeep(outCh, path); if (!item) return;
      const threads:any[] = [];
      for (let i=1;i<=clothThreads;i++){
        threads.push({
          id: `${baseId}_${path.join('_')}_thread_${String(i).padStart(5,'0')}`,
          material: pickOne(rand,["cotton","denim","wool","polyester","linen"]),
          gauge: round(0.2 + rand()*0.5, 2),
          color: pickOne(rand,[item?.color||"#222","#111","#333","#444"]),
          tension: round(0.5 + rand()*0.5, 2),
          stitch: pickOne(rand,["lockstitch","chainstitch","zigzag","overlock"])
        })
      }
      setDeep(outCh, [...path, "threads"], threads);
    })

    const shoes = getDeep(outCh, ["clothing","shoes"]);
    if (shoes){
      const stitches:any[] = [];
      for (let i=1;i<=shoeStitches;i++){
        stitches.push({
          id: `${baseId}_shoe_stitch_${String(i).padStart(4,'0')}`,
          seam: pickOne(rand,["upper","quarter","counter","vamp","toe-cap","foxing"]),
          length_mm: round(2 + rand()*6, 2),
          thread_color: pickOne(rand,["#000","#222","#555", shoes?.color || "#111"]),
          spacing_mm: round(0.8 + rand()*1.5, 2)
        })
      }
      setDeep(outCh, ["clothing","shoes","stitches"], stitches);
    }

    return outCh;
  }

  function round(x:number,n=2){ const p=Math.pow(10,n); return Math.round(x*p)/p }
  function getDeep(obj:any, path:(string|number)[]){ return path.reduce((acc,k)=>(acc&&typeof acc==='object')?acc[k]:undefined, obj) }
  function setDeep(obj:any, path:(string|number)[], value:any){ let cur=obj; for(let i=0;i<path.length-1;i++){ const k=path[i]; if(!cur[k]||typeof cur[k]!=="object") cur[k]={}; cur=cur[k]; } cur[path[path.length-1]] = value }
}
