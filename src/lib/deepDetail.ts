export type CharacterSpec = {
  id: string;
  name: string;
  role: "main" | "support" | "background";
  age?: string;
  gender?: string;
  look?: string;
  outfit?: string;
  palette?: string[];
  height_cm?: number;
};

export function makeUltraDetail(spec: CharacterSpec) {
  // Ringkas tapi konsisten, bisa diperluas nanti
  return [
    id:${spec.id},
    nama:${spec.name},
    peran:${spec.role},
    usia:${spec.age ?? "-"},
    gender:${spec.gender ?? "-"},
    look:${spec.look ?? "-"},
    outfit:${spec.outfit ?? "-"},
    tinggi:${spec.height_cm ?? 0}cm,
    warna:${(spec.palette ?? []).join(",")}
  ].join(" | ");
}