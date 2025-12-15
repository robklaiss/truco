let _cache = null;

export async function loadCardsMeta() {
  if (_cache) return _cache;

  const urls = [
    "/cards/cards.json",
    "/cards.json"
  ];

  let lastErr = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        lastErr = new Error(`Failed to load ${url}: HTTP ${res.status}`);
        continue;
      }
      const json = await res.json();
      if (!Array.isArray(json)) {
        lastErr = new Error(`Invalid cards JSON from ${url}`);
        continue;
      }
      _cache = json;
      return _cache;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Unable to load cards meta");
}

export async function getCardMetaById() {
  const arr = await loadCardsMeta();
  const map = new Map();
  for (const c of arr) {
    if (c && c.cardId) map.set(c.cardId, c);
  }
  return map;
}
