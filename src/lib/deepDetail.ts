export function buildAnatomy(_: any) {
  return {
    eyes: { iris: "emerald", pupil: "round", sclera: "clean white", blink_rate: "natural" },
    brows: { shape: "soft arch", dynamics: "expressive" },
    mouth: { teeth: "clean small", lip_shape: "childlike", viseme_lock: true },
    hair_fur: { type: "short smooth", dynamics: "wind reactive" },
    skin_fur: { tone: "warm orange", micro_detail: "fine fur highlights" },
    body: { proportion: "child", height_cm: 110, breathing: "subtle", fingers: "5 normal" }
  };
}
export function buildWardrobe(_: any) {
  return { top: "blue tee", bottom: "shorts", accessory: "small bell collar", color_detail: "primary blue #3B82F6, accent #F59E0B" };
}
export function buildPhysiology(_: any) {
  return { locomotion: "natural run", hand_motion: "secondary follow-through", cloth_sim: "light wind", eye_saccade: "childlike curiosity" };
}
export function buildEnvironment(_: any) {
  return { base: "playground", sky: "blue with soft clouds", ground: "green grass wetness subtle", air: "light dust motes" };
}
export function buildMicroFX(style: string) {
  const common = ["dust motes", "soft wind sway", "sun glitter"];
  if (style === "Marvel") return common.concat(["hero sparks tiny"]);
  if (style === "Pixar") return common.concat(["bokeh friendly"]);
  if (style === "Anime") return common.concat(["speed lines subtle"]);
  if (style === "Real Film") return common.concat(["lens micro flare"]);
  return common;
}
