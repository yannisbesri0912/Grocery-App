// Catalogue complet Colruyt (data/catalog.json, ~10 000 articles, vrais prix
// mis à jour chaque nuit) et recherche en français dedans.
// Les noms d'articles Colruyt sont surtout en néerlandais : chaque mot cherché
// est complété par ses traductions (français / anglais → néerlandais).

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Mots français ou anglais → morceaux de mots néerlandais (sans accents).
// Un morceau suffit : « kaneel » trouve « Kaneelrol » et « kaneelbroodjes ».
export const LEXICON = {
  // Boulangerie, pâtisserie, petit-déjeuner
  pain: ['brood'], pains: ['brood'], baguette: ['stokbrood', 'baguette'], croissant: ['croissant'], brioche: ['brioche', 'koffiekoek'],
  viennoiserie: ['koffiekoek'], cannelle: ['kaneel'], cinnamon: ['kaneel'], roll: ['rol', 'roll'], rolls: ['rol', 'roll'], roule: ['rol'],
  eclair: ['eclair'], chou: ['soes', 'soezen'], choux: ['soes', 'soezen'], gaufre: ['wafel'], gaufres: ['wafel'], crepe: ['pannenkoek', 'crepe'],
  gateau: ['cake', 'taart', 'gebak'], tarte: ['taart', 'tart'], tartelette: ['taartje'], biscuit: ['koek', 'biscuit'], biscuits: ['koek', 'biscuit'],
  cookie: ['cookie', 'koek'], cookies: ['cookie', 'koek'], muffin: ['muffin'], donut: ['donut'], beignet: ['donut', 'beignet', 'berliner'],
  speculoos: ['speculoos', 'speculaas'], madeleine: ['madelein'], cramique: ['kramiek', 'cramique'], pistolet: ['pistolet', 'piccolo'],
  cereales: ['granen', 'cereal', 'cornflakes', 'muesli'], muesli: ['muesli'], flocons: ['vlokken'], avoine: ['haver'],
  confiture: ['confituur', 'jam'], miel: ['honing'], pate: ['pasta', 'pate'], tartiner: ['smeer', 'pasta'], choco: ['choco'],
  // Crèmerie
  lait: ['melk'], beurre: ['boter'], fromage: ['kaas'], yaourt: ['yoghurt'], yaourts: ['yoghurt'], creme: ['room', 'creme'], fraiche: ['vers'],
  oeuf: ['ei', 'eieren'], oeufs: ['eieren', 'ei'], rape: ['geraspt'], chevre: ['geit'], mozzarella: ['mozzarella'], dessert: ['dessert', 'pudding'],
  // Viande, poisson, traiteur
  poulet: ['kip'], dinde: ['kalkoen'], boeuf: ['rund'], porc: ['varken'], veau: ['kalf'], agneau: ['lam'], viande: ['vlees'], hache: ['gehakt'],
  jambon: ['ham'], saucisse: ['worst'], saucisses: ['worst'], saucisson: ['salami', 'worst'], lardons: ['spek'], lard: ['spek'], filet: ['filet'],
  poisson: ['vis'], saumon: ['zalm'], thon: ['tonijn'], cabillaud: ['kabeljauw'], crevettes: ['garnalen', 'scampi'], moules: ['mosselen'],
  pizza: ['pizza'], quiche: ['quiche'], soupe: ['soep'], salade: ['salade', 'sla'], sushi: ['sushi'], lasagne: ['lasagne'], burger: ['burger'],
  // Fruits et légumes
  pomme: ['appel'], pommes: ['appel'], poire: ['peer'], banane: ['banaan', 'banan'], orange: ['sinaas', 'appelsien'], citron: ['citroen'],
  fraise: ['aardbei'], fraises: ['aardbei'], framboise: ['framboos', 'framboz'], raisin: ['druif', 'druiven'], peche: ['perzik'], ananas: ['ananas'],
  tomate: ['tomaat', 'tomat'], tomates: ['tomaat', 'tomat'], carotte: ['wortel'], carottes: ['wortel'], oignon: ['ui'], oignons: ['uien'],
  ail: ['look'], poireau: ['prei'], courgette: ['courgette'], aubergine: ['aubergine'], poivron: ['paprika'], champignon: ['champignon'],
  champignons: ['champignon'], epinard: ['spinazie'], epinards: ['spinazie'], chou_fleur: ['bloemkool'], haricot: ['boon', 'bonen'],
  haricots: ['bonen'], petits_pois: ['erwt'], pois: ['erwt'], mais: ['mais'], concombre: ['komkommer'], laitue: ['sla'], avocat: ['avocado'],
  patate: ['aardappel'], pommes_de_terre: ['aardappel'], frites: ['friet', 'frieten'], legumes: ['groente'], fruits: ['fruit'], fruit: ['fruit'],
  // Épicerie
  pates: ['pasta', 'spaghetti', 'penne', 'macaroni'], riz: ['rijst'], farine: ['bloem'], sucre: ['suiker'], sel: ['zout'], poivre: ['peper'],
  huile: ['olie'], olive: ['olijf'], vinaigre: ['azijn'], moutarde: ['mosterd'], mayonnaise: ['mayonaise'], ketchup: ['ketchup'], sauce: ['saus'],
  epices: ['kruiden'], herbes: ['kruiden'], bouillon: ['bouillon'], conserve: ['blik'], noix: ['noot', 'noten'], noisette: ['hazelno'],
  amande: ['amandel'], cacahuete: ['pinda'], chips: ['chips'], chocolat: ['chocola', 'choco'], bonbon: ['snoep'], bonbons: ['snoep'],
  // Boissons
  eau: ['water'], gazeuse: ['bruis'], petillante: ['bruis'], jus: ['sap'], biere: ['bier'], vin: ['wijn'], rouge: ['rood', 'rode'],
  blanc: ['wit', 'witte'], cafe: ['koffie'], the: ['thee'], soda: ['frisdrank'], limonade: ['limonade'],
  // Surgelés
  surgele: ['diepvries'], surgeles: ['diepvries'], glace: ['ijs'], glaces: ['ijs'],
  // Maison, hygiène
  lessive: ['wasmiddel'], adoucissant: ['wasverzachter'], vaisselle: ['afwas', 'vaatwas'], papier: ['papier'], toilette: ['toilet'],
  essuie: ['keukenrol', 'handdoek'], sac: ['zak'], sacs: ['zakken'], savon: ['zeep'], dentifrice: ['tandpasta'], brosse: ['borstel'],
  shampoing: ['shampoo'], deodorant: ['deo'], couches: ['luier'], mouchoirs: ['zakdoek'], eponge: ['spons'], nettoyant: ['reiniger'],
  croquettes: ['brokken', 'kroket'], chat: ['kat'], chien: ['hond'],
  houmous: ['hummus', 'houmous'], hummus: ['hummus'], nouilles: ['noedel', 'noodle'], wrap: ['wrap', 'tortilla'], tortilla: ['tortilla', 'wrap'],
  couscous: ['couscous'], lentilles: ['linzen'], pois_chiches: ['kikkererwt'], olives: ['olijv', 'olijf'], cornichons: ['augurk'],
  sardines: ['sardien'], compote: ['moes', 'compote'], sirop: ['siroop'], coco: ['kokos'], raisins_secs: ['rozijn'], popcorn: ['popcorn'],
  vanille: ['vanille'], caramel: ['karamel', 'caramel'], noel: ['kerst'], paques: ['paas'], aperitif: ['borrel', 'apero'],
  // Qualificatifs
  vert: ['groen'], verte: ['groen'], jaune: ['geel', 'gele'], sale: ['zout', 'gezouten'], fume: ['gerookt'],
  tranche: ['sneden', 'gesneden'], tranches: ['sneden'], light: ['light', 'licht'], epice: ['pikant'], piquant: ['pikant'],
  noir: ['zwart', 'puur'], entier: ['vol'], demi: ['half'], ecreme: ['mager'], bio: ['bio'], sans: ['zonder'],
  vegetarien: ['veggie', 'vegetar'], vegan: ['vegan', 'plantaardig'], petit: ['klein', 'mini'], grand: ['groot'], frais: ['vers'],
};

// Mots trop courants pour aider la recherche.
const STOP = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'au', 'aux', 'a', 'en', 'et', 'pour', 'avec', 'un', 'une', 'of', 'and']);

const singular = (w) => (w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w);

/** Mots d'une recherche, chacun avec ses variantes (français, singulier, néerlandais). */
export function queryTerms(query) {
  const text = norm(query).replace(/pommes de terre/g, 'pommes_de_terre').replace(/petits pois/g, 'petits_pois').replace(/chou[- ]fleur/g, 'chou_fleur')
    .replace(/pois chiches?/g, 'pois_chiches').replace(/raisins secs/g, 'raisins_secs');
  return text.split(/[^a-z0-9_]+/).filter((w) => w && !STOP.has(w)).map((w) => {
    const alts = new Set([w.replace(/_/g, ' '), singular(w)]);
    for (const k of [w, singular(w)]) for (const t of LEXICON[k] ?? []) alts.add(t);
    return [...alts].filter((a) => a.length >= 2);
  });
}

// Lignes du catalogue : [id, nom, contenu, prix, prix unitaire, unité, rayon, promo, au poids]
export const ROW = { id: 0, name: 1, content: 2, price: 3, unitPrice: 4, unit: 5, cat: 6, promo: 7, weight: 8 };

/** Cherche dans le catalogue : les articles qui contiennent le plus de mots cherchés d'abord. */
export function searchCatalog(rows, query, limit = 12) {
  const terms = queryTerms(query);
  if (!terms.length) return [];
  const hits = [];
  for (const r of rows) {
    const name = norm(r[ROW.name]);
    let found = 0;
    let starts = 0;
    let first = false;
    for (const [k, alts] of terms.entries()) {
      let best = 0;
      for (const a of alts) {
        const i = a.length <= 2 ? name.split(/[^a-z0-9]+/).indexOf(a) : name.indexOf(a);
        if (i < 0) continue;
        best = Math.max(best, i === 0 || /[^a-z0-9]/.test(name[i - 1]) ? 2 : 1);
      }
      if (best) { found++; if (best === 2) starts++; if (k === 0) first = true; }
    }
    // Tous les mots, ou au moins la moitié dont le premier (le plus important :
    // « éclairs » dans « éclairs au chocolat »).
    if (found < terms.length && (!first || found < Math.ceil(terms.length / 2))) continue;
    hits.push({ r, score: found * 10 + starts * 3 - name.length / 40 });
  }
  hits.sort((a, b) => b.score - a.score || a.r[ROW.price] - b.r[ROW.price]);
  return hits.slice(0, limit).map((h) => h.r);
}

// Rayons Colruyt → rayons de l'app (indices de CATEGORIES dans data.js).
export const CAT_MAP = {
  'Groenten en fruit': 0, 'Brood/Ontbijt': 1, Zuivel: 2, 'Bereidingen/Charcuterie/Vis/Veggie': 3, 'Colruyt-beenhouwerij': 3,
  'Kruidenierswaren/Droge voeding': 4, Conserven: 4, 'Koeken/Chocolade/Snoep': 4, 'Chips/Borrelhapjes': 4, Diepvries: 5,
  Dranken: 6, Wijn: 6, 'Lichaamsverzorging/Parfumerie': 7, Gezondheid: 7, 'Onderhoud/Huishouden': 8, Baby: 9, Huisdieren: 9,
};
