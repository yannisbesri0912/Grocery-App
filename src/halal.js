// Mode halal (Réglages ou Plats → « Halal ») : pas de porc ni d'alcool dans
// les recettes, et la viande fraîche ne s'achète pas au supermarché (elle n'y
// est en général pas halal) : elle part sur la liste du boucher halal.
// Seuls les articles marqués « halal » restent achetables en magasin.
import { norm } from './matcher.js';

const HALAL = /\bhalal\b/;
const FISH = /saumon|zalm|thon|tonijn|cabillaud|kabeljauw|poisson|\bvis\b|crevette|garnaal|garnalen|scampi|moule|mossel|calamar|inktvis|truite|forel|hareng|haring|maquereau|makreel|sardine|surimi|crabe|\bkrab|homard|kreeft|anchois|ansjovis|colin|koolvis|pangasius|tilapia|dorade|zeebaars|\bsole\b|\btong\b|\bplie\b|schol|fruits de mer|zeevruchten|huitre|oester|saint-jacques|sint-jakobs|gamba|poulpe|octopus|vegan|\bvege|veggie|vegetar|vegetal|plant|tofu|quorn|\bsoja\b|tempeh|falafel/;
const PORK = /\bporc|varken|jambon|\bham\b|\blard|\bspek\b|bacon|chorizo|salami|saucisson|pancetta|prosciutto|serrano|coppa|mortadel|rillette|gelatine|pate de foie|pate de campagne|pate ardennais|pastei|cervelas|boudin|bloedworst|\bribs|cobourg|guanciale|everzwijn|sanglier|marcassin|casseler|kassler|\bfuet|\bbabi\b|croque monsieur|geperste kop|frankfurt/;
const NOT_PORK = /dinde|kalkoen|poulet|\bkip|volaille|gevogelte|b(oe|œ)uf|\brund|agneau|\blam\b|canard|\beend|vegan|\bvege|veggie|vegetar|plant/;
const MEAT = /poulet|\bkip|dinde|kalkoen|b(oe|œ)uf|\brund|\bveau\b|\bkalf|agneau|\blam\b|lamsvlees|mouton|viande|vlees|gehakt|steak|biefstuk|merguez|saucisse|worst\b|\bboulette|balletje|bolognaise|bolognese|burger|kebab|gyros|shoarma|nuggets|cordon bleu|canard|\beend|lapin|konijn|carbonnade|stoofvlees|escalope|americain/;
// Morceaux de viande fraîche (rayon boucherie) sans nom d'animal.
const CUTS = /\bhache|\bcote|kotelet|\bfilet|\broti|gebraad|cuisse|\bpilon|\bailes?\b|vleugel|rollade|gibier|\bcerf|\bhert|biche|caille|pintade|faisan|magret|\bfoie|\blever|chipolata|brochette|spies|blanquette|osso|\bribs|travers|tournedos|entrecote|rumsteak|\bonglet|bavette|cobourg|boulet|vol-au-vent|videe/;
// Plats préparés du rayon traiteur : pas pour le boucher.
const PREPARED = /spaghetti|lasagne|macaroni|penne|pates|pasta|ravioli|tortel|soupe|potage|pizza|quiche|salade|croque|wrap|sandwich|nasi|bami|\briz\b|rijst|puree|stoemp|hutsepot|gratin|ballotin|bouchee|vol-au-vent|loempia|nem\b|curry|poke|bowl/;
const ALCOHOL = /\bbiere|\bbier\b|\bvin\b|\bvins\b|\bwijn|whisky|vodka|\brhum|\brum\b|\bgin\b|cava|champagne|prosecco|porto|martini|liqueur|likeur|\bcidre|cider|cognac|armagnac|calvados|jenever|genievre|tequila|sangria|\bkriek|\bgueuze|\btriple|\bpils|\babbaye|\bblonde\b|\bbrune\b|\bipa\b|\bsake\b|\bvermouth|apero|\balc\b/;
// Degré d'alcool écrit (« 8,6% », « 6,2%vol ») : de 0,6 à 80 % (pas « 100% jus »).
const DEGREE = /(?<![\d.,<])(\d{1,2}(?:[.,]\d+)?)\s*%/g;
const hasDegree = (t) => [...t.matchAll(DEGREE)].some((m) => { const v = Number(m[1].replace(',', '.')); return v >= 0.6 && v < 80; });
const NO_ALCOHOL = /sans alcool|alcoholvrij|alcohol free|(?<![\d.,])0(?:[.,]0)?\s*%|<\s*0[.,]5|vinaigre|azijn|\bjus\b|\bsap\b|sirop|siroop/;
// Morceaux qu'un boucher halal fait en version halal (dinde, bœuf) : ils
// partent chez lui. Les morceaux de porc (côtelettes, rôti…) n'ont pas d'équivalent.
const SWAP = /hache|gehakt|burger|saucisse|\bworst|jambon|\bham\b|\blard|\bspek\b|bacon|chorizo|salami|merguez/;

/**
 * Que faire d'un article en mode halal ?
 * → 'butcher' (viande fraîche : chez le boucher halal), 'pork' (porc ou
 *   gélatine), 'meat' (plat préparé avec de la viande : sans doute pas halal),
 *   'alcohol' (boisson alcoolisée) ou null.
 */
export function halalKind(name, cat) {
  const t = norm(name);
  if (HALAL.test(t) || cat === 9 || cat === 7 || cat === 8) return null; // marqué halal, animaux, hygiène, entretien
  if (cat === 6) return (ALCOHOL.test(t) || hasDegree(t)) && !NO_ALCOHOL.test(t) ? 'alcohol' : null;
  const pork = PORK.test(t) && !NOT_PORK.test(t);
  const meat = MEAT.test(t) && !FISH.test(t);
  if (cat === 3 && !FISH.test(t) && (pork || meat || CUTS.test(t))) return pork && !SWAP.test(t) ? 'pork' : PREPARED.test(t) ? (pork ? 'pork' : 'meat') : 'butcher';
  if (pork) return 'pork';
  return meat ? 'meat' : null;
}

// Nom à demander au boucher pour les produits de l'app et les ingrédients des recettes.
export const BUTCHER_NAMES = {
  hache: 'Haché de bœuf', jambon: 'Jambon de dinde', merguez: 'Merguez', poulet: 'Filet de poulet',
  boeuf: 'Haché de bœuf', steak: 'Steak de bœuf', 'boeuf-ragout': 'Bœuf à braiser', 'steak-burger': 'Hamburgers de bœuf',
  dinde: 'Filet de dinde', lardons: 'Lardons de dinde (ou bœuf fumé)', chorizo: 'Chorizo de bœuf',
};

/** Boucher halal pour un nom de viande quelconque (article de supermarché). */
export function butcherName(name) {
  const t = norm(name);
  if (/hache|gehakt/.test(t)) return 'Haché de bœuf';
  if (/jambon|\bham\b/.test(t)) return 'Jambon de dinde';
  if (/\blard|\bspek\b|bacon/.test(t)) return 'Lardons de dinde (ou bœuf fumé)';
  if (/chorizo|salami/.test(t)) return 'Chorizo de bœuf';
  if (/merguez/.test(t)) return 'Merguez';
  if (/burger/.test(t)) return 'Hamburgers de bœuf';
  return null;
}

/** Boucheries proches (OpenStreetMap) : halal indiqué d'abord. elements : réponse Overpass. */
export function selectButchers(elements, home, distance, max = 8) {
  const out = [];
  for (const el of elements) {
    const tags = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    const label = `${tags.name ?? ''} ${tags.brand ?? ''} ${tags.description ?? ''}`;
    const halal = /^(yes|only)$/.test(tags['diet:halal'] ?? '') || HALAL.test(norm(label));
    if (tags['diet:halal'] === 'no') continue;
    const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
    const city = [tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(' ');
    out.push({
      id: `osm-${el.type}-${el.id}`, name: tags.name || 'Boucherie', halal,
      address: [street, city].filter(Boolean).join(', '), lat, lng,
      hours: tags.opening_hours ?? '', phone: tags.phone ?? tags['contact:phone'] ?? '',
      km: distance(home, { lat, lng }),
    });
  }
  return out.sort((a, b) => (b.halal - a.halal) || a.km - b.km).slice(0, max);
}
