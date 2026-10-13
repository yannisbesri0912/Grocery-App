// Ordre de passage en magasin. Colruyt publie la place de chaque article sur
// le parcours (walkRouteSequenceNumber) ; sans elle, on prend la place médiane
// du rayon. Delhaize et les autres : ordre habituel des rayons.
// Rayons = indices de CATEGORIES (src/data.js) :
// 0 fruits & légumes, 1 boulangerie, 2 crèmerie, 3 viande & poisson, 4 épicerie,
// 5 surgelés, 6 boissons, 7 hygiène, 8 entretien, 9 bébé & animaux.

// Place médiane de chaque rayon sur le parcours Colruyt (catalogue d'octobre 2026).
const COLRUYT_MEDIAN = { 6: 1111, 7: 2619, 9: 6562, 8: 9083, 4: 11100, 0: 12986, 2: 14115, 3: 14916, 5: 15623, 1: 15696 };
const USUAL = [0, 1, 3, 2, 4, 6, 7, 8, 9, 5]; // Delhaize, Aldi, Lidl… : frais d'abord, surgelés à la fin

/** Ordre des rayons pour une enseigne. */
export function aisleOrder(chain) {
  // (les clés numériques d'un objet sont rangées par valeur : on trie par place médiane)
  return chain === 'colruyt' ? Object.keys(COLRUYT_MEDIAN).map(Number).sort((a, b) => COLRUYT_MEDIAN[a] - COLRUYT_MEDIAN[b]) : USUAL;
}

/** Clé de tri d'un article : plus petit = plus tôt dans le magasin. */
export function aisleKey(chain, cat, walk) {
  if (chain === 'colruyt') return walk > 0 ? walk : COLRUYT_MEDIAN[cat] ?? 11100;
  const i = USUAL.indexOf(cat);
  return (i < 0 ? 4 : i) * 1000;
}
