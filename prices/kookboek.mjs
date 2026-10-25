// Import du « Kookboek » de Wikibooks en néerlandais (nl.wikibooks.org, CC BY-SA 4.0) :
//   node prices/kookboek.mjs <kookboek-raw.json> [sortie.json]
// (relevé brut : prices/fetch-kookboek.mjs). Même principe que prices/wikilivres.mjs :
// ingrédients reliés aux produits de l'app, quantités par personne. Le nom et les étapes
// sont traduits en français à la main dans prices/kookboek-fr.json (clé : titre néerlandais ;
// null = recette écartée ; « ingredients » corrige une quantité mal lue) :
//   node prices/kookboek.mjs <kookboek-raw.json> data/recipes-kookboek.json prices/kookboek-fr.json
import { readFileSync, writeFileSync } from 'node:fs';
import { ING } from '../src/recipes.js';

const n = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function unwiki(s) {
  return String(s ?? '')
    .replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>|<ref[^>]*\/>/g, '').replace(/<[^>]+>/g, '')
    .replace(/\{\{([^{}|]+)\|([^{}]*)\}\}/g, (all, name, args) => {
      const t = name.trim().toLowerCase();
      const parts = args.split('|').filter((x) => !x.includes('=')).map((x) => x.trim()).filter(Boolean);
      return /^(kb|w|ing|ingredient)$/.test(t) ? parts[parts.length - 1] ?? '' : '';
    })
    .replace(/\{\{[^{}]*\}\}/g, '').replace(/\[\[(?:Bestand|File|Afbeelding|Image|Categorie|Category):[^\]]*\]\]/gi, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1').replace(/\[https?:\S+\s([^\]]*)\]/g, '$1')
    .replace(/'{2,}/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
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
const infobox = (text, key) => text.match(new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n|]*)`, 'i'))?.[1]?.trim() ?? '';

// ---------- Quantités ----------
const WORDS = { een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9, tien: 10, twaalf: 12, half: 0.5, halve: 0.5, anderhalf: 1.5, anderhalve: 1.5, paar: 2, enkele: 3, wat: null };
function parseQty(t) {
  t = t.replace(/^(ca\.?|circa|ongeveer|±|~)\s*/i, '');
  let m = t.match(/^(\d+(?:[.,]\d+)?)\s*(?:[/⁄]\s*(\d+))?(?:\s*(?:à|-|–|tot)\s*(\d+(?:[.,]\d+)?))?/);
  if (m && m[0].trim()) {
    let v = Number(m[1].replace(',', '.'));
    if (m[2]) v /= Number(m[2]);
    if (m[3]) v = (v + Number(m[3].replace(',', '.'))) / 2;
    return { qty: v, rest: t.slice(m[0].length).trim() };
  }
  if (/^½/.test(t)) return { qty: 0.5, rest: t.slice(1).trim() };
  m = n(t).match(/^(een|twee|drie|vier|vijf|zes|zeven|acht|negen|tien|twaalf|halve|half|anderhalve|anderhalf|paar|enkele)\b/);
  if (m) return { qty: WORDS[m[1]], rest: t.slice(m[0].length).trim() };
  return { qty: null, rest: t };
}
const UNITS = [
  [/^cm\b/i, 'tiny'],
  [/^(kilogram|kilo|kg)\b\.?/i, 'kg'], [/^(gram|gr|g)\b\.?/i, 'g'], [/^(ons)\b/i, 'ons'], [/^(pond)\b/i, 'pond'],
  [/^(liter|ltr|l)\b\.?/i, 'l'], [/^(deciliter|dl)\b\.?/i, 'dl'], [/^(centiliter|cl)\b\.?/i, 'cl'], [/^(milliliter|ml)\b\.?/i, 'ml'],
  [/^(eetlepels?|el|eetl)\b\.?/i, 'cs'], [/^(theelepels?|tl|theel|koffielepels?)\b\.?/i, 'cc'],
  [/^(snufjes?|mespuntjes?|mespunt|scheutjes?|scheut|beetje|klontjes?|klonten|klont)\b/i, 'tiny'], [/^(kopjes?|koppen|kop|bekertjes?|bekers?|glazen|glas)\b/i, 'tasse'],
  [/^(blikjes?|blikken|blik|tinnetjes?|flesjes?|fles|potjes?|pot|pakjes?|pak|zakjes?|zak|bakjes?|bak|doosjes?|doos)\b/i, 'boite'],
  [/^(tenen|teentjes?|teen)\b/i, 'gousse'], [/^(plakken|plakjes?|plak|stukken|stukjes?|stuks?|bosjes?|bos|takjes?|blaadjes?|bladeren|blad|kroppen|krop|stronkjes?|stronken|stengels?|repen|reep|sneetjes?|sneden)\b/i, 'pc'],
];

// ---------- Ingrédients néerlandais → clés de src/recipes.js ----------
const MAP = [
  [/kokosmelk|kokosroom/, 'lait-coco'], [/limoen/, 'citrons'], [/pindakaas/, 'cacahuete'], [/\btofu\b/, 'tofu'],
  [/sambal|chilisaus/, 'pantry:sauce-pimentee'], [/ketjap|ketchap/, 'pantry:sauce-soja'], [/gemberpoeder|djahe/, 'pantry:gingembre'], [/gember/, 'gingembre', { piece: 20 }],
  [/korianderpoeder|korianderzaad|ketoembar/, 'pantry:coriandre'], [/koriander/, 'pantry:coriandre-fraiche'], [/bonenkruid/, 'pantry:sarriette'], [/foelie/, 'pantry:macis'],
  [/sesamzaad/, 'pantry:graines-de-sesame'], [/sesamolie/, 'pantry:huile-de-sesame'], [/kardemom/, 'pantry:cardamome'], [/saffraan/, 'pantry:safran'], [/\bpiment\b/, 'pantry:quatre-epices'],
  [/speculaaskruiden|koekkruiden|ras el hanout|garam masala/, 'pantry:melange-d-epices'], [/karwij|kappertjes|augurk|maggi|aromat|kerrie ?poeder/, 'pantry:assaisonnement'],
  [/balsamico/, 'pantry:vinaigre-balsamique'], [/marjolein|marjoraan/, 'pantry:marjolaine'], [/tabasco/, 'pantry:sauce-pimentee'], [/uienpoeder/, 'pantry:oignon-en-poudre'],
  [/witte bonen|bruine bonen|\bbonen\b(?! ?kruid)/, 'haricots-rouges'], [/doperwten|erwten|\bpeas\b/, 'legumes-surg'], [/kousenband/, 'haricots-verts'], [/paddenstoel/, 'champignons', { piece: 20 }],
  [/hamburger/, 'steak-burger'], [/kip|haantje|gevogelte/, 'poulet', { piece: 180 }], [/hamlappen|varkens(?!vet)/, 'porc', { piece: 200 }], [/(parma|ardenner|rauwe|gekookte) ?ham/, 'jambon', { piece: 20 }], [/goudreinet|elstar|jonagold/, 'pommes', { piece: 150 }],
  [/pipe rigata|rigatoni|orecchiette|conchiglie/, 'pates'], [/dragon/, 'pantry:estragon'],
  // Introuvables en supermarché belge ou trop rares : recette écartée.
  [/konijn|eend|hert|wild\b|haas(?!je)|fazant|kwartel|lams|lamsvlees|\blam\b|kalfs|kalfsvlees|lever|nier|tong\b|paling|haring|makreel|sardien|ansjovis|forel|kreeft|krab|inktvis|oester|kaviaar|truffel|boerenkool|andijvie|zuurkool|rode kool|witte kool|savooie|spruit|knolselderij|selderij|bleekselderij|pastinaak|venkel|rode biet|biet|raap|koolraap|rabarber|artisjok|asperge|radijs|tuinbonen|capucijners|tempeh|seitan|vega|kruimgehakt|vleesvervanger|trassi|laos|sereh|citroengras|gember(?!poeder)|koriander(?!zaad)|tahin|gelatine|marsepein|amandelspijs|spijs|vla\b|custard|beschuit|speculaas|ontbijtkoek|krenten|sukade|kers\b|kersen|bramen|frambozen|bessen|blauwe bessen|pruimen|abrikoz|perzik|mango|ananas|meloen|druiven|vijgen|dadels|kokos|hazelnot|pistache|cashew|pijnboom|rum|cognac|brandewijn|jenever|likeur|advocaat|port\b|sherry|bier\b|cider|champagne/, 'skip'],
  // Placard.
  [/olijfolie/, 'pantry:huile-d-olive'], [/olie|frituurvet|vet\b|margarine bak/, 'pantry:huile'], [/\bzout\b|zeezout/, 'pantry:sel'], [/peper(?!s)/, 'pantry:poivre'],
  [/nootmuskaat/, 'pantry:muscade'], [/kaneel/, 'pantry:cannelle'], [/paprikapoeder/, 'pantry:paprika'], [/komijn|djinten/, 'pantry:cumin'], [/kurkuma|koenjit/, 'pantry:curcuma'],
  [/kerrie|currypoeder/, 'pantry:curry'], [/chilipoeder|cayenne|chili/, 'pantry:piment'], [/gemberpoeder/, 'pantry:gingembre'], [/kruidnagel/, 'pantry:clous-de-girofle'],
  [/tijm/, 'pantry:thym'], [/rozemarijn/, 'pantry:romarin'], [/laurier/, 'pantry:laurier'], [/oregano/, 'pantry:origan'], [/basilicum/, 'pantry:basilic'],
  [/bieslook/, 'pantry:ciboulette'], [/dille/, 'pantry:aneth'], [/munt/, 'pantry:menthe'], [/salie/, 'pantry:sauge'], [/kruiden/, 'pantry:herbes'],
  [/bouillon/, 'pantry:bouillon'], [/azijn/, 'pantry:vinaigre'], [/mosterd/, 'pantry:moutarde'], [/sojasaus/, 'pantry:sauce-soja'], [/ketchup/, 'pantry:ketchup'],
  [/worcester/, 'pantry:sauce-worcestershire'], [/\bwater\b|ijsblokjes/, 'pantry:eau'], [/wijn/, 'pantry:vin'], [/bakpoeder/, 'pantry:levure-chimique'],
  [/gist/, 'pantry:levure-de-boulanger'], [/vanille/, 'pantry:vanille'], [/maizena|zetmeel/, 'pantry:fecule-de-mais'], [/poedersuiker/, 'pantry:sucre-glace'],
  [/basterdsuiker|bruine suiker|rietsuiker/, 'pantry:cassonade'], [/citroensap/, 'pantry:jus-de-citron'], [/citroenrasp|citroenschil/, 'pantry:zeste-de-citron'],
  // À acheter.
  [/spekblokjes|spekjes|ontbijtspek|bacon|\bspek\b|katenspek/, 'lardons'], [/chorizo/, 'chorizo'], [/\bham\b|hamblokjes|beenham/, 'jambon', { piece: 40 }],
  [/rookworst|braadworst|worst|worstjes|merguez/, 'merguez'], [/rundergehakt|gehakt van rund/, 'boeuf'], [/(?<!fijn)gehakt\b(?!e)/, 'hache'],
  [/biefstuk|steak|entrecote|ossenhaas/, 'steak', { piece: 180 }], [/stoofvlees|runderlappen|rundvlees|riblappen|sukadelappen|rosbief/, 'boeuf-ragout'],
  [/varken|karbonade|speklappen|fricandeau/, 'porc', { piece: 200 }], [/kalkoen/, 'dinde', { piece: 150 }], [/kip|haantje|gevogelte/, 'poulet', { piece: 180 }],
  [/zalm/, 'saumon', { piece: 125 }], [/tonijn/, 'thon', { piece: 80 }], [/kabeljauw|koolvis|witvis|schelvis|tilapia|pangasius|visfilet|\bvis\b/, 'cabillaud', { piece: 150 }],
  [/garnalen|scampi/, 'crevettes', { piece: 15 }], [/mosselen/, 'moules'],
  [/eieren|\bei\b|eidooier|eierdooier|eigeel|eiwit/, 'oeufs', { piece: 1 }], [/kookroom|slagroom|\broom\b|creme fraiche|zure room/, 'creme'], [/kwark/, 'skyr'],
  [/roomkaas|verse kaas|smeerkaas/, 'fromage-frais'], [/yoghurt/, 'yaourts', { piece: 125 }], [/melk/, 'lait'], [/boter(?!ham)|margarine/, 'beurre'],
  [/parmezaan|parmigiano|pecorino/, 'parmesan'], [/mozzarella/, 'mozzarella', { piece: 125 }], [/feta/, 'feta'], [/cheddar/, 'cheddar'],
  [/emmental|gruyere/, 'emmental'], [/kaas/, 'gouda', { piece: 20 }],
  [/tomatenpuree|gepelde tomaten|tomatenblokjes|passata|tomatensaus|gezeefde tomaten/, 'tomates-conc'], [/cherrytomaat|kerstomaat/, 'tomates', { piece: 15 }], [/tomaat|tomaten/, 'tomates', { piece: 120 }],
  [/zoete aardappel/, 'patate-douce', { piece: 300 }], [/aardappel|krieltjes/, 'pdt', { piece: 150 }],
  [/sjalot|lente.?ui|bosui/, 'oignons', { piece: 40 }], [/\buien?\b|ui\b|uitje/, 'oignons', { piece: 100 }], [/knoflook/, 'ail', { piece: 5, gousse: 5 }],
  [/wortel|peen|winterpeen/, 'carottes', { piece: 100 }], [/courgette/, 'courgettes', { piece: 200 }], [/paprika/, 'poivrons', { piece: 150 }], [/aubergine/, 'aubergine'],
  [/broccoli/, 'brocoli', { piece: 400 }], [/champignon/, 'champignons', { piece: 20 }], [/\bprei\b/, 'poireaux', { piece: 200 }], [/spinazie/, 'epinards'], [/witlof/, 'chicons'],
  [/pompoen/, 'courge'], [/bloemkool/, 'chou-fleur'], [/sperziebonen|boontjes|snijbonen/, 'haricots-verts'], [/komkommer/, 'concombre'], [/\bsla\b|ijsbergsla|kropsla/, 'salade'],
  [/avocado/, 'avocats'], [/peterselie/, 'persil'], [/citroen/, 'citrons'], [/sinaasappel/, 'oranges', { piece: 200 }], [/banaan|bananen/, 'bananes', { piece: 120 }],
  [/aardbei/, 'fraises', { piece: 15 }], [/appel|appels/, 'pommes', { piece: 150 }],
  [/lasagnebladen|lasagne/, 'lasagne'], [/spaghetti|pasta|macaroni|penne|tagliatelle|vermicelli|fusilli|farfalle|tortellini/, 'pates'], [/noedels|mie\b|bami/, 'nouilles'],
  [/gnocchi/, 'gnocchi'], [/rijst/, 'riz'], [/couscous/, 'semoule'], [/quinoa/, 'quinoa'], [/linzen/, 'lentilles'], [/kikkererwten/, 'pois-chiches'],
  [/kidneybonen/, 'haricots-rouges'], [/\bmais\b/, 'mais'], [/bladerdeeg/, 'pate-feuil'], [/kruimeldeeg|taartdeeg/, 'pate-brisee'], [/pizzadeeg/, 'pate-pizza'],
  [/tortilla|wraps?/, 'tortillas'], [/paneermeel/, 'chapelure'], [/stokbrood/, 'baguette'], [/\bbrood|boterham/, 'pain', { piece: 40 }],
  [/bloem|meel/, 'farine'], [/suiker/, 'sucre'], [/chocola/, 'chocolat'], [/cacao/, 'cacao'], [/honing/, 'miel'], [/havermout/, 'flocons'],
  [/olijven/, 'olives', { piece: 4 }], [/pesto/, 'pesto'], [/mayonaise/, 'mayonnaise'], [/walnoten|noten/, 'noix'], [/amandel/, 'amandes'], [/rozijnen/, 'raisins-secs'],
];
const TOOL = /\b(koekenpan|spatel|oven|mes|kom|ovenschaal|bakpapier|mixer|zeef|vergiet|maatbeker|hapjespan|garde|keukenpapier|springvorm|deegroller|lepel|vork|keukenmachine|snijplank|pan|braadpan|kookpan|schuimspaan|kwast|bakplaat|ovenwanten|schaal|wafelijzer|staafmixer|pollepel|koksmes|rasp|aluminiumfolie|folie|bakblik|cakevorm|taartvorm|ovenrooster)\b/;
const lookup = (name) => { for (const [re, key, conv] of MAP) if (re.test(name)) return { key, conv: conv ?? {} }; return null; };

export function parseIngredient(line) {
  let t = unwiki(line).replace(/^[*#:\s-]+/, '').replace(/\(([^)]*)\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return { empty: true };
  // Ustensiles listés avec les ingrédients, sous-titres (« Voor de saus: »), phrases d'explication.
  if (/:$/.test(t) || TOOL.test(n(t)) || (!/^[\d½]/.test(t) && t.split(/\s+/).length > 7)) return { empty: true };
  const optional = /naar smaak|eventueel|optioneel|ter garnering|voor de garnering|naar keuze/i.test(t);
  let { qty, rest } = parseQty(t);
  rest = rest.replace(/^(groot|grote|klein|kleine|flink|flinke|ruim|ruime)\s+/i, '');
  let unit = null;
  for (const [re, u] of UNITS) { const m = rest.match(re); if (m) { unit = u; rest = rest.slice(m[0].length).trim(); break; } }
  rest = rest.replace(/^(groot|grote?|kleine?|middelgrote?|verse?|gedroogde?|fijne?|halve)\s+/i, '');
  const alts = n(rest.split(/,| en | voor |;|:/)[0]).split(/ of /);
  const hits = alts.map(lookup);
  const hit = hits.find((h) => h && h.key !== 'skip') ?? hits[0] ?? lookup(n(rest));
  if (!hit || hit.key === 'skip') return optional ? { pantry: true, key: 'assaisonnement' } : null;
  if (hit.key.startsWith('pantry:')) return { pantry: true, key: hit.key.slice(7) };
  const def = ING[hit.key];
  if (!def) return null;
  const target = def.pack[1];
  const c = hit.conv;
  const q = qty ?? (unit === 'tiny' ? null : target === 'pc' ? 1 : null);
  if (q == null || unit === 'tiny') {
    if (['beurre', 'sucre', 'farine', 'lait', 'miel', 'creme', 'persil', 'chapelure', 'parmesan', 'gouda'].includes(hit.key)) return { pantry: true, key: hit.key };
    if (c.piece || target === 'pc') return { key: hit.key, total: target === 'pc' ? 1 : c.piece };
    return { key: hit.key, total: Math.min(250, def.pack[0] / 4) }; // « wat kaas » : un quart de paquet
  }
  const g = { g: 1, kg: 1000, ons: 100, pond: 500 }[unit];
  const ml = { ml: 1, cl: 10, dl: 100, l: 1000 }[unit];
  let amount;
  if (target === 'g') {
    amount = g ? q * g : ml ? q * ml : unit === 'cs' ? q * 15 : unit === 'cc' ? q * 5 : unit === 'tasse' ? q * 150 : unit === 'boite' ? q * 400
      : unit === 'gousse' ? q * (c.gousse ?? 5) : (!unit || unit === 'pc') ? q * (c.piece ?? 100) : null;
  } else if (target === 'ml') {
    amount = ml ? q * ml : g ? q * g : unit === 'cs' ? q * 15 : unit === 'cc' ? q * 5 : unit === 'tasse' ? q * 200 : unit === 'boite' ? q * 400 : null;
  } else {
    amount = (!unit || unit === 'pc' || unit === 'gousse') ? q : unit === 'boite' ? q : g ? (q * g) / (c.piece ?? 100) : unit === 'cs' ? q * 0.1 : null;
  }
  if (amount == null || !(amount > 0)) return null;
  if (['sucre', 'farine', 'miel', 'beurre', 'lait', 'creme'].includes(hit.key) && amount <= (hit.key === 'lait' || hit.key === 'creme' ? 20 : 15)) return { pantry: true, key: hit.key };
  return { key: hit.key, total: amount };
}

const SKIP_TITLE = /saus|dressing|vinaigrette|jam|confituur|gelei|siroop|limonade|thee|koffie|cocktail|likeur|jenever|bowl|punch|bouillon|fond|marinade|kruiden|kruidenmix|boter\b|deeg|brood|technieken|bereidings|benodigdheden|keuken|menu|categorie|lunch|brunch|borrel|dessertbuffet|geschiedenis|tips|smaakmaker|zout|olie en vet|chutney|piccalill|ketchup|^roux$|niter|^kwast$|fudge|chocoladepasta|kandeel|salsa|^souffle$|^cake$|^[a-z]$/i;
const DESSERT = /nagerecht|dessert|gebak|taart|cake|koek|koekjes|wafel|pudding|vla|ijs\b|mousse|pannenkoe|poffertjes|appelbol|tompoes|soezen|bavarois|tiramisu|compote|crumble|flensjes|zoete/i;
const LUNCH = /salade|voorgerecht|soep|sandwich|tosti|broodje|hapje/i;
const BREAKFAST = /ontbijt|pap\b|havermoutpap/i;
const FAR = /babi|moqueca|kousenband|surinaam|indonesi|indisch|chinees|chinese|japans|thai|vietnam|koreaans|indiaas|marokkaans|turks|grieks|mexicaans|caribisch|antilliaans|afrikaans|arabisch|libanees|roti|nasi|bami|saté|sate|loempia|pindasoep|moksi|pom\b|dolma|stifado|vasilopita|gemista|tzatziki|aloo|potjiekos|pão|fatányéros|königsberger/i;

function toolsOf(t) {
  t = n(t);
  const tools = [];
  if (/\boven\b|voorverwarm|gratineer|ovenschaal/.test(t)) tools.push('four');
  if (/pan\b|koekenpan|braadpan|kookpan|wok|aan de kook|koken|bakken|fruit|fruiten|smoren|sudderen|roerbak|vuur/.test(t)) tools.push('plaques');
  if (/magnetron/.test(t) && !tools.length) tools.push('micro');
  if (/staafmixer|blender|keukenmachine|mixer|pureer/.test(t)) tools.push('mixeur');
  if (!tools.length && /gaar|verwarm|bak/.test(t)) tools.push('plaques|four');
  return tools;
}
const NO_TOOL = /barbecue|bbq|frituurpan|friteuse|ijsmachine|broodbakmachine|gourmet|fondue|rookoven|sous.vide/i;

export function importKookboek(pages) {
  const out = [];
  const seen = new Set();
  const reasons = {};
  const why = (r) => { reasons[r] = (reasons[r] ?? 0) + 1; };
  for (const p of pages) {
    const path = p.title.replace(/^Kookboek\//, '');
    if (path.includes('/')) { why('sous-page'); continue; }
    const name = path.replace(/\s*\(.*\)\s*$/, '').trim();
    if (SKIP_TITLE.test(name)) { why('titre'); continue; }
    const key = n(name).replace(/[^a-z]/g, '');
    if (seen.has(key)) { why('doublon'); continue; }
    const secs = sections(p.text);
    const ingSecs = pick(secs, /ingredient/).length ? /ingredient/ : /benodigdheden|wat heb je nodig/;
    const ingLines = pick(secs, ingSecs).filter((l) => /^\s*[*#]/.test(l));
    const stepLines = pick(secs, /bereiding|werkwijze|recept|instructies|methode/).map((l) => unwiki(l.replace(/^[*#:\s]+/, ''))).filter((l) => l.length > 3);
    if (ingLines.length < 3 || ingLines.length > 22 || !stepLines.length) { why('structure'); continue; }
    const text = stepLines.join(' ');
    if (NO_TOOL.test(text)) { why('appareil'); continue; }
    const parsed = ingLines.map(parseIngredient).filter((x) => !x?.empty);
    if (parsed.some((x) => x === null)) { why('ingrédient introuvable'); continue; }
    const servings = Math.min(24, Math.max(1, Number(infobox(p.text, 'Porties').match(/\d+/)?.[0]) || 4));
    const totals = new Map();
    for (const x of parsed) if (!x.pantry) totals.set(x.key, (totals.get(x.key) ?? 0) + x.total);
    if (totals.size < 2) { why('trop simple'); continue; }
    const per = [...totals].map(([k, total]) => [k, total / servings]);
    if (per.some(([k, a]) => { const u = ING[k].pack[1]; return u === 'pc' ? a > 6 || a < 0.02 : a > 900 || a < 1; })) { why('quantités'); continue; }
    const cat = `${infobox(p.text, 'Categorie')} ${p.cats.join(' ')}`;
    const savory = [...totals.keys()].some((k) => /[mf]/.test(ING[k].flags ?? '') || ['tomates', 'oignons', 'ail', 'pdt', 'courgettes', 'poivrons', 'brocoli', 'champignons', 'poireaux', 'epinards', 'chicons', 'gouda'].includes(k));
    const sweet = ['sucre', 'chocolat', 'cacao', 'miel'].some((k) => totals.has(k)) || parsed.some((x) => x.pantry && /sucre|cassonade|vanille/.test(x.key));
    const type = !savory && (sweet || DESSERT.test(`${name} ${cat}`)) ? 'dessert' : BREAKFAST.test(`${name} ${cat}`) ? 'petitdej' : LUNCH.test(`${name} ${cat}`) ? 'midi' : 'plat';
    const tools = toolsOf(text);
    const time = n(infobox(p.text, 'Tijd'));
    const h = time.match(/(\d+(?:[.,]\d+)?)\s*(uur|u\b)/) ?? (/(een|1) uur/.test(time) ? [0, '1'] : null);
    const mm = time.match(/(\d+)\s*min/);
    const minutes = Math.min(24 * 60, (h ? Number(String(h[1]).replace(',', '.')) * 60 : 0) + (mm ? Number(mm[1]) : 0) || 15 + stepLines.length * 5 + (tools.includes('four') ? 30 : 0));
    const round = (x, u) => (u === 'pc' ? Math.round(x * 100) / 100 : Math.max(1, Math.round(x)));
    const pantry = [...new Set(parsed.filter((x) => x.pantry).map((x) => x.key))];
    const ingredients = [...per.map(([k, a]) => `${k}:${round(a, ING[k].pack[1])}${ING[k].pack[1]}`), ...pantry.map((k) => `~${k}`)].join(' ');
    const image = infobox(p.text, 'Afbeelding').match(/(?:Bestand|File|Afbeelding):([^|\]]+)/i)?.[1]?.trim() ?? '';
    seen.add(key);
    out.push({ nl: name, type, minutes, tools: tools.join(' '), ingredients, stepsNl: stepLines.join(' ').slice(0, 2000),
      src: `https://nl.wikibooks.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`, fam: FAR.test(`${name} ${cat}`) ? 0 : 1, image });
    why('gardée');
  }
  return { recipes: out, reasons };
}

if (process.argv[1]?.endsWith('kookboek.mjs') && process.argv[2]) {
  const { recipes, reasons } = importKookboek(JSON.parse(readFileSync(process.argv[2], 'utf8')));
  console.log(reasons);
  const byType = {};
  for (const r of recipes) byType[r.type] = (byType[r.type] ?? 0) + 1;
  console.log(byType, 'découverte :', recipes.filter((r) => !r.fam).length);
  const fr = process.argv[4] ? JSON.parse(readFileSync(process.argv[4], 'utf8')) : null;
  if (fr) {
    // Recettes traduites seulement, au format des autres fichiers importés.
    const rows = recipes.filter((r) => fr[r.nl]).map((r) => [fr[r.nl].name, r.type, r.minutes, r.tools, fr[r.nl].ingredients ?? r.ingredients, fr[r.nl].steps, r.src, r.fam]);
    const todo = recipes.filter((r) => !(r.nl in fr)).map((r) => r.nl);
    if (todo.length) console.log(`À traduire (${todo.length}) :`, todo.join(', '));
    writeFileSync(process.argv[3], `[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]\n`);
    console.log(`Écrit : ${process.argv[3]} — ${rows.length} recettes`);
  } else if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(recipes, null, 1));
}
