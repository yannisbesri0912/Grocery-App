// Traduction des noms d'articles Colruyt (néerlandais) en français, mot à mot
// avec un dictionnaire alimentaire. Utilisé par le robot de nuit pour le
// catalogue : l'app affiche et cherche les noms en français.
// Les mots inconnus (marques, anglais, italien…) restent tels quels.

// Mot néerlandais → français. « a: » = qualificatif, placé après le nom en français.
const N = {
  // Produits laitiers, œufs
  melk: 'lait', halfvolle: 'a:demi-écrémé', halfvol: 'a:demi-écrémé', volle: 'a:entier', vol: 'a:entier', magere: 'a:écrémé', mager: 'a:maigre',
  karnemelk: 'babeurre', chocomelk: 'lait chocolaté', groeimelk: 'lait de croissance', yoghurt: 'yaourt', yogh: 'yaourt', drinkyoghurt: 'yaourt à boire',
  kaas: 'fromage', kazen: 'fromages', smeerkaas: 'fromage à tartiner', roomkaas: 'fromage frais', geitenkaas: 'fromage de chèvre', boter: 'beurre',
  melkerijboter: 'beurre de laiterie', room: 'crème', zure: 'a:aigre', slagroom: 'crème fouettée', roomijs: 'crème glacée', ijs: 'glace',
  eieren: 'œufs', ei: 'œuf', scharreleieren: 'œufs de poules au sol', pudding: 'pudding', rijstpap: 'riz au lait', platte: 'a:plat', belegen: 'a:affiné', jong: 'a:jeune', jonge: 'a:jeune', oude: 'a:vieux',
  geraspt: 'a:râpé', geraspte: 'a:râpé', sneetjes: 'a:en tranches', sneden: 'a:en tranches', plakjes: 'a:en tranches', margarine: 'margarine', roomdessert: 'dessert à la crème',
  // Viande, poisson
  kip: 'poulet', kippen: 'poulet', bil: 'cuisse', kippenbil: 'cuisse de poulet', kipnuggets: 'nuggets de poulet', kippensoep: 'soupe au poulet', kipfilet: 'filet de poulet', kippenbouten: 'cuisses de poulet', gevogelte: 'volaille', kalkoen: 'dinde', eend: 'canard', rund: 'bœuf',
  rundvlees: 'bœuf', varken: 'porc', varkensvlees: 'porc', kalf: 'veau', lam: 'agneau', vlees: 'viande', gehakt: 'haché', ham: 'jambon', beenham: 'jambon à l\'os',
  spek: 'lard', spekblokjes: 'lardons', worst: 'saucisse', worsten: 'saucisses', balletjes: 'boulettes', schnitzel: 'escalope', filet: 'filet', biefstuk: 'steak',
  vis: 'poisson', zalm: 'saumon', zalmfilet: 'filet de saumon', tonijn: 'thon', kabeljauw: 'cabillaud', garnalen: 'crevettes', scampi: 'scampi',
  mosselen: 'moules', haring: 'hareng', kipsalade: 'salade de poulet', paté: 'pâté', vleesbrood: 'pain de viande', gerookt: 'a:fumé', gerookte: 'a:fumé',
  graatloos: 'a:sans arêtes', graatl: 'a:sans arêtes', gepeld: 'a:décortiqué', gepelde: 'a:pelé', gekookte: 'a:cuit', gekookt: 'a:cuit', bereid: 'a:préparé',
  americain: 'américain', parijse: 'a:parisien', gyros: 'gyros',
  // Fruits et légumes
  groenten: 'légumes', groente: 'légume', fruit: 'fruits', vruchten: 'fruits', appel: 'pomme', appels: 'pommes', appelen: 'pommes', peer: 'poire', peren: 'poires',
  banaan: 'banane', bananen: 'bananes', sinaasappel: 'orange', sinaasappelen: 'oranges', sinaasappels: 'oranges', appelsienen: 'oranges', appelsien: 'orange', sinaas: 'orange', eet: '-', pers: 'a:à presser', citroen: 'citron', citroenen: 'citrons',
  limoen: 'citron vert', aardbei: 'fraise', aardbeien: 'fraises', framboos: 'framboise', frambozen: 'framboises', framb: 'framboise', kers: 'cerise', kersen: 'cerises',
  bosbes: 'myrtille', bosbessen: 'myrtilles', bosvruchten: 'fruits des bois', druiven: 'raisins', perzik: 'pêche', abrikoos: 'abricot', abrikozen: 'abricots',
  pruimen: 'prunes', vijgen: 'figues', rozijnen: 'raisins secs', passievrucht: 'fruit de la passion', ananas: 'ananas', mango: 'mangue', kiwi: 'kiwi',
  tomaat: 'tomate', tomaten: 'tomates', tomatenstukjes: 'tomates en morceaux', tomatenpuree: 'concentré de tomates', tomatensaus: 'sauce tomate',
  wortel: 'carotte', wortelen: 'carottes', uien: 'oignons', ui: 'oignon', look: 'ail', knoflook: 'ail', prei: 'poireau', sla: 'salade', kropsla: 'laitue',
  komkommer: 'concombre', paprika: 'poivron', courgette: 'courgette', aubergine: 'aubergine', champignons: 'champignons', champignon: 'champignon',
  spinazie: 'épinards', bladspinazie: 'épinards en branches', broccoli: 'brocoli', bloemkool: 'chou-fleur', kool: 'chou', witloof: 'chicons',
  biet: 'betterave', bonen: 'haricots', prinsessenbonen: 'haricots princesse', erwten: 'pois', doperwten: 'petits pois', linzen: 'lentilles',
  kikkererwten: 'pois chiches', maïs: 'maïs', mais: 'maïs', asperges: 'asperges', pompoen: 'potiron', aardappel: 'pomme de terre',
  aardappelen: 'pommes de terre', aardappelpuree: 'purée de pommes de terre', frieten: 'frites', wokgroenten: 'légumes pour wok', soepgroenten: 'légumes pour soupe',
  olijven: 'olives', avocado: 'avocat', rucola: 'roquette', peterselie: 'persil', bieslook: 'ciboulette', basilicum: 'basilic', tijm: 'thym',
  munt: 'menthe', gember: 'gingembre', kokos: 'coco', noten: 'noix', hazelnoot: 'noisette', hazelnoten: 'noisettes', hazeln: 'noisette',
  amandel: 'amande', amandelen: 'amandes', pinda: 'cacahuète', pindas: 'cacahuètes', pistache: 'pistache', verse: 'a:frais', vers: 'a:frais', dagvers: 'a:frais du jour',
  gedroogde: 'a:séché', gedroogd: 'a:séché', ontpit: 'a:dénoyauté', los: 'a:en vrac', appelcompote: 'compote de pommes', moes: 'compote',
  // Épicerie
  brood: 'pain', stokbrood: 'baguette', bruin: 'a:gris', wit: 'a:blanc', witte: 'a:blanc', volkoren: 'a:complet', tarwe: 'froment', spelt: 'épeautre',
  koek: 'biscuit', koeken: 'biscuits', koekjes: 'biscuits', wafels: 'gaufres', wafel: 'gaufre', boterwafels: 'gaufres au beurre', luikse: 'a:liégeoise',
  kaneel: 'cannelle', kaneelrol: 'roulé à la cannelle', kaneelbroodjes: 'petits pains à la cannelle', chocoladebroodjes: 'pains au chocolat',
  croissants: 'croissants', pistolets: 'pistolets', beschuit: 'biscottes', rijstwafel: 'galette de riz', rijstwafels: 'galettes de riz', toast: 'toast',
  ontbijtgranen: 'céréales', granen: 'céréales', vlokken: 'flocons', haver: 'avoine', havermout: 'flocons d\'avoine',
  rijst: 'riz', langkorrelrijst: 'riz long grain', bloem: 'farine', suiker: 'sucre', kristalsuiker: 'sucre cristallisé', zout: 'sel', zeezout: 'sel de mer',
  peper: 'poivre', kruiden: 'épices', kruid: 'herbe', olie: 'huile', olijfolie: 'huile d\'olive', frituurolie: 'huile de friture', azijn: 'vinaigre',
  mosterd: 'moutarde', mayonaise: 'mayonnaise', saus: 'sauce', pastasaus: 'sauce pour pâtes', soep: 'soupe', bouillon: 'bouillon', blokjes: 'cubes', blokje: 'cube',
  confituur: 'confiture', gelei: 'gelée', honing: 'miel', siroop: 'sirop', chocopasta: 'pâte à tartiner choco', hazelnootpasta: 'pâte à tartiner noisette',
  pindakaas: 'beurre de cacahuète', chocolade: 'chocolat', melkchocolade: 'chocolat au lait', puur: 'a:noir', pure: 'a:noir', reep: 'barre', repen: 'barres',
  pralines: 'pralines', snoep: 'bonbons', marsepein: 'massepain', bladerdeeg: 'pâte feuilletée', deeg: 'pâte', noedels: 'nouilles', tomatenpulp: 'pulpe de tomates',
  zoetzuur: 'a:aigre-douce', pickles: 'pickles', poeder: 'poudre', gemalen: 'a:moulu', bonen_: 'grains', korrels: 'grains', vierkant: 'a:carré',
  // Boissons
  water: 'eau', plat: 'a:plate', bruisend: 'a:pétillante', bruisende: 'a:pétillante', sap: 'jus', sinaasappelsap: 'jus d\'orange', appelsap: 'jus de pomme',
  frisdrank: 'soda', limonade: 'limonade', bier: 'bière', abdijbier: 'bière d\'abbaye', wijn: 'vin', rood: 'a:rouge', rode: 'a:rouge', roze: 'a:rosé',
  koffie: 'café', oploskoffie: 'café soluble', ijskoffie: 'café glacé', thee: 'thé', zwarte: 'a:noir', groene: 'a:vert', groen: 'a:vert',
  sojadrink: 'boisson soja', haverdrink: 'boisson avoine', amandeldrink: 'boisson amande', energiedrank: 'boisson énergisante', alcoholvrij: 'a:sans alcool',
  bak: 'casier', fles: 'bouteille', flessen: 'bouteilles', blik: 'a:en boîte', blikjes: 'canettes', brik: 'brique', glas: 'verre', pils: 'pils',
  // Maison, hygiène
  wasmiddel: 'lessive', wasm: 'lessive', waspoeder: 'lessive en poudre', wasverzachter: 'adoucissant', wasverz: 'adoucissant', afwasmiddel: 'liquide vaisselle',
  handafwas: 'vaisselle à la main', vaatwastabletten: 'tablettes lave-vaisselle', allesreiniger: 'nettoyant multi-usage', allesr: 'nettoyant multi-usage',
  javel: 'javel', toiletpapier: 'papier toilette', keukenrol: 'essuie-tout', keukenpapier: 'essuie-tout', zakdoekjes: 'mouchoirs', zakdoeken: 'mouchoirs',
  vuilniszakken: 'sacs poubelle', sponsen: 'éponges', schuursponsen: 'éponges à récurer', spons: 'éponge', handzeep: 'savon pour les mains', zeep: 'savon',
  douchegel: 'gel douche', tandpasta: 'dentifrice', tandenborstel: 'brosse à dents', luiers: 'langes', maandverband: 'serviettes hygiéniques',
  inlegkruisjes: 'protège-slips', luchtverfr: 'désodorisant', navulling: 'recharge', kattenbakvulling: 'litière pour chat', kat: 'chat', katten: 'chats', hond: 'chien',
  honden: 'chiens', brokken: 'croquettes', voeding: 'nourriture', voed: 'nourriture',
  // Mots de liaison et qualificatifs
  met: '+avec', zonder: '+sans', in: '+en', op: '+sur', van: '+de', voor: '+pour', en: '+et', of: '+ou',
  zoet: 'a:doux', zoete: 'a:doux', zout_: 'a:salé', gezouten: 'a:salé', ongezouten: 'a:non salé', pikant: 'a:piquant', mild: 'a:doux', zacht: 'a:doux',
  zachte: 'a:doux', fijn: 'a:fin', fijne: 'a:fin', grof: 'a:gros', grote: 'a:grand', groot: 'a:grand', klein: 'a:petit', kleine: 'a:petit', halve: 'a:demi',
  hele: 'a:entier', geroosterd: 'a:grillé', gegrild: 'a:grillé', gevulde: 'a:fourré', gesneden: 'a:coupé', vloeibaar: 'a:liquide', romig: 'a:crémeux',
  lichte: 'a:léger', licht: 'a:léger', vetarm: 'a:allégé', suikervrij: 'a:sans sucre', glutenvrij: 'a:sans gluten', lactosevrij: 'a:sans lactose',
  plantaardig: 'a:végétal', plantaardige: 'a:végétal', belgische: 'a:belge', franse: 'a:français', italiaanse: 'a:italien', griekse: 'a:grecque', grieks: 'a:grec',
  diepvries: 'a:surgelé', diepvrieszak: 'sac surgelé', voorgebakken: 'a:précuit', klassiek: 'a:classique', natuur: 'a:nature', eigen: 'a:propre',
  vrije: 'a:plein air', uitloop: 'a:plein air', droge: 'a:sec', zuivere: 'a:pur', blauwe: 'a:bleu', gele: 'a:jaune', geel: 'a:jaune',
  stuks: 'pièces', stukjes: 'morceaux', stuk: 'pièce', zakje: 'sachet', zak: 'sac', doos: 'boîte', pot: 'pot', bokaal: 'bocal', vlootje: 'barquette', schotel: 'plat',
  gerecht: 'plat', maaltijd: 'repas', jaar: 'an',
  stokjes: 'bâtonnets', schijven: 'tranches', schijfjes: 'rondelles', blok: 'bloc', pastei: 'pâté', abdij: 'abbaye', keuken: 'cuisine', keukenzout: 'sel de cuisine',
  jodium: 'a:iodé', ochtendfris: 'a:fraîcheur du matin', choc: 'chocolat', karam: 'caramel', karamel: 'caramel', vrij: 'a:plein air', uitloop: '-', uitloopm: '-',
  soezen: 'choux', roomsoezen: 'choux à la crème', chocoroomsoezen: 'choux à la crème chocolat', taart: 'tarte', taartje: 'tartelette', gebak: 'pâtisserie',
  cake: 'cake', koffiekoeken: 'viennoiseries', koffiekoek: 'viennoiserie', pannenkoeken: 'crêpes', ontbijt: 'petit-déjeuner', snoepjes: 'bonbons',
  zalmsnippers: 'émincés de saumon', hamburgers: 'hamburgers', gehaktballen: 'boulettes', vleeswaren: 'charcuterie', kippenwit: 'blanc de poulet',
  kalkoenfilet: 'filet de dinde', varkensgehakt: 'haché de porc', rundsgehakt: 'haché de bœuf', gemengd: 'a:mixte', gemengde: 'a:mixte',
  dikke: 'a:épais', dunne: 'a:fin', krokante: 'a:croustillant', krokant: 'a:croustillant', zuur: 'a:aigre', zuurdesem: 'levain',
  ijsthee: 'thé glacé', theezakjes: 'sachets de thé', capsules: 'capsules', bonen_koffie: '-', koffiebonen: 'café en grains', melkpoeder: 'lait en poudre',
};
const DICT = Object.fromEntries(Object.entries(N).filter(([k]) => !k.endsWith('_')));
const WORD = /^[a-zà-ÿ]+$/i;
const vowel = (s) => /^[aeiouyhàâéèêîôœ]/i.test(s);

function lookup(w) {
  return DICT[w.toLowerCase()] ?? null;
}

// Un mot, éventuellement composé avec des tirets (« witloof-ham-kaas »).
function translateWord(core) {
  if (core.includes('-') || core.includes('/')) {
    const parts = core.split(/([-/])/);
    let any = false;
    const tr = parts.map((x) => {
      if (x === '-' || x === '/') return x;
      const t = WORD.test(x) ? lookup(x) ?? compound(x) : null;
      if (!t || t === '-' || t.startsWith('+')) return x;
      any = true;
      return t.replace(/^[an]:/, '');
    });
    return any ? `n:${tr.join('').replace(/-/g, ' - ').replace(/ - /g, '-')}` : null;
  }
  return WORD.test(core) ? lookup(core) ?? compound(core) : null;
}

// Mot composé inconnu (« kaneelstokjes ») : deux mots connus → « bâtonnets de cannelle ».
function compound(w) {
  const low = w.toLowerCase();
  for (let i = low.length - 3; i >= 3; i--) {
    const head = lookup(low.slice(i));
    let mod = lookup(low.slice(0, i)) ?? lookup(low.slice(0, i - 1)); // « kippen|soep », « zalm|s|… »
    if (!head || !mod || head.startsWith('+') || mod.startsWith('+')) continue;
    const h = head.replace(/^a:/, '');
    mod = mod.replace(/^a:/, '');
    return head.startsWith('a:') ? `n:${mod} ${h}` : `n:${h} ${vowel(mod) ? 'd\'' : 'de '}${mod}`;
  }
  return null;
}

/** Nom néerlandais → nom français (marque et contenance gardées). */
export function toFrench(name) {
  // Nom tout en majuscules (« GEHAKT VARKEN RUND ») : pas de marque, on traduit tout.
  const allCaps = !/[a-z]{3,}/.test(name);
  const tokens = (allCaps ? name.toLowerCase() : name).split(/\s+/).filter(Boolean);
  const out = [];
  let i = 0;
  // Marque en tête : mots en majuscules (« BONI », « CÔTE D'OR »).
  while (i < tokens.length - 1 && /^[A-ZÀ-Ý0-9&'.\-+]{2,}$/.test(tokens[i]) && /[A-Z]/.test(tokens[i])) out.push(tokens[i++]);
  const body = [];
  let pending = []; // qualificatifs en attente de leur nom
  let changed = false;
  const flush = () => { body.push(...pending); pending = []; };
  for (; i < tokens.length; i++) {
    const t = tokens[i];
    const core = t.replace(/[.,;:!?]+$/, '');
    let tr = translateWord(core);
    if (!tr) { flush(); body.push(t); continue; }
    changed = true;
    if (tr === '-') continue;
    if (tr.startsWith('+')) { flush(); body.push(tr.slice(1)); continue; }
    if (tr.startsWith('a:')) { pending.push(tr.slice(2)); continue; }
    tr = tr.replace(/^n:/, '');
    body.push(tr);
    flush();
  }
  flush();
  if (!changed) return name;
  const text = body.join(' ').replace(/\bde ([aeiouyhàâéèêîôœ])/gi, 'd\'$1').replace(/\bde le\b/g, 'du');
  return out.length ? `${out.join(' ')} ${text}` : text.charAt(0).toUpperCase() + text.slice(1);
}
