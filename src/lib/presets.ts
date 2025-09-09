export type StyleProfile = "2D" | "3D" | "Pixar" | "Marvel" | "Realistic" | "Anime" | "Cartoon";

export interface VisualPreset {
  key: string;
  name: string;
  style: StyleProfile;
  palette: string[];        // warna utama (hex/nama)
  lenses: string[];         // pilihan lens untuk prompt
  lighting: string;         // ringkasan pencahayaan
  cameraMood: string;       // mood pergerakan kamera
}

export const VISUAL_PRESETS: Record<string, VisualPreset> = {
  // PIXAR-LIKE
  pixar_bright_kids: {
    key: "pixar_bright_kids",
    name: "Pixar Bright Kids (Cute Pastel)",
    style: "Pixar",
    palette: ["#fca311","#ffd166","#95d5b2","#8ecae6","#ffadad"],
    lenses: ["35","50","85"],
    lighting: "softbox warm, big key, soft fill, gentle rim",
    cameraMood: "friendly eye-level, slow dolly"
  },
  pixar_heroic_warm: {
    key: "pixar_heroic_warm",
    name: "Pixar Warm Heroic",
    style: "Pixar",
    palette: ["#ff7f11","#e85d04","#f48c06","#ffd166","#2d3142"],
    lenses: ["28","35","50"],
    lighting: "warm key, soft bounce, subtle rim",
    cameraMood: "slow push-in, reveal"
  },

  // MARVEL-LIKE
  marvel_urban: {
    key: "marvel_urban",
    name: "Marvel Urban (City Contrast)",
    style: "Marvel",
    palette: ["#0ea5e9","#ef4444","#111827","#64748b","#fbbf24"],
    lenses: ["28","35","70"],
    lighting: "high contrast, cool fill + warm rim",
    cameraMood: "dynamic handheld + whip pan"
  },
  marvel_cosmic: {
    key: "marvel_cosmic",
    name: "Marvel Cosmic (Vibrant)",
    style: "Marvel",
    palette: ["#7c3aed","#06b6d4","#10b981","#f59e0b","#f43f5e"],
    lenses: ["18","28","50"],
    lighting: "colorful gels, bloom highlights",
    cameraMood: "fast crane + orbit"
  },

  // ANIME
  anime_shonen: {
    key: "anime_shonen",
    name: "Anime Shonen (Energetic)",
    style: "Anime",
    palette: ["#ef4444","#f59e0b","#f97316","#2563eb","#1f2937"],
    lenses: ["35","50"],
    lighting: "cel shading, strong key, speedlines",
    cameraMood: "dutch angles, smash-zoom"
  },
  anime_ghibli_pastel: {
    key: "anime_ghibli_pastel",
    name: "Anime Ghibli Pastel",
    style: "Anime",
    palette: ["#a7c957","#8ecae6","#f9c74f","#fefae0","#90be6d"],
    lenses: ["35","50"],
    lighting: "soft ambient, painterly",
    cameraMood: "calm pans"
  },

  // REALISTIC
  realistic_docu: {
    key: "realistic_docu",
    name: "Realistic Documentary",
    style: "Realistic",
    palette: ["#94a3b8","#334155","#0f172a","#eab308","#2563eb"],
    lenses: ["35","50"],
    lighting: "natural daylight, available light",
    cameraMood: "handheld vérité"
  },
  realistic_noir: {
    key: "realistic_noir",
    name: "Realistic Cinematic Noir",
    style: "Realistic",
    palette: ["#111827","#374151","#9ca3af","#e5e7eb","#d97706"],
    lenses: ["35","70","100"],
    lighting: "low key, hard shadows",
    cameraMood: "locked + slow push"
  },

  // 2D & CARTOON & 3D
  twod_flat_pastel: {
    key: "twod_flat_pastel",
    name: "2D Flat Pastel",
    style: "2D",
    palette: ["#f1faee","#a8dadc","#457b9d","#ffcad4","#bde0fe"],
    lenses: ["35","50"],
    lighting: "flat light, bold outlines",
    cameraMood: "simple pans"
  },
  threed_claymation: {
    key: "threed_claymation",
    name: "3D Claymation (Stop-motion feel)",
    style: "3D",
    palette: ["#e76f51","#2a9d8f","#264653","#e9c46a","#f4a261"],
    lenses: ["35","85"],
    lighting: "soft tungsten practicals",
    cameraMood: "tabletop push"
  },
  cartoon_saturday: {
    key: "cartoon_saturday",
    name: "Cartoon Saturday",
    style: "Cartoon",
    palette: ["#ff6b6b","#ffd93d","#6bcB77","#4d96ff","#2b2d42"],
    lenses: ["35","50"],
    lighting: "bright flat, saturated",
    cameraMood: "quick cuts"
  }
};

export function styleHintFromPreset(style: StyleProfile){
  switch(style){
    case "2D": return "global.style.profile='2D Cartoon', flat shading, bold outlines, vibrant palette";
    case "3D": return "global.style.profile='3D', PBR materials, soft global illumination, cinematic DOF";
    case "Pixar": return "global.style.profile='Pixar-like', friendly proportions, SSS skin, warm palette";
    case "Marvel": return "global.style.profile='Marvel-like', heroic proportions, dramatic contrast, dynamic camera";
    case "Realistic": return "global.style.profile='Photoreal', accurate skin shaders, realistic cloth sim, natural lighting";
    case "Anime": return "global.style.profile='Anime', cel shading, expressive eyes, dynamic speed lines";
    default: return "global.style.profile='Cartoon', bright, sunny, friendly";
  }
}
