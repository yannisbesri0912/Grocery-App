// Données venues de l'extérieur (lien de liste partagée, sauvegarde importée,
// stockage du téléphone) : on ne garde que des champs connus, du bon type.
// Les identifiants servent dans le HTML : format strict, pas de guillemets ni de balises.
import { CHAINS } from './data.js';

export const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/;
export const isId = (v) => typeof v === 'string' && ID.test(v);
const isRef = (v) => isId(v) || (Number.isInteger(v) && v >= 0);
const num = (v, max = 10000) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : undefined);
const day = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 25) : undefined);
// Adresse d'un produit : https, sur le site de son enseigne.
function shopUrl(v, chain) {
  if (typeof v !== 'string') return undefined;
  try {
    const u = new URL(v);
    const domain = CHAINS[chain]?.domain;
    return u.protocol === 'https:' && domain && (u.hostname === domain || u.hostname.endsWith(`.${domain}`)) ? u.href : undefined;
  } catch { return undefined; }
}
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/** Produit ajouté par l'utilisateur → copie sûre, ou null. */
export function cleanProduct(x) {
  if (!x || typeof x !== 'object' || !isId(x.id) || typeof x.name !== 'string' || !x.name.trim()) return null;
  const p = clean({
    id: x.id, name: x.name.slice(0, 120), custom: true,
    cat: Number.isInteger(x.cat) && x.cat >= 0 && x.cat <= 9 ? x.cat : 4,
    ref: num(x.ref) ?? 2,
    nutri: typeof x.nutri === 'string' && /^[A-E]$/.test(x.nutri) ? x.nutri : undefined,
    butcher: x.butcher === true ? true : undefined,
  });
  const c = x.colruyt;
  if (c && typeof c === 'object' && isRef(c.id)) {
    p.colruyt = clean({
      id: c.id, price: num(c.price) ?? p.ref, promo: c.promo ? true : undefined, date: day(c.date), gone: c.gone === true ? true : undefined,
      walk: num(c.walk, 1e7), art: isRef(c.art) ? c.art : undefined, tech: isRef(c.tech) ? c.tech : undefined,
    });
  }
  const s = x.shop;
  if (s && typeof s === 'object' && typeof s.chain === 'string' && Object.hasOwn(CHAINS, s.chain) && isRef(s.id)) {
    p.shop = clean({
      chain: s.chain, id: s.id, price: num(s.price) ?? p.ref, promo: s.promo ? true : undefined, date: day(s.date),
      gone: s.gone === true ? true : undefined, url: shopUrl(s.url, s.chain),
    });
  }
  return p;
}

/** Ligne de liste → { id, qty, checked } ou null. */
export function cleanItem(x, extra = {}) {
  if (!x || typeof x !== 'object' || !isId(x.id)) return null;
  const qty = typeof x.qty === 'number' && Number.isFinite(x.qty) ? Math.min(99, Math.max(0, Math.round(x.qty))) : 1;
  return { ...extra, id: x.id, qty, checked: x.checked === true };
}

// Reçu conservé : texte court, montants numériques, lignes au format connu.
const str = (v, n = 160) => (typeof v === 'string' ? v.slice(0, n) : undefined);
function cleanLine(l) {
  if (!l || typeof l !== 'object' || typeof l.n !== 'string') return null;
  return clean({
    n: l.n.slice(0, 160), a: str(l.a), q: num(l.q, 999) ?? 1, t: num(l.t) ?? 0, c: typeof l.c === 'string' && Object.hasOwn(CHAINS, l.c) ? l.c : undefined,
    s: str(l.s, 120), cat: Number.isInteger(l.cat) && l.cat >= 0 && l.cat <= 9 ? l.cat : undefined, g: str(l.g, 20),
    ns: typeof l.ns === 'string' && /^[A-E]$/.test(l.ns) ? l.ns : undefined, k: str(l.k, 10), d: str(l.d, 60),
    id: isId(l.id) ? l.id : undefined,
  });
}
export function cleanReceipt(r) {
  if (!r || typeof r !== 'object' || !isId(r.id) || !day(r.date)) return null;
  return clean({
    id: r.id, date: r.date.slice(0, 10), label: str(r.label, 120), total: num(r.total, 1e5) ?? 0, paid: num(r.paid, 1e5), fees: num(r.fees, 1e4),
    lines: (Array.isArray(r.lines) ? r.lines : []).slice(0, 300).map(cleanLine).filter(Boolean),
    butcher: Array.isArray(r.butcher) ? r.butcher.slice(0, 100).map(cleanLine).filter(Boolean) : undefined,
  });
}
