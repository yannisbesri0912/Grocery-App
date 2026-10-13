// Historique des prix des produits de l'app (data/history.json), un point par jour :
//   { dates: ['AAAA-MM-JJ', …], p: { idProduit: { enseigne: [prix | null, …] } } }
// Les tableaux de prix sont alignés sur `dates`. On garde 180 jours.

export const KEEP_DAYS = 180;
const DAY = 86400000;

/** Ajoute (ou remplace) les prix d'un jour. prices : { idProduit: { enseigne: prix } } */
export function addDay(hist, date, prices) {
  const h = { dates: [...(hist?.dates ?? [])], p: structuredClone(hist?.p ?? {}) };
  let i = h.dates.indexOf(date);
  if (i < 0) {
    // Insertion à sa place (les rattrapages peuvent arriver dans le désordre).
    i = h.dates.findIndex((d) => d > date);
    if (i < 0) i = h.dates.length;
    h.dates.splice(i, 0, date);
    for (const byChain of Object.values(h.p)) for (const arr of Object.values(byChain)) arr.splice(i, 0, null);
  }
  for (const [pid, byChain] of Object.entries(prices)) {
    for (const [chain, price] of Object.entries(byChain)) {
      if (!(price > 0)) continue;
      h.p[pid] ??= {};
      h.p[pid][chain] ??= h.dates.map(() => null);
      h.p[pid][chain][i] = Math.round(price * 100) / 100;
    }
  }
  // Fenêtre glissante.
  const cut = h.dates.findIndex((d) => d >= new Date(new Date(h.dates.at(-1)).getTime() - KEEP_DAYS * DAY).toISOString().slice(0, 10));
  if (cut > 0) {
    h.dates = h.dates.slice(cut);
    for (const byChain of Object.values(h.p)) for (const c of Object.keys(byChain)) byChain[c] = byChain[c].slice(cut);
  }
  return h;
}

/**
 * Le prix du jour est-il un bon moment ? Compare aux prix des `days` derniers jours.
 * → { min, avg, n, low (prix le plus bas de la période et sous la moyenne), below (écart à la moyenne, 0,12 = 12 %) } ou null
 */
export function priceSignal(hist, pid, chain, price, today, days = 30) {
  const arr = hist?.p?.[pid]?.[chain];
  if (!arr || !(price > 0)) return null;
  const from = new Date(new Date(today).getTime() - days * DAY).toISOString().slice(0, 10);
  const past = hist.dates.map((d, i) => [d, arr[i]]).filter(([d, v]) => v > 0 && d >= from && d < today).map(([, v]) => v);
  if (past.length < 3) return null;
  const min = Math.min(...past);
  const avg = past.reduce((a, b) => a + b, 0) / past.length;
  const below = Math.round((1 - price / avg) * 100) / 100;
  return { min, avg: Math.round(avg * 100) / 100, n: past.length, low: price <= min + 0.001 && below >= 0.05, below };
}

// Rayons qui se gardent longtemps : on peut en acheter d'avance quand le prix est bas.
// (indices de CATEGORIES : 4 épicerie, 5 surgelés, 6 boissons, 7 hygiène, 8 entretien, 9 bébé/animaux)
export const KEEPS = new Set([4, 5, 6, 7, 8, 9]);
