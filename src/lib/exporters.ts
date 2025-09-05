export type Scene = {
  index: number;
  name: string;
  seconds: number;
  dialogue?: string;
  expressions?: string;
  action?: string;
  environment?: { location?: string };
  music_cue?: string;
  sfx?: string[];
};

export function buildVOText(scenes: Scene[]): string {
  const lines: string[] = [];
  for (const sc of scenes) {
    const who = "Narator/Char";
    const dial = sc.dialogue ?? "-";
    lines.push(
      'Scene ${sc.index} — ${sc.name}',
      'Durasi: ${sc.seconds} detik',
      'Dialog (${who}): ${dial}',
      sc.expressions ? 'Ekspresi: ${sc.expressions}' : "",
      sc.action ? 'Aksi: ${sc.action}' : "",
      sc.environment?.location ? 'Lokasi: ${sc.environment.location}' : "",
      sc.music_cue ? 'Musik: ${sc.music_cue}' : "",
      sc.sfx && sc.sfx.length ? 'SFX: ${sc.sfx.join(", ")}' : "",
      '---'
    );
  }
  return lines.filter(Boolean).join("\n");
}

export function buildVOMarkdown(scenes: Scene[]): string {
  const lines: string[] = ["# VO Script per Scene", ""];
  for (const sc of scenes) {
    lines.push(
      '## Scene ${sc.index}: ${sc.name}',
      '**Durasi:** ${sc.seconds}s',
      sc.dialogue ? '**Dialog:** ${sc.dialogue}' : "*Dialog:* -",
      sc.expressions ? '**Ekspresi:** ${sc.expressions}' : "",
      sc.action ? '**Aksi:** ${sc.action}' : "",
      sc.environment?.location ? '**Lokasi:** ${sc.environment.location}' : "",
      sc.music_cue ? '**Musik:** ${sc.music_cue}' : "",
      sc.sfx && sc.sfx.length ? '**SFX:** ${sc.sfx.join(", ")}' : "",
      ""
    );
  }
  return lines.join("\n");
}

export function buildPromptPerScene(scenes: Scene[]): string[] {
  return scenes.map((sc) =>
    [
      'SCENE ${sc.index}: ${sc.name}',
      'Durasi target: ${sc.seconds}s',
      sc.action ? 'Aksi: ${sc.action}' : "",
      sc.expressions ? 'Ekspresi: ${sc.expressions}' : "",
      sc.dialogue ? 'Dialog: ${sc.dialogue}' : "",
      sc.environment?.location ? 'Lokasi: ${sc.environment.location}' : "",
      sc.music_cue ? 'Musik: ${sc.music_cue}' : "",
      sc.sfx?.length ? 'SFX: ${sc.sfx.join(", ")}' : ""
    ]
      .filter(Boolean)
      .join("\n")
  );
}