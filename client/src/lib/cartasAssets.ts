export type Palo = "B" | "C" | "E" | "O";

export function cardIdToPng(id: string) {
  const key = normalizeCardIdForPngId(id);
  if (!key) return "";
  return `/cartas/${key}.png`;
}

export function backPng() {
  return `/cartas/BACK.png`;
}

function normalizeCardIdForPngId(id: string) {
  const raw = String(id || "").trim();
  if (!raw) return "";

  if (/^\d{1,2}[BCEO]$/.test(raw)) return raw;

  const m = /^([a-z]+)_(\d{1,2})$/.exec(raw.toLowerCase());
  if (!m) return raw;

  const suit = m[1];
  const rank = Number.parseInt(m[2], 10);

  const suitMap: Record<string, Palo> = {
    bastos: "B",
    copas: "C",
    espadas: "E",
    oros: "O"
  };

  const letter = suitMap[suit];
  if (!letter || !Number.isFinite(rank)) return raw;

  return `${rank}${letter}`;
}
