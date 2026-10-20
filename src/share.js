// Liste partagée sans compte ni serveur : la liste voyage dans le lien, après
// le « # » (cette partie n'est jamais envoyée au serveur). Pas d'adresse dedans.
//   payload : { v: 1, l: [[id, qty], …], c: [produits perso utiles] }
// Un lien peut être fabriqué par n'importe qui : tout est revérifié (src/validate.js).
import { isId, cleanProduct } from './validate.js';

const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

/**
 * Lien de partage. custom : produits ajoutés par l'utilisateur (state.custom) ;
 * on n'envoie que ceux de la liste, sans les instantanés de prix.
 */
export function shareLink(base, list, custom = []) {
  const ids = new Set(list.map((l) => l.id));
  const c = custom.filter((p) => ids.has(p.id)).map(({ id, name, cat, ref, colruyt, shop, nutri }) => ({
    id, name, cat, ref,
    ...(colruyt ? { colruyt: { id: colruyt.id, price: colruyt.price } } : {}),
    ...(shop ? { shop: { chain: shop.chain, id: shop.id, price: shop.price, url: shop.url } } : {}),
    ...(nutri ? { nutri } : {}),
  }));
  const payload = { v: 1, l: list.filter((l) => l.qty > 0).map((l) => [l.id, l.qty]), ...(c.length ? { c } : {}) };
  return `${base.split('#')[0]}#liste=${b64(JSON.stringify(payload))}`;
}

/** Liste lue dans un lien (ou null). → { items: [{ id, qty }], custom: [...] } */
export function readShared(hash) {
  const m = String(hash ?? '').match(/[#&]liste=([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    const p = JSON.parse(unb64(m[1]));
    if (p?.v !== 1 || !Array.isArray(p.l)) return null;
    const items = p.l.slice(0, 200).filter((x) => Array.isArray(x) && isId(x[0]) && typeof x[1] === 'number' && x[1] > 0)
      .map(([id, qty]) => ({ id, qty: Math.min(99, Math.max(1, Math.round(qty))) }));
    const custom = (Array.isArray(p.c) ? p.c : []).slice(0, 200).map(cleanProduct).filter(Boolean);
    return items.length ? { items, custom } : null;
  } catch {
    return null;
  }
}
