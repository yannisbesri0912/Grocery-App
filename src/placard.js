// « Mon placard » : importer une liste de ce qu'on a déjà (JSON comme
// [{ "nom": "Riz basmati", "quantite": 1, "unite": "paquet" }], ou une ligne par
// produit), et la relier aux ingrédients des recettes.
import { norm } from './matcher.js';

/** Texte collé → [{ name, qty }] (qty : « 3 paquets », ou ''). */
export function parsePlacard(text) {
  const t = String(text ?? '').trim();
  if (!t) return [];
  if (/^[[{]/.test(t)) {
    try {
      const data = JSON.parse(t);
      const arr = Array.isArray(data) ? data : Array.isArray(data?.placard) ? data.placard : Array.isArray(data?.items) ? data.items : [];
      return arr.map((x) => (Array.isArray(x) ? { nom: x[0], quantite: x[1] } : x)) // forme courte des liens : [nom, quantité]
        .filter((x) => x && typeof x === 'object' && x.stock !== false && (x.quantite ?? x.quantity ?? 1) !== 0)
        .map((x) => ({ name: String(x.nom ?? x.name ?? x.produit ?? '').trim().slice(0, 80), qty: typeof x.quantite === 'string' && x.unite == null ? x.quantite.slice(0, 30)
          : [x.quantite ?? x.quantity, x.unite ?? x.unit].filter((v) => v != null && v !== '').join(' ').slice(0, 30) }))
        .filter((x) => x.name).slice(0, 300);
    } catch { /* pas du JSON : une ligne par produit */ }
  }
  return t.split(/\n|;/).map((l) => l.replace(/^[\s\-*•·]+/, '').trim()).filter(Boolean).slice(0, 300).map((l) => {
    const m = l.match(/^(\d+(?:[.,]\d+)?)\s*(paquets?|boîtes?|boites?|bocaux|bocal|pots?|sachets?|kg|g|l|cl|ml|x)?\s*(?:de |d')?(.+)$/i);
    return m ? { name: m[3].trim().slice(0, 80), qty: [m[1], m[2]].filter(Boolean).join(' ') } : { name: l.slice(0, 80), qty: '' };
  });
}

// Synonymes vers un ingrédient des recettes. L'ordre compte : le plus précis d'abord.
const SYN = [
  [/pate feuilletee/, 'pate-feuil'], [/pate brisee/, 'pate-brisee'], [/pate a pizza/, 'pate-pizza'],
  [/\blait de coco\b/, 'lait-coco'], [/\bfeuilles? de lasagne|\blasagnes?\b/, 'lasagne'],
  // Viandes et poissons (noms des produits de l'app, du boucher halal et des catalogues).
  [/hache|gehakt/, 'boeuf'], [/steak|biefstuk|entrecote/, 'steak'], [/poulet|\bkip\b|volaille/, 'poulet'], [/dinde|kalkoen/, 'dinde'],
  [/saumon|zalm/, 'saumon'], [/cabillaud|kabeljauw|colin|poisson blanc/, 'cabillaud'], [/crevettes?|scampi|gambas|garnalen/, 'crevettes'], [/moules?|mosselen/, 'moules'],
  [/merguez|saucisses?|worst/, 'merguez'], [/lardons?|spekblokjes/, 'lardons'], [/jambon|\bham\b/, 'jambon'], [/chorizo/, 'chorizo'], [/c[oô]tes? de porc|varken/, 'porc'],
  [/\b(lait|melk)\b(?! de coco)/, 'lait'], [/beurre|boter/, 'beurre'], [/yaourts?|yoghurt/, 'yaourts'], [/creme|room\b/, 'creme'],
  [/gouda/, 'gouda'], [/emmental|gruyere/, 'emmental'], [/mozzarella/, 'mozzarella'], [/parmesan|parmezaan/, 'parmesan'], [/feta/, 'feta'],
  [/bananes?|bananen/, 'bananes'], [/\bpommes?\b(?! de terre)|appels?\b|jonagold/, 'pommes'], [/oranges?|sinaasappel/, 'oranges'], [/citrons?|citroen/, 'citrons'],
  [/tomates?\b(?! (en conserve|pelees|concassees|en boite))|tomaten/, 'tomates'], [/carottes?|wortel/, 'carottes'], [/courgettes?/, 'courgettes'], [/poivrons?|paprika\b/, 'poivrons'],
  [/brocolis?/, 'brocoli'], [/champignons?/, 'champignons'], [/salade|laitue|sla\b/, 'salade'], [/concombres?|komkommer/, 'concombre'], [/avocats?/, 'avocats'],
  [/poireaux?|prei/, 'poireaux'], [/epinards?|spinazie/, 'epinards'], [/chicons?|witloof|endives?/, 'chicons'], [/\bpain\b|brood/, 'pain'], [/baguette|stokbrood/, 'baguette'],
  [/\briz\b|rijst/, 'riz'], [/\b(pates?|spaghettis?|tagliatelles?|penne|macaronis?|fusilli|coquillettes|farfalle|linguine)\b/, 'pates'],
  [/\b(pommes? de terre|patates?)\b(?!.*(poudre|puree|douce))/, 'pdt'], [/patates? douces?/, 'patate-douce'],
  [/\bthon\b/, 'thon'], [/\blentilles?\b/, 'lentilles'], [/\bpois chiches?\b/, 'pois-chiches'], [/haricots? rouges?/, 'haricots-rouges'],
  [/\bmais\b/, 'mais'], [/\btomates? (en conserve|concassees?|pelees?|en boite)|coulis de tomates?|passata/, 'tomates-conc'],
  [/\bpesto\b/, 'pesto'], [/\bfarine\b/, 'farine'], [/\bsucre\b|cassonade|vergeoise/, 'sucre'], [/\bmiel\b/, 'miel'],
  [/\boeufs?\b/, 'oeufs'], [/semoule|couscous/, 'semoule'], [/quinoa/, 'quinoa'], [/flocons d.avoine/, 'flocons'],
  [/nouilles/, 'nouilles'], [/chapelure/, 'chapelure'], [/sauce soja/, 'soja'], [/\bolives?\b/, 'olives'],
  [/raisins? secs?/, 'raisins-secs'], [/\bnoix\b/, 'noix'], [/amandes?/, 'amandes'], [/beurre de cacahuetes?/, 'cacahuete'],
  [/\bchocolat\b/, 'chocolat'], [/cacao/, 'cacao'], [/mayonnaise/, 'mayonnaise'], [/gnocchi/, 'gnocchi'],
  [/\btortillas?|\bwraps?\b/, 'tortillas'], [/oignons?\b(?!.*poudre)/, 'oignons'], [/\bail\b(?!.*poudre)/, 'ail'],
];
// Mélanges, plats prêts et sauces : pas un ingrédient de base (« petits pois et carottes »).
const NOT_ING = /\bet\b|&|\bsoupe|veloute|\bsauce\b(?!.*(soja|pesto))|puree|en poudre|epices? pour|preparation/;
// Épices et condiments séchés : dans le placard des recettes (supposés présents).
const SPICE = /moulu|en poudre|seche|herbes|epices?|poivre|paprika|origan|basilic|cannelle|cumin|curry|curcuma|thym|romarin|laurier|muscade|piment|gingembre|persil|ciboulette|coriandre|sel\b|huile|vinaigre|moutarde|bouillon|levure|bicarbonate|vanille|ketchup/;

/**
 * Produit du placard → { key, pantry } (clé d'ING ou de PANTRY_LABELS), ou null.
 * labels : { ING: { clé: nom affiché }, PANTRY: { clé: nom } }.
 */
export function matchPlacard(name, labels) {
  const n = norm(name).replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!n) return null;
  const mixed = NOT_ING.test(n);
  // Épices et condiments : ingrédients « placard » des recettes.
  if (SPICE.test(n) && !/sauce|soupe|veloute/.test(n)) {
    for (const [k, l] of Object.entries(labels.PANTRY).sort((a, b) => b[1].length - a[1].length)) {
      if (new RegExp(`\\b${norm(l)}\\b`).test(n)) return { key: k, pantry: true };
    }
    if (/epices?|herbes|assaisonnement/.test(n)) return { key: 'epices', pantry: true };
  }
  if (!mixed) {
    for (const [re, k] of SYN) if (re.test(n) && labels.ING[k]) return { key: k, pantry: false };
    // Nom d'un ingrédient (« Feta », « Poireaux ») au singulier ou au pluriel.
    for (const [k, l] of Object.entries(labels.ING)) {
      const w = norm(l).replace(/\s*\(.*\)$/, '').replace(/s\b/g, '');
      if (w.length > 2 && n.replace(/s\b/g, '') === w) return { key: k, pantry: false };
    }
  }
  return null;
}

// Ingrédients qui se gardent longtemps : restent au placard jusqu'à « Fini ».
export const KEEPS_LONG = new Set(['riz', 'pates', 'farine', 'sucre', 'tomates-conc', 'pois-chiches', 'lentilles', 'haricots-rouges', 'mais', 'thon',
  'semoule', 'quinoa', 'flocons', 'lasagne', 'nouilles', 'chapelure', 'lait-coco', 'pesto', 'olives', 'soja', 'miel', 'sirop', 'raisins-secs', 'noix',
  'amandes', 'cacao', 'cacahuete', 'chocolat', 'legumes-surg', 'frites', 'pizza', 'gnocchi', 'tortillas', 'bouchees', 'pdt', 'oignons', 'ail']);

// Combien de jours un produit se garde après l'achat (au frigo pour le frais).
// Sert à classer le placard (à manger vite / cette semaine / se garde) et à
// cuisiner d'abord les plats aux produits les plus fragiles (saumon avant les pâtes).
const SHELF = {
  moules: 1, hache: 1, boeuf: 1, saumon: 2, cabillaud: 2, crevettes: 2, poulet: 2, dinde: 2, steak: 3, 'boeuf-ragout': 3, porc: 3, merguez: 3,
  'steak-burger': 2, jambon: 5, lardons: 7, chorizo: 21, falafel: 5,
  baguette: 2, pain: 3, 'pain-burger': 5, 'pain-pita': 5, 'pain-mie': 7, 'pate-pizza': 5, 'pate-feuil': 7, 'pate-brisee': 7,
  fraises: 3, epinards: 3, salade: 4, champignons: 4, avocats: 4, 'haricots-verts': 4, persil: 5, bananes: 5, mozzarella: 5, brocoli: 5,
  tomates: 6, concombre: 6, aubergine: 6, chicons: 6, 'chou-fleur': 6, courgettes: 7, poivrons: 7, poireaux: 7, lait: 7, creme: 7, houmous: 7, tofu: 7,
  'fromage-frais': 10, feta: 10, reblochon: 10, yaourts: 14, skyr: 14, carottes: 14, oranges: 14, gnocchi: 14, tortillas: 14,
  oeufs: 21, gouda: 21, emmental: 21, cheddar: 21, pommes: 21, citrons: 21, gingembre: 21, 'patate-douce': 21,
  beurre: 30, parmesan: 30, pdt: 30, oignons: 30, ail: 30, courge: 30,
};
/** Jours de conservation d'un ingrédient (clé de src/recipes.js). */
export const shelfDays = (key) => SHELF[key] ?? (KEEPS_LONG.has(key) ? 180 : 7);
/** Classe de fraîcheur selon les jours restants : 'vite' (≤ 3), 'semaine' (≤ 7), 'garde'. */
export const freshness = (daysLeft) => (daysLeft <= 3 ? 'vite' : daysLeft <= 7 ? 'semaine' : 'garde');
