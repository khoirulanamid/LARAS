// src/lib/deepDetail.ts
// Ultra-detail builders: anatomy, wardrobe, physiology, environment, micro-FX

export type AnatomyDetail = {
  height_cm?: number;
  body_type?: string;
  skin_tone?: string;
  facial: {
    eyes: { shape?: string; iris_color?: string; pupil_shape?: string; sclera_tint?: string; eyelashes?: string };
    eyebrows?: { shape?: string; thickness?: string; density?: string };
    nose?: { shape?: string; bridge?: string; nostril?: string };
    mouth?: { lip_shape?: string; teeth?: string; tongue?: string };
    jawline?: string;
    cheek?: string;
    ear?: { shape?: string; lobe?: string; helix?: string };
  };
  hair: { style?: string; length?: string; color?: string; strand_detail?: string; dynamics?: string };
  hands: { fingernails?: string; knuckle_detail?: string; finger_proportion?: string };
  feet: { toenails?: string; ankle_detail?: string };
  muscle_definition?: string;
  curvature_detail?: string;
};

export type WardrobeDetail = {
  top?: { type?: string; color?: string; color_detail?: string; material?: string; texture?: string; fit?: string; pattern?: string; trim?: string };
  bottom?: { type?: string; color?: string; color_detail?: string; material?: string; texture?: string; fit?: string; pattern?: string; hem?: string };
  footwear?: { type?: string; color?: string; material?: string; sole?: string; laces?: string };
  accessories?: string[];
};

export type PhysiologyDetail = {
  breathing?: { style?: string; cadence?: string; chest_motion?: string };
  gait?: { style?: string; cadence?: string; foot_impact?: string; hip_shift?: string };
  speech?: { style?: string; articulation?: string; speed?: string; warmth?: string };
  micro_facial?: string[];
  cloth_sim?: string;
};

export type EnvDetail = {
  sky?: { type?: string; cloud?: string; color?: string; sun_angle?: string; haze?: string };
  air?: { dust?: string; pollen?: string; moisture?: string };
  lighting?: { key?: string; fill?: string; rim?: string; volumetric?: string; bounce?: string; color_grade?: string };
  ground?: { material?: string; wetness?: string; reflection?: string };
  flora?: string[];
  fauna?: string[];
  props?: string[];
  ambient_sfx?: string[];
  particles?: string[];
};

const SAFE = (s?: string) => (s && s.trim().length ? s : undefined);

export function buildAnatomy(seed: Partial<AnatomyDetail> = {}): AnatomyDetail {
  return {
    height_cm: seed.height_cm ?? 120,
    body_type: SAFE(seed.body_type) ?? "child-proportion, soft anatomy",
    skin_tone: SAFE(seed.skin_tone) ?? "#F6C89F",
    facial: {
      eyes: {
        shape: seed.facial?.eyes?.shape ?? "large round",
        iris_color: seed.facial?.eyes?.iris_color ?? "green vibrant",
        pupil_shape: seed.facial?.eyes?.pupil_shape ?? "round",
        sclera_tint: seed.facial?.eyes?.sclera_tint ?? "clean white",
        eyelashes: seed.facial?.eyes?.eyelashes ?? "subtle short",
      },
      eyebrows: {
        shape: seed.facial?.eyebrows?.shape ?? "soft arc",
        thickness: seed.facial?.eyebrows?.thickness ?? "light",
        density: seed.facial?.eyebrows?.density ?? "even",
      },
      nose: {
        shape: seed.facial?.nose?.shape ?? "small cute",
        bridge: seed.facial?.nose?.bridge ?? "soft",
        nostril: seed.facial?.nose?.nostril ?? "small rounded",
      },
      mouth: {
        lip_shape: seed.facial?.mouth?.lip_shape ?? "soft heart",
        teeth: seed.facial?.mouth?.teeth ?? "clean small, even spacing",
        tongue: seed.facial?.mouth?.tongue ?? "subtle pink",
      },
      jawline: seed.facial?.jawline ?? "gentle",
      cheek: seed.facial?.cheek ?? "slight rosy",
      ear: {
        shape: seed.facial?.ear?.shape ?? "small rounded",
        lobe: seed.facial?.ear?.lobe ?? "attached",
        helix: seed.facial?.ear?.helix ?? "smooth",
      },
    },
    hair: {
      style: seed.hair?.style ?? "short kitten-fur style",
      length: seed.hair?.length ?? "short",
      color: seed.hair?.color ?? "orange ginger",
      strand_detail: seed.hair?.strand_detail ?? "visible soft strands",
      dynamics: seed.hair?.dynamics ?? "light wind sway",
    },
    hands: {
      fingernails: seed.hands?.fingernails ?? "short clean",
      knuckle_detail: seed.hands?.knuckle_detail ?? "subtle",
      finger_proportion: seed.hands?.finger_proportion ?? "child-safe proportion",
    },
    feet: {
      toenails: seed.feet?.toenails ?? "clean",
      ankle_detail: seed.feet?.ankle_detail ?? "subtle",
    },
    muscle_definition: seed.muscle_definition ?? "very subtle",
    curvature_detail: seed.curvature_detail ?? "gentle child curvature",
  };
}

export function buildWardrobe(seed: Partial<WardrobeDetail> = {}): WardrobeDetail {
  return {
    top: {
      type: seed.top?.type ?? "t-shirt",
      color: seed.top?.color ?? "#2563EB",
      color_detail: seed.top?.color_detail ?? "cool blue with soft highlights",
      material: seed.top?.material ?? "cotton knit",
      texture: seed.top?.texture ?? "fine weave",
      fit: seed.top?.fit ?? "relaxed",
      pattern: seed.top?.pattern ?? "plain",
      trim: seed.top?.trim ?? "soft ribbed collar",
    },
    bottom: {
      type: seed.bottom?.type ?? "shorts",
      color: seed.bottom?.color ?? "#F59E0B",
      color_detail: seed.bottom?.color_detail ?? "warm amber with soft shading",
      material: seed.bottom?.material ?? "cotton twill",
      texture: seed.bottom?.texture ?? "subtle diagonal weave",
      fit: seed.bottom?.fit ?? "easy fit",
      pattern: seed.bottom?.pattern ?? "plain",
      hem: seed.bottom?.hem ?? "double stitch",
    },
    footwear: {
      type: seed.footwear?.type ?? "sneakers",
      color: seed.footwear?.color ?? "#ffffff",
      material: seed.footwear?.material ?? "canvas",
      sole: seed.footwear?.sole ?? "rubber soft",
      laces: seed.footwear?.laces ?? "flat white",
    },
    accessories: seed.accessories ?? ["small bell collar"],
  };
}

export function buildPhysiology(seed: Partial<PhysiologyDetail> = {}): PhysiologyDetail {
  return {
    breathing: {
      style: seed.breathing?.style ?? "calm",
      cadence: seed.breathing?.cadence ?? "steady 8-10 cpm",
      chest_motion: seed.breathing?.chest_motion ?? "subtle rise/fall",
    },
    gait: {
      style: seed.gait?.style ?? "playful run & hop",
      cadence: seed.gait?.cadence ?? "light quick steps",
      foot_impact: seed.gait?.foot_impact ?? "soft heel-toe",
      hip_shift: seed.gait?.hip_shift ?? "subtle",
    },
    speech: {
      style: seed.speech?.style ?? "cheerful child",
      articulation: seed.speech?.articulation ?? "clear, rounded vowels",
      speed: seed.speech?.speed ?? "moderate",
      warmth: seed.speech?.warmth ?? "friendly",
    },
    micro_facial: seed.micro_facial ?? [
      "gentle blinks",
      "micro-smile",
      "brow micro-raise on emphasis",
    ],
    cloth_sim: seed.cloth_sim ?? "soft fabric sway and secondary motion on steps",
  };
}

export function buildEnvironment(seed: Partial<EnvDetail> = {}): EnvDetail {
  return {
    sky: {
      type: seed.sky?.type ?? "clear noon",
      cloud: seed.sky?.cloud ?? "soft cumulus",
      color: seed.sky?.color ?? "bright blue gradient",
      sun_angle: seed.sky?.sun_angle ?? "45deg",
      haze: seed.sky?.haze ?? "very light",
    },
    air: {
      dust: seed.air?.dust ?? "few motes in sun shafts",
      pollen: seed.air?.pollen ?? "light",
      moisture: seed.air?.moisture ?? "low",
    },
    lighting: {
      key: seed.lighting?.key ?? "soft warm key",
      fill: seed.lighting?.fill ?? "gentle cool fill",
      rim: seed.lighting?.rim ?? "subtle golden rim",
      volumetric: seed.lighting?.volumetric ?? "soft godrays in foliage gaps",
      bounce: seed.lighting?.bounce ?? "grass bounce light",
      color_grade: seed.lighting?.color_grade ?? "vivid, playful contrast",
    },
    ground: {
      material: seed.ground?.material ?? "short grass",
      wetness: seed.ground?.wetness ?? "dry",
      reflection: seed.ground?.reflection ?? "none",
    },
    flora: seed.flora ?? ["grass blades", "bushes", "trees with soft leaves"],
    fauna: seed.fauna ?? ["butterflies distant", "small birds"],
    props: seed.props ?? ["play ball", "swing set", "sandbox bucket"],
    ambient_sfx: seed.ambient_sfx ?? ["kids laughter distant", "birds chirp", "soft breeze"],
    particles: seed.particles ?? ["dust motes", "leaf specks"],
  };
}

export function buildMicroFX(style: "Cartoon" | "Marvel" | "Pixar" | "Anime" | "Real Film") {
  const common = ["subtle lens breathing", "tiny chromatic sparkles on highlights"];
  if (style === "Real Film") return [...common, "film grain subtle", "gate weave micro"];
  if (style === "Marvel") return [...common, "heroic rim blooms", "micro embers on dramatic beats"];
  if (style === "Pixar") return [...common, "soft light glitter", "bokeh twinkles"];
  if (style === "Anime") return [...common, "speed-line wisps (very subtle)", "hand-drawn edge accent"];
  return [...common, "cartoon pop spark", "soft squash-stretch secondary"];
}