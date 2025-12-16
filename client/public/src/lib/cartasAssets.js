export function cardIdToPng(id) {
  const key = normalizeCardIdForPngId(id);
  if (!key) return "";
  return `/cartas/${encodeURIComponent(key)}.png`;
}

export function backPng() {
  return `/cartas/BACK.png`;
}

function normalizeCardIdForPngId(id) {
  const raw = String(id || "").trim();
  if (!raw) return "";

  if (/^\d{1,2}[BCEO]$/.test(raw)) return raw;

  const m = /^([a-z]+)_(\d{1,2})$/.exec(raw.toLowerCase());
  if (!m) return raw;

  const suit = m[1];
  const rank = Number.parseInt(m[2], 10);

  const suitMap = {
    bastos: "B",
    copas: "C",
    espadas: "E",
    oros: "O"
  };

  const letter = suitMap[suit];
  if (!letter || !Number.isFinite(rank)) return raw;

  return `${rank}${letter}`;
}
