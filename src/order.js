// Panier assisté : pour chaque article d'une commande Collect, un lien qui
// ouvre directement le bon produit (ou sa recherche) sur le site du magasin.
// L'utilisateur l'ajoute lui-même au panier : aucun identifiant, aucun paiement
// ne passe par l'app.
import { RULES } from './match-rules.js';

export const SHOPS = {
  delhaize: {
    origin: 'https://www.delhaize.be',
    // Fiches lues en néerlandais : la même adresse en /fr/ s'ouvre en français.
    product: (url) => url.replace('/nl/shop/', '/fr/shop/'),
    search: (q) => `https://www.delhaize.be/fr/shop/search?text=${encodeURIComponent(q)}`,
    cart: 'https://www.delhaize.be/fr/checkout', // page « Mon panier » (vérifiée le 14 oct. 2026)
    cartLabel: 'Ouvrir mon panier Delhaize',
  },
  // Collect&Go (Colruyt) : sa recherche ne change pas l'adresse de la page, il
  // n'y a donc pas de lien direct. On copie le nom et on ouvre le site : il
  // suffit de le coller dans la barre de recherche. Ses noms d'articles sont en
  // néerlandais : on copie les mots français.
  colruyt: {
    origin: 'https://www.collectandgo.be',
    search: () => 'https://www.collectandgo.be/fr/home',
    cart: 'https://www.collectandgo.be/fr/home',
    cartLabel: 'Finaliser sur Collect&Go',
    articleSearch: false,
    copy: true,
  },
};

/** Nom d'article → texte de recherche : sans la marque maison, le format ni les détails après « | ». */
export function searchText(article) {
  return article
    .split('|')[0]
    .replace(/\b(EVERYDAY|BONI|BONI SELECTION|Delhaize|365|Taste of Inspirations)\b/gi, '')
    .replace(/[±~]?\s*\d+([.,]\d+)?\s*(x\s*\d+([.,]\d+)?\s*)?(kg|g|gr|l|cl|ml|st|pc|pièces?|stuks?)\b\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- Liens directs appris (Collect&Go) ----------
// Le format des adresses de produits Collect&Go n'est pas public et l'app ne
// visite jamais le site avec un robot. L'utilisateur colle une fois l'adresse
// d'un produit qu'il a ouvert lui-même : l'app y retrouve le numéro de
// l'article et en déduit le modèle pour tous les autres.
export const slugify = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Modèle de lien à partir d'une adresse collée.
 * refs : numéros connus de ce produit ({ id, art, tech }) ; name : son nom.
 * → { tpl, key } (tpl contient {key} et éventuellement {slug}) ou null.
 */
export function learnTemplate(url, refs, name) {
  let u;
  try { u = new URL(String(url).trim()); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const href = u.href;
  for (const key of ['id', 'art', 'tech']) {
    const v = refs?.[key] != null ? String(refs[key]) : '';
    if (v.length < 3) continue;
    const re = new RegExp(`(^|[^0-9])${v}(?=[^0-9]|$)`);
    const m = href.match(re);
    if (!m) continue;
    let tpl = href.slice(0, m.index + m[1].length) + `{${key}}` + href.slice(m.index + m[0].length);
    // Un morceau d'adresse qui reprend le nom du produit devient {slug}.
    const words = slugify(name).split('-').filter((w) => w.length > 2);
    tpl = tpl.replace(/[^/?=&]+/g, (seg) => {
      if (seg.includes('{')) return seg;
      const hits = words.filter((w) => seg.toLowerCase().includes(w)).length;
      return hits >= 2 ? '{slug}' : seg;
    });
    return { tpl, key };
  }
  return null;
}

/** Adresse d'un produit d'après le modèle appris (null s'il manque le numéro). */
export function fillTemplate(t, refs, name) {
  const v = t && refs?.[t.key];
  if (v == null || v === '') return null;
  return t.tpl.replace(`{${t.key}}`, encodeURIComponent(v)).replace('{slug}', slugify(name) || 'produit');
}

/**
 * Lien à ouvrir pour une ligne du plan dans une enseigne.
 * templates : modèles appris par enseigne ({ colruyt: { tpl, key } }).
 * → { url, kind: 'product' | 'search', query }
 */
export function orderLink(chain, line, templates = {}) {
  const shop = SHOPS[chain];
  if (!shop) return null;
  const info = line.info ?? {};
  const learned = info.kind !== 'estimate' && fillTemplate(templates[chain], info.ref, info.article ?? line.product.name);
  if (learned) return { url: learned, kind: 'product', query: info.article ?? line.product.name };
  // Lien direct seulement si le prix vient bien de cette enseigne.
  if (info.url && info.kind !== 'estimate') {
    const url = info.url.startsWith('/') ? shop.origin + info.url : info.url;
    return { url: shop.product ? shop.product(url) : url, kind: 'product', query: info.article ?? line.product.name };
  }
  // Équivalent : son nom (en français) ; article d'une autre enseigne : son nom sans la marque maison ni le format.
  const fromArticle = info.article && info.kind !== 'estimate' && (shop.articleSearch !== false || info.eq) ? searchText(info.article) : '';
  const query = fromArticle || RULES[line.product.id]?.q || searchText(line.product.name.replace(/\s*\(.*\)$/, '')) || line.product.name;
  return { url: shop.search(query), kind: 'search', query };
}
