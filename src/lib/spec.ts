export type StyleKey = "Marvel" | "Pixar" | "Anime" | "Cartoon" | "Real Film";

export const STYLE_PROFILES: Record<StyleKey, any> = {
  Marvel: {
    grading: "epic, high contrast, cool shadows + warm key",
    palette: [{name:"hero",value:"#1E90FF"},{name:"fire",value:"#FF4500"},{name:"tech",value:"#C0C0C0"},{name:"shadow",value:"#0B1220"}],
    lens_default: "anamorphic 40mm",
    music_global: ["orchestral heroic", "big drums"],
    sfx_global: ["whoosh", "debris rumble", "metal clank"]
  },
  Pixar: {
    grading: "bright, warm, family-friendly contrast",
    palette: [{name:"sun",value:"#FDBA74"},{name:"sky",value:"#60A5FA"},{name:"leaf",value:"#34D399"},{name:"shadow",value:"#0B1220"}],
    lens_default: "35mm cinematic",
    music_global: ["warm strings", "light percussion"],
    sfx_global: ["soft footsteps", "playful whoosh"]
  },
  Anime: {
    grading: "pastel + sharp contrast highlights",
    palette: [{name:"sakura",value:"#F472B6"},{name:"aqua",value:"#22D3EE"},{name:"ink",value:"#111827"}],
    lens_default: "28mm stylized",
    music_global: ["anime orchestral", "percussive build"],
    sfx_global: ["cel whoosh", "impact light"]
  },
  Cartoon: {
    grading: "vivid saturation, playful contrast",
    palette: [{name:"primary",value:"#3B82F6"},{name:"accent",value:"#F59E0B"},{name:"joy",value:"#10B981"}],
    lens_default: "30mm toon",
    music_global: ["comedy light", "quirky mallets"],
    sfx_global: ["boing", "slide whistle", "pop"]
  },
  "Real Film": {
    grading: "filmic, neutral with subtle teal & orange",
    palette: [{name:"skin",value:"#E5B299"},{name:"teal",value:"#2DD4BF"},{name:"shadow",value:"#0B1220"}],
    lens_default: "50mm cine / telephoto for close-ups",
    music_global: ["cinematic ambient", "dramatic pulses"],
    sfx_global: ["room tone", "cloth rustle", "foley steps"]
  }
};
