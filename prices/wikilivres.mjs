// Import du « Livre de cuisine » de Wikilivres (fr.wikibooks.org, CC BY-SA 4.0) :
//   node prices/wikilivres.mjs <wikilivres-raw.json> [sortie=data/recipes-wikilivres.json]
// (relevé brut : prices/fetch-wikilivres.mjs). Garde les recettes dont tous les
// ingrédients s'achètent en Belgique, ramène les quantités par personne, détecte
// les ustensiles, le type de plat et si c'est un plat d'ici ou « découverte ».
import { readFileSync, writeFileSync } from 'node:fs';
import { ING } from '../src/recipes.js';

const n = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae');

// ---------- Texte wiki → texte ----------
export function unwiki(s) {
  return String(s ?? '')
    .replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>|<ref[^>]*\/>/g, '').replace(/<[^>]+>/g, '')
    // {{i|nom|affiché}}, {{i|'=oui|œuf|œufs}}, {{Unité|1.5|kg}}, {{Ustensile|poêle}}…
    .replace(/\{\{([^{}|]+)\|([^{}]*)\}\}/g, (all, name, args) => {
      const t = name.trim().toLowerCase();
      const parts = args.split('|').filter((x) => !x.includes('=')).map((x) => x.replace(/_/g, ' ').trim()).filter(Boolean);
      if (t === 'unité' || t === 'unite') return parts.join(' ');
      if (/^(i'?|ingr[ée]dient|ustensile|lien|w|techniquecuisine)$/.test(t)) return parts[parts.length > 1 ? 1 : 0] ?? '';
      return '';
    })
    .replace(/\{\{[^{}]*\}\}/g, '').replace(/\[\[(?:Fichier|File|Image|Catégorie|Category):[^\]]*\]\]/gi, '').replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1').replace(/\[https?:\S+\s([^\]]*)\]/g, '$1')
    .replace(/'{2,}/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Sections d'une page : { titre normalisé: [lignes] }. */
function sections(text) {
  const out = { '': [] };
  let cur = '';
  for (const raw of text.split('\n')) {
    const h = raw.match(/^=+\s*(.*?)\s*=+\s*$/);
    if (h) { cur = n(unwiki(h[1])); out[cur] ??= []; continue; }
    out[cur].push(raw);
  }
  return out;
}
const pick = (secs, re) => Object.entries(secs).filter(([k]) => re.test(k)).flatMap(([, v]) => v);

// ---------- Quantités ----------
const WORDS = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, douze: 12, quinze: 15, vingt: 20, demi: 0.5, 'une demi': 0.5, 'un demi': 0.5, quelques: 3 };
const FRAC = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
function parseQty(t) {
  t = t.replace(/^(environ|env\.|±|~|à peu près|un peu moins de|un peu plus de)\s*/i, '');
  let m = t.match(/^(\d+(?:[.,]\d+)?)\s*(?:[/⁄]\s*(\d+))?(?:\s*(?:à|-|–)\s*(\d+(?:[.,]\d+)?))?\s*([½¼¾⅓⅔])?/);
  if (m && m[0].trim()) {
    let v = Number(m[1].replace(',', '.'));
    if (m[2]) v /= Number(m[2]);
    if (m[3]) v = (v + Number(m[3].replace(',', '.'))) / 2;
    if (m[4]) v += FRAC[m[4]];
    return { qty: v, rest: t.slice(m[0].length).trim() };
  }
  if (FRAC[t[0]]) return { qty: FRAC[t[0]], rest: t.slice(1).trim() };
  m = n(t).match(/^(une demi|un demi|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|douze|quinze|vingt|demi|quelques)\b/);
  if (m) return { qty: WORDS[m[1]], rest: t.slice(m[0].length).trim() };
  return { qty: null, rest: t };
}
const UNITS = [
  [/^(kilogrammes?|kilos?|kgs?)\b\.?/i, 'kg'], [/^(grammes?|gr|g)\b\.?/i, 'g'], [/^(litres?|l)\b\.?/i, 'l'], [/^(décilitres?|dl)\b\.?/i, 'dl'],
  [/^(centilitres?|cl)\b\.?/i, 'cl'], [/^(millilitres?|ml)\b\.?/i, 'ml'],
  [/^(cuill?[eè]?r(?:e|ée|ées|es|s)?|cuil\.?|c\.?)\s*(à|a)\s*(soupe|s\.?)\b\.?|^(cs|càs|c\.à\.s)\b\.?/i, 'cs'],
  [/^(cuill?[eè]?r(?:e|ée|ées|es|s)?|cuil\.?|c\.?)\s*(à|a)\s*(caf[ée]|c\.?|th[ée])\b\.?|^(cc|càc|c\.à\.c)\b\.?/i, 'cc'],
  [/^(pinc[ée]es?|soup[cç]ons?|filets?|traits?|noisettes?|zestes?)\b/i, 'tiny'], [/^(tasses?|bols?)\b/i, 'tasse'], [/^(verres?)\b/i, 'verre'],
  [/^(bo[iî]tes?|conserves?|pots?|briques?)\b/i, 'boite'], [/^(sachets?|paquets?)\b/i, 'sachet'], [/^(gousses?)\b/i, 'gousse'],
  [/^(noix)\s+de\b/i, 'noix'], [/^(tablettes?|plaques?)\b/i, 'tablette'], [/^(tranches?|morceaux?|bottes?|bouquets?(?! garni)|brins?|branches?|feuilles?|t[eê]tes?|pi[eè]ces?|filets?|escalopes?|c[oô]tes?|cuisses?|blancs?|pav[ée]s?|rouleaux?)\b/i, 'pc'],
];

// ---------- Ingrédients → clés de src/recipes.js ----------
// [motif sur le nom (sans accents), clé | 'pantry:<clé placard>' | 'skip', { piece: g par pièce }]
const MAP = [
  [/lait de (noix de )?coco|creme de coco/, 'lait-coco'], [/citrons? verts?|limes?\b/, 'citrons'], [/biere/, 'biere', { piece: 250 }],
  [/comte|beaufort|gruyere|emmental/, 'emmental'], [/margarine/, 'beurre'],
  // Introuvables ou trop rares en supermarché belge : recette écartée.
  [/anguille|escargot|foie gras|gibier|lapin|lievre|canard|caille|pintade|pigeon|faisan|chevreuil|sanglier|\bcerf\b|agneau|mouton|\bveau\b|rognon|tripe|pied de porc|pieds de porc|langue|cervelle|ris de veau|abats|boudin|andouill|cepes?|morilles?|girolles?|truffe|chataigne|marron|safran|nefle|cynorrhodon|ortie|pissenlit|\bpignons?\b|pistache|noisette|noix de coco|coco rape|cajou|tamari|tofu|seitan|tempeh|algue|nori|miso|wasabi|sirop d.erable|melasse|mais a pop|gelatine|agar|colorant|feve|lupin|pois casse|millet|sarrasin|epeautre|seigle|orge|boulgour|polenta|semoule de mais|tapioca|manioc|igname|plantain|patisson|topinambour|panais|rutabaga|celeri|fenouil|artichaut|asperge|betterave|radis|navet|\bchoux?\b(?!.fleur)|blettes?|cresson|roquette|mache|endive frisee|frisee|cardon|oseille|crevettes? grises|homard|langouste|crabe|ecrevisse|coquilles? saint|saint.jacques|calamar|seiche|poulpe|huitre|bulot|oursin|anchois|sardine|maquereau|hareng|truite|sole|bar\b|dorade|rouget|lotte|morue|haddock|saumon fume|caviar|oeufs de|chevre|roquefort|\bbleu\b|maroilles|munster|camembert|brie|vacherin|raclette|mascarpone|ricotta|gorgonzola|pecorino|cottage|lait concentre|lait en poudre|lait ribot|babeurre|creme de marron|nutella|speculoos|biscuits?|boudoirs?|meringue|pate d.amande|massepain|praline|fruits confits|angelique|figue|datte|pruneau|abricot|peche|nectarine|prune|mirabelle|cerise|griotte|framboise|myrtille|mure|groseille|cassis|rhubarbe|coing|kaki|grenade|mangue|ananas|papaye|fruit de la passion|litchi|melon|pasteque|raisin\b|raisins frais|pamplemousse|clementine|mandarine|kumquat|calvados|cognac|armagnac|whisky|vodka|rhum|kirsch|grand marnier|cointreau|liqueur|porto|madere|marsala|pastis|vermouth|champagne|cidre|petits pois|haricots blancs|saindoux/, 'skip'],
  // Placard (gardés dans la recette, pas achetés pour elle).
  [/huile d.olive/, 'pantry:huile-d-olive'], [/huile de sesame/, 'pantry:huile-de-sesame'], [/huile|matiere grasse|graisse/, 'pantry:huile'],
  [/\bsel\b|fleur de sel|gros sel/, 'pantry:sel'], [/poivre/, 'pantry:poivre'], [/muscade/, 'pantry:muscade'], [/cannelle/, 'pantry:cannelle'],
  [/paprika fume/, 'pantry:paprika-fume'], [/paprika/, 'pantry:paprika'], [/cumin/, 'pantry:cumin'], [/curcuma/, 'pantry:curcuma'], [/curry|cari\b/, 'pantry:curry'],
  [/piment|cayenne|harissa|tabasco/, 'pantry:piment'], [/gingembre (en poudre|moulu)/, 'pantry:gingembre'], [/clous? de girofle|girofle/, 'pantry:clous-de-girofle'],
  [/quatre.epices/, 'pantry:quatre-epices'], [/herbes de provence|herbes/, 'pantry:herbes'], [/origan/, 'pantry:origan'], [/thym/, 'pantry:thym'],
  [/romarin/, 'pantry:romarin'], [/laurier/, 'pantry:laurier'], [/basilic/, 'pantry:basilic'], [/estragon/, 'pantry:estragon'], [/aneth/, 'pantry:aneth'],
  [/menthe/, 'pantry:menthe'], [/ciboulette/, 'pantry:ciboulette'], [/coriandre/, 'pantry:coriandre'], [/sauge/, 'pantry:sauge'], [/sarriette/, 'pantry:sarriette'],
  [/bouquet garni/, 'pantry:herbes'], [/vanille|sucre vanille/, 'pantry:vanille'], [/levure chimique|poudre a lever/, 'pantry:levure-chimique'],
  [/levure de boulanger|levure boulangere|levure fraiche|levure seche|levure\b/, 'pantry:levure-de-boulanger'], [/bicarbonate/, 'pantry:bicarbonate'],
  [/maizena|fecule/, 'pantry:fecule-de-mais'], [/sucre glace/, 'pantry:sucre-glace'], [/cassonade|vergeoise|sucre roux|sucre brun|sucre de canne/, 'pantry:cassonade'],
  [/vinaigre balsamique/, 'pantry:vinaigre-balsamique'], [/vinaigre de cidre/, 'pantry:vinaigre-de-cidre'], [/vinaigre de vin/, 'pantry:vinaigre-de-vin'], [/vinaigre/, 'pantry:vinaigre'],
  [/moutarde/, 'pantry:moutarde'], [/ketchup/, 'pantry:ketchup'], [/sauce soja|soja/, 'pantry:sauce-soja'], [/worcestershire/, 'pantry:sauce-worcestershire'],
  [/bouillon|fond de (volaille|veau|boeuf)|cube/, 'pantry:bouillon'], [/vin (blanc|rouge|rose)|\bvin\b/, 'pantry:vin'], [/\beau\b|glacons?/, 'pantry:eau'],
  [/jus de citron/, 'pantry:jus-de-citron'], [/zeste.*orange/, 'pantry:zeste-d-orange'], [/zeste/, 'pantry:zeste-de-citron'],
  // À acheter.
  [/lardons?|poitrine (fumee|salee)|\blard\b|bacon/, 'lardons'], [/chorizo/, 'chorizo'], [/jambon/, 'jambon', { piece: 40 }],
  [/merguez|saucisses?|chipolatas?/, 'merguez'], [/(viande|chair) (a saucisse|hachee de porc)|hachis de porc|hache (de )?porc|porc et (de )?veau|hachis\b/, 'hache'],
  [/(boeuf|viande) hache|hache de boeuf|steak hache/, 'boeuf'], [/steak|entrecote|bavette|rumsteck|faux.filet|onglet|filet de boeuf|tournedos/, 'steak', { piece: 180 }],
  [/boeuf|paleron|gite|macreuse|joue|plat de cotes|carbonade|viande\b/, 'boeuf-ragout'],
  [/porc|echine|filet mignon|roti de porc|cotes? de porc|travers/, 'porc', { piece: 200 }],
  [/dinde/, 'dinde', { piece: 150 }], [/poulet|volaille|poule\b|coq\b/, 'poulet', { piece: 180 }],
  [/saumon/, 'saumon', { piece: 125 }], [/thon/, 'thon', { piece: 80 }], [/cabillaud|colin|merlu|lieu|eglefin|poisson blanc|poisson\b|filets? de poisson/, 'cabillaud', { piece: 150 }],
  [/crevettes?|gambas|scampis?/, 'crevettes', { piece: 15 }], [/moules?/, 'moules'],
  [/jaunes? d.oeuf|blancs? d.oeuf|oeufs?/, 'oeufs'],
  [/lait de coco|creme de coco/, 'lait-coco'], [/creme (fraiche|liquide|epaisse|entiere|legere)|creme\b/, 'creme'],
  [/fromage blanc|petit.suisse|faisselle/, 'skyr'], [/fromage frais|philadelphia|boursin|saint.moret/, 'fromage-frais'],
  [/yaourts?|yoghourts?|yogourts?/, 'yaourts', { piece: 125 }],
  [/lait\b/, 'lait'], [/beurre/, 'beurre'],
  [/parmesan|grana/, 'parmesan'], [/mozzarella/, 'mozzarella', { piece: 125 }], [/feta/, 'feta'], [/reblochon/, 'reblochon', { piece: 450 }], [/cheddar/, 'cheddar'],
  [/gouda|edam|fromage (en tranches|a raclette)/, 'gouda'], [/emmental|gruyere|fromage rape|fromage\b/, 'emmental'],
  [/tomates? (pelees|concassees|en conserve|en boite)|coulis|passata|puree de tomates?|concentre de tomates?|sauce tomate|tomate concentree/, 'tomates-conc'],
  [/tomates? cerises?/, 'tomates', { piece: 15 }], [/tomates?/, 'tomates', { piece: 120 }],
  [/pommes? de terre|patates?(?! douces?)/, 'pdt', { piece: 150 }], [/patates? douces?/, 'patate-douce', { piece: 300 }],
  [/oignons? nouveaux|cebettes?|oignons? verts?/, 'oignons', { piece: 30 }], [/oignons?|echalotes?/, 'oignons', { piece: 100 }],
  [/\bail\b|gousses? d.ail/, 'ail', { piece: 5, gousse: 5 }], [/carottes?/, 'carottes', { piece: 100 }], [/courgettes?/, 'courgettes', { piece: 200 }],
  [/poivrons?/, 'poivrons', { piece: 150 }], [/aubergines?/, 'aubergine'], [/brocolis?/, 'brocoli', { piece: 400 }], [/champignons?/, 'champignons', { piece: 20 }],
  [/poireaux?/, 'poireaux'], [/epinards?/, 'epinards'], [/haricots? verts?/, 'haricots-verts'], [/chou.fleur/, 'chou-fleur'], [/chicons?|endives?/, 'chicons'],
  [/potiron|potimarron|courge|butternut|citrouille/, 'courge'], [/concombres?/, 'concombre'], [/avocats?/, 'avocats'], [/salade|laitue|scarole/, 'salade'],
  [/persil/, 'persil'], [/gingembre/, 'gingembre'],
  [/citrons?/, 'citrons'], [/oranges?/, 'oranges', { piece: 200 }], [/bananes?/, 'bananes', { piece: 120 }], [/fraises?/, 'fraises', { piece: 15 }],
  [/pommes?/, 'pommes', { piece: 150 }],
  [/spaghettis?|tagliatelles?|pates|penne|macaronis?|coquillettes|fusilli|farfalle|linguine|vermicelles?/, 'pates'], [/nouilles?/, 'nouilles'],
  [/feuilles? de lasagnes?|lasagnes?/, 'lasagne'], [/gnocchis?/, 'gnocchi'], [/\briz\b/, 'riz'], [/semoule|couscous/, 'semoule'], [/quinoa/, 'quinoa'],
  [/lentilles?/, 'lentilles'], [/pois chiches?/, 'pois-chiches'], [/haricots? rouges?/, 'haricots-rouges'], [/\bmais\b/, 'mais'],
  [/pate feuilletee/, 'pate-feuil'], [/pate brisee|pate sablee/, 'pate-brisee'], [/pate a pizza/, 'pate-pizza'], [/tortillas?|galettes de ble|wraps?/, 'tortillas'],
  [/pain de mie/, 'pain-mie'], [/pains? (a hamburger|burger)/, 'pain-burger'], [/pita/, 'pain-pita'], [/chapelure/, 'chapelure'], [/baguette/, 'baguette'], [/\bpain\b/, 'pain', { piece: 40 }],
  [/farine/, 'farine'], [/sucre/, 'sucre'], [/chocolat/, 'chocolat'], [/cacao/, 'cacao'], [/miel/, 'miel'], [/flocons d.avoine/, 'flocons'],
  [/olives?/, 'olives'], [/pesto/, 'pesto'], [/mayonnaise/, 'mayonnaise'], [/noix\b/, 'noix'], [/amandes?/, 'amandes'], [/raisins? secs?/, 'raisins-secs'],
  [/beurre de cacahuetes?|cacahuetes?/, 'cacahuete'],
];
const lookup = (name) => { for (const [re, key, conv] of MAP) if (re.test(name)) return { key, conv: conv ?? {} }; return null; };

/** « 200 g de farine » → { key, total (unité du paquet) } | { pantry, key, amount, unit } | null (introuvable). */
export function parseIngredient(line) {
  let t = unwiki(line).replace(/^[*#:\s-]+/, '').replace(/\s*\([^)]*\)/g, '').trim();
  if (!t) return { empty: true };
  const optional = /facultati|selon (le|votre) go[uû]t|pour (la )?d[ée]co|pour servir|au choix|si (vous|besoin)/i.test(t);
  let { qty, rest } = parseQty(t);
  let unit = null;
  for (const [re, u] of UNITS) { const m = rest.match(re); if (m) { unit = u; rest = rest.slice(m[0].length).trim(); break; } }
  rest = rest.replace(/^(de |d'|d’|des |du |de la |de l'|de l’)/i, '').replace(/^(gros|grosses?|petits?|petites?|beaux?|belles?|bon(ne)?s?|grandes?|moyens?|moyennes?|bel)\s+/i, '');
  const alts = n(rest.split(/,| et | pour |;|:/)[0]).split(/ ou /);
  const hits = alts.map(lookup);
  const hit = hits.find((h) => h && h.key !== 'skip') ?? hits[0] ?? lookup(n(rest));
  if (!hit) return optional ? { pantry: true, key: 'assaisonnement' } : null;
  if (hit.key === 'skip') return optional ? { pantry: true, key: 'assaisonnement' } : null;
  if (hit.key.startsWith('pantry:')) return { pantry: true, key: hit.key.slice(7), qty, unit };
  const def = ING[hit.key];
  if (!def) return null;
  const target = def.pack[1];
  const c = hit.conv;
  const q = qty ?? (unit === 'tiny' ? null : target === 'pc' ? 1 : null);
  if (q == null || unit === 'tiny') {
    if (['beurre', 'sucre', 'farine', 'lait', 'miel', 'creme', 'persil', 'chapelure', 'parmesan', 'emmental'].includes(hit.key)) return { pantry: true, key: hit.key };
    if (c.piece || target === 'pc') return { key: hit.key, total: target === 'pc' ? 1 : c.piece };
    return optional ? { pantry: true, key: 'assaisonnement' } : null;
  }
  const g = { g: 1, kg: 1000 }[unit];
  const ml = { ml: 1, cl: 10, dl: 100, l: 1000 }[unit];
  let amount = null;
  if (target === 'g') {
    amount = g ? q * g : ml ? q * ml : unit === 'cs' ? q * 15 : unit === 'cc' ? q * 5 : unit === 'tasse' ? q * 150 : unit === 'verre' ? q * 150
      : unit === 'boite' ? q * 400 : unit === 'sachet' ? q * 100 : unit === 'tablette' ? q * 200 : unit === 'noix' ? q * 10 : unit === 'gousse' ? q * (c.gousse ?? 5)
        : (!unit || unit === 'pc') ? q * (c.piece ?? 100) : null;
  } else if (target === 'ml') {
    amount = ml ? q * ml : g ? q * g : unit === 'cs' ? q * 15 : unit === 'cc' ? q * 5 : unit === 'tasse' ? q * 250 : unit === 'verre' ? q * 200
      : unit === 'boite' ? q * 400 : unit === 'noix' ? q * 10 : null;
  } else {
    amount = (!unit || unit === 'pc' || unit === 'gousse') ? q : unit === 'boite' ? q : g ? (q * g) / (c.piece ?? 100) : ml && c.piece ? (q * ml) / c.piece : unit === 'cs' ? q * 0.1 : null;
  }
  if (amount == null || !(amount > 0)) return null;
  if (['sucre', 'farine', 'miel', 'beurre', 'lait', 'creme'].includes(hit.key) && amount <= (hit.key === 'lait' || hit.key === 'creme' ? 20 : 15)) return { pantry: true, key: hit.key };
  return { key: hit.key, total: amount };
}

// ---------- Recettes ----------
const SKIP_TITLE = /^(sauces?|vinaigrette|confiture|gel[ée]e|marmelade|p[aâ]te [àa]|p[aâ]tes? (bris|feuill|sabl)|fond|bouillon|marinade|pains?\b|liqueur|sirop|cocktail|boisson|th[ée]\b|caf[ée]\b|limonade|lassi|milk.shake|smoothie|beurre|moutarde|technique|recettes?\b|accompagnements|cuisine |cuisson|liste|index|sommaire|mod[eè]le|glossaire|ustensiles?|conservation|d[ée]coupe|apprendre|base|condiment|[ée]pices|cr[eè]me (anglaise|p[aâ]tissi[eè]re)|chapelure|glace|glaçage|sorbet|granit|aïoli|b[ée]chamel|mayonnaise|f[eê]tes|k[ée]fir|confit|duxelles|mirepoix|nappage|dulce|lait de poule|cretons|guacamole|tza|bretzel|naan|damper|fougasse|chocolat chaud|chantilly|caramel|spritz|cr[eè]me de citron|cr[eè]me d.amande|frangipane|chaudeau|brioche|halavah)|cocktail|wonton|^[a-z]$/i;
const SKIP_CAT = /Boissons|Cocktail|Sauces|Confitures|Condiments|Techniques|Pains/i;
const DESSERT = /dessert|g[aâ]teau|tarte (aux|au|à la) (pomme|poire|fraise|citron|sucre|chocolat|abricot|prune|myrtille|rhubarbe|framboise|noix)|tarte tatin|cr[eè]me (br[uû]l[ée]e|caramel|renvers)|mousse au|flan|clafoutis|crumble|cookie|biscuit|sabl[ée]|madeleine|crêpes?\b|cr[eê]pe|gaufre|beignet|brioche|kouglof|cake|muffin|brownie|charlotte|tiramisu|riz au lait|pudding|compote|fruits? (au|cuits)|poires? (au|belle)|pommes? (au four|cuites)|chausson|bugne|meringue|[ée]clair|chou\b|profiterole|far\b|quatre.quarts|bûche|galette des rois|pain d'[ée]pices|nougat|praline|truffes|palet|macaron|financier|tuile|sucre|caramel|glace|sorbet/i;
// Ingrédients salés : un « flan de courgettes » n'est pas un dessert.
const SAVORY = new Set(['tomates', 'tomates-conc', 'oignons', 'ail', 'pdt', 'courgettes', 'poivrons', 'aubergine', 'brocoli', 'champignons', 'poireaux', 'epinards', 'chou-fleur', 'chicons', 'courge', 'carottes', 'haricots-verts', 'lentilles', 'pois-chiches', 'olives', 'emmental', 'gouda', 'parmesan', 'feta', 'mozzarella', 'reblochon', 'cheddar', 'lardons', 'jambon', 'salade', 'concombre', 'avocats']);
const LUNCH = /salade|sandwich|croque|tartine|bruschetta|toast|wrap|entr[ée]e|soupe froide|gaspacho|œufs? (mimosa|durs?|cocotte)|oeufs? (mimosa|durs?|cocotte)|quiche|cake sal[ée]/i;
const BREAKFAST = /petit.d[ée]jeuner|porridge|pancake|granola|muesli/i;
// Cuisine d'ici (Belgique, France, voisins) ou plat lointain (« découverte »).
const FAR_CAT = /Cuisine (africaine|alg[ée]rienne|marocaine|tunisienne|s[ée]n[ée]galaise|congolaise|camerounaise|ivoirienne|malienne|tchadienne|berb[eè]re|cor[ée]enne|japonaise|chinoise|vietnamienne|tha[iï]|laotienne|cambodgienne|indienne|pakistanaise|indon[ée]sienne|philippine|cr[ée]ole|r[ée]unionnaise|antillaise|malgache|mauricienne|br[ée]silienne|mexicaine|p[ée]ruvienne|argentine|chilienne|libanaise|turque|iranienne|isra[ée]lienne|juive|russe|polonaise|hongroise|roumaine|bulgare|grecque|portugaise|catalane|am[ée]ricaine|qu[ée]b[ée]coise|canadienne)/i;
const FAR_TITLE = /kimchi|dubu|bulgogi|sam gye|shabu|sushi|maki|ramen|pho|nem|bobun|tajine|couscous royal|harira|chorba|makroud|karantika|mouna|moambe|mafé|yassa|attiéké|foutou|aloko|ndol[ée]|poulet dg|colombo|rougail|cari|carry|achards?|dhal|samoussa|naan|tandoori|biryani|burrito|enchilada|guacamole|ceviche|empanada|feijoada|tortas|caldeirada|chanfana|pastel|moussaka|tzatziki|blinis?|bortsch|goulash|pierogi|baklava|halva|lassi|mochi|ma po|kung pao|porc laqu[ée]|g[ée]n[ée]ral ta[o0]|teriyaki|fruit [àa] pain|br[eè]des|mafane|\bch[eè]\b/i;

function toolsOf(t) {
  t = n(t);
  const tools = [];
  if (/\bfour\b|enfourne|prechauff|gratin|thermostat|\bth\.?\s?\d|au four/.test(t)) tools.push('four');
  if (/poele|casserole|sauteuse|cocotte|faitout|marmite|wok|feu (doux|vif|moyen)|a feu|bouillir|ebullition|mijot|faites? (revenir|dorer|fondre|cuire|sauter)|frire|friture|plaque|rissol/.test(t)) tools.push('plaques');
  if (/micro.?ondes?/.test(t) && !tools.length) tools.push('micro');
  if (/mixeur|mixer|mixez|blender|robot|batteur|fouet electrique/.test(t)) tools.push('mixeur');
  if (!tools.length && /cuire|cuisson|chauff/.test(t)) tools.push('plaques|four');
  return tools;
}
const NO_TOOL = /barbecue|braise de bois|feu de bois|friteuse|sorbeti[eè]re|machine [àa] pain|yaourti[eè]re|four [àa] pain|fumoir|sous vide|plancha|appareil [àa] raclette|appareil [àa] fondue|caqu[eé]lon/i;

function minutesOf(text, steps, tools) {
  const t = n(text);
  let total = 0;
  for (const m of t.matchAll(/(preparation|cuisson|repos|marinade)\s*:?\s*(?:environ\s*)?(\d+)\s*(h|heures?|min|minutes?)\s*(\d+)?/g)) {
    if (m[1] === 'repos' || m[1] === 'marinade') continue;
    total += /^h/.test(m[3]) ? Number(m[2]) * 60 + Number(m[4] ?? 0) : Number(m[2]);
  }
  return total || 15 + steps * 5 + (tools.includes('four') ? 30 : 0);
}
function servingsOf(text) {
  const t = n(text);
  const m = t.match(/pour\s*:?\s*(\d+)\s*(personnes?|pers|couverts|parts?|portions?)/) ?? t.match(/(\d+)\s*(personnes|pers\.|couverts|portions)/) ?? t.match(/personnes?\s*[=:]\s*(\d+)/);
  const v = Number(m?.[1]);
  return v >= 1 && v <= 24 ? v : 4;
}
const slugKey = (s) => s;

export function importWikilivres(pages) {
  const out = [];
  const seen = new Set();
  const reasons = {};
  const why = (r) => { reasons[r] = (reasons[r] ?? 0) + 1; };
  for (const p of pages) {
    const path = p.title.replace(/^Livre de cuisine\//, '');
    const name = path.split('/').pop().replace(/\s*\(\d+\)\s*$/, '').replace(/\d+$/, '').trim();
    if (/^(Boissons|Recettes|Accompagnements|Cuisine|Techniques|Ustensiles|Ingr[ée]dients)/i.test(path) && !/^Desserts\//.test(path)) { why('rubrique'); continue; }
    if (SKIP_TITLE.test(name) || SKIP_CAT.test(p.cats.join(' '))) { why('titre/catégorie'); continue; }
    const key = n(name).replace(/[^a-z]/g, '').replace(/(.)\1/g, '$1');
    if (seen.has(key)) { why('doublon'); continue; }
    const secs = sections(p.text);
    const ingLines = pick(secs, /ingredient/).filter((l) => /^\s*[*#]/.test(l));
    const stepLines = pick(secs, /preparation|realisation|recette|instructions|methode|deroulement|etapes/).map((l) => l.replace(/^[*#:\s]+/, '')).map(unwiki).filter((l) => l.length > 3);
    if (ingLines.length < 2 || ingLines.length > 20 || !stepLines.length) { why('structure'); continue; }
    const text = stepLines.join(' ');
    if (NO_TOOL.test(text)) { why('appareil'); continue; }
    const parsed = ingLines.map(parseIngredient).filter((x) => !x?.empty);
    if (parsed.some((x) => x === null)) { why('ingrédient introuvable'); continue; }
    const servings = servingsOf(p.text);
    const totals = new Map();
    for (const x of parsed) if (!x.pantry) totals.set(x.key, (totals.get(x.key) ?? 0) + x.total);
    if (totals.size < 2) { why('trop simple'); continue; }
    const per = [...totals].map(([k, total]) => [k, total / servings]);
    if (per.some(([k, a]) => { const u = ING[k].pack[1]; return u === 'pc' ? a > 6 || a < 0.02 : a > 900 || a < 1; })) { why('quantités'); continue; }
    const tools = toolsOf(text);
    const all = `${name} ${p.cats.join(' ')} ${path}`;
    const savory = [...totals.keys()].some((k) => /[mf]/.test(ING[k].flags ?? '') || SAVORY.has(k));
    const type = !savory && (/^Desserts\//.test(path) || DESSERT.test(name) || /Desserts|P[aâ]tisserie|G[aâ]teaux/.test(p.cats.join(' '))) ? 'dessert'
      : BREAKFAST.test(all) ? 'petitdej' : LUNCH.test(name) || /Entr[ée]es|Salades/.test(p.cats.join(' ')) ? 'midi' : 'plat';
    const minutes = Math.min(minutesOf(p.text, stepLines.length, tools), 24 * 60);
    const round = (x, u) => (u === 'pc' ? Math.round(x * 100) / 100 : Math.max(1, Math.round(x)));
    const pantry = [...new Set(parsed.filter((x) => x.pantry).map((x) => x.key))].filter((k) => k !== 'assaisonnement' || true);
    const ingredients = [...per.map(([k, a]) => `${k}:${round(a, ING[k].pack[1])}${ING[k].pack[1]}`), ...pantry.map((k) => `~${k}`)].join(' ');
    const familiar = FAR_CAT.test(p.cats.join(' ')) || FAR_TITLE.test(name) ? 0 : 1;
    const steps = stepLines.join(' ').slice(0, 2000);
    seen.add(key);
    out.push([name, type, minutes, tools.join(' '), ingredients, steps, `https://fr.wikibooks.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`, familiar]);
    why('gardée');
  }
  return { recipes: out, reasons };
}

if (process.argv[1]?.endsWith('wikilivres.mjs') && process.argv[2]) {
  const pages = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const { recipes, reasons } = importWikilivres(pages);
  console.log(reasons);
  const byType = {};
  for (const r of recipes) byType[r[1]] = (byType[r[1]] ?? 0) + 1;
  console.log(byType, 'découverte :', recipes.filter((r) => !r[7]).length);
  const outFile = process.argv[3] ?? 'data/recipes-wikilivres.json';
  writeFileSync(outFile, `[\n${recipes.map((r) => JSON.stringify(r)).join(',\n')}\n]\n`);
  console.log(`Écrit : ${outFile}`);
}
