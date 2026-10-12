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
    cart: 'https://www.delhaize.be/fr/cart',
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

/**
 * Lien à ouvrir pour une ligne du plan dans une enseigne.
 * → { url, kind: 'product' | 'search', query }
 */
export function orderLink(chain, line) {
  const shop = SHOPS[chain];
  if (!shop) return null;
  const info = line.info ?? {};
  // Lien direct seulement si le prix vient bien de cette enseigne.
  if (info.url && info.kind !== 'estimate') {
    const url = info.url.startsWith('/') ? shop.origin + info.url : info.url;
    return { url: shop.product ? shop.product(url) : url, kind: 'product', query: info.article ?? line.product.name };
  }
  const fromArticle = info.article && info.kind !== 'estimate' && shop.articleSearch !== false ? searchText(info.article) : '';
  const query = fromArticle || RULES[line.product.id]?.q || line.product.name.replace(/\s*\(.*\)$/, '');
  return { url: shop.search(query), kind: 'search', query };
}
