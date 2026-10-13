// Import des recettes du Wikibooks Cookbook (CC BY-SA 4.0) :
//   node prices/wikibooks.mjs <recipes_parsed.json> [sortie.json]
// Garde les recettes dont tous les ingrédients s'achètent (produits de l'app
// ou catalogue Colruyt), convertit les mesures américaines en g / ml / pièces
// et par personne, détecte les ustensiles. La traduction française est faite
// à part (data/recipes-wikibooks-fr.json) et relue.
import { readFileSync, writeFileSync } from 'node:fs';
import { ING } from '../src/recipes.js';

// ---------- Ingrédients anglais → clés de src/recipes.js ----------
// [motif, clé | 'pantry' | 'skip', { piece: g par pièce, cup: g par tasse }]
// L'ordre compte : le premier motif trouvé gagne (le plus précis d'abord).
const MAP = [
  [/(peanut|groundnut|coconut|sesame|palm|vegetable|canola|sunflower|corn) oil/i, 'pantry'],
  [/sesame seeds?|cumin seeds?|mustard seeds?|coriander seeds?|celery seeds?|fennel seeds?|poppy seeds?|whole cloves|^cloves$|garam masala|curry leaves|mace\b/i, 'pantry'],
  [/raisin|sultana|currant/i, 'raisins-secs', { cup: 150 }],
  [/walnut|pecan|mixed nuts|chopped nuts|^nuts$/i, 'noix', { cup: 120 }],
  [/almond(?! (milk|extract|oil))/i, 'amandes', { cup: 140 }],
  [/cocoa/i, 'cacao', { cup: 85, tbsp: 6 }],
  [/cream cheese/i, 'fromage-frais', { cup: 230, piece: 225 }],
  [/peanut butter/i, 'cacahuete', { cup: 260, tbsp: 16 }],
  [/pork (chop|loin|tenderloin|shoulder|cutlet|steak)|pork\b/i, 'porc', { piece: 200 }],
  [/strawberr/i, 'fraises', { cup: 150, piece: 15 }],
  [/margarine/i, 'beurre', { cup: 227, stick: 113, tbsp: 14 }],
  [/buttermilk/i, 'lait'],
  [/rolled oats|oatmeal|\boats\b/i, 'flocons', { cup: 90 }],
  [/chocolate chip/i, 'chocolat', { cup: 170 }],
  [/^meat$|stewing meat/i, 'boeuf-ragout'],
  // à écarter (recette non retenue) : produits introuvables en Belgique
  [/crayfish|stockfish|ponmo|dry ?fish|egusi|ogiri|iru|locust bean|yam\b|plantain|okra|cassava|garri|fufu|ugali|teff|injera|berbere|niter kibbeh|habanero|scotch bonnet|palm oil|uziza|utazi|ugu|bitterleaf|tamarind|jaggery|asafoetida|curry leaves|galangal|lemongrass|kaffir|fenugreek leaves|paneer|tofu skin|seaweed|nori|miso|mirin|sake|dashi|kimchi|tahini|harissa|sumac|za.?atar|molasses|shortening|\blard\b|suet|buttermilk|cornmeal|polenta|grits|masa|semolina|bulgur|millet|sorghum|barley|rye|spelt|buckwheat|venison|rabbit|goat|mutton|lamb|duck|goose|quail|veal|liver|kidney(?! bean)|tripe|oxtail|octopus|squid|clams|oysters|crab|lobster|anchov|sardine|herring|mackerel|catfish|tilapia|trout|halibut|snapper|swordfish|caviar|truffle|saffron|pomegranate|quince|persimmon|guava|papaya|passion fruit|lychee|kumquat|\bdates?\b|\bfigs?\b|prune|apricot|cranberr|blueberr|raspberr|blackberr|cherr|plum|peach|nectarine|mango|pineapple|melon|watermelon|grape(?!fruit)|grapefruit|kiwi|rhubarb|coconut(?! milk)|marshmallow|gelatin|agar|food colou?ring|sprinkles|marzipan|amaretto|\brum\b|brandy|cognac|whisk(e)?y|vodka|tequila|liqueur|sherry|\bport\b|beer|stout|cider(?! vinegar)|kale|chard|collard|arugula|watercress|endive|radicchio|fennel|artichoke|asparagus|turnip|parsnip|rutabaga|beet|radish|kohlrabi|celeriac|jicama|daikon|bok choy|napa|brussels|sprouts|edamame|lima|fava|black-eyed|pinto|cannellini|navy bean|black bean|mung|adzuki|split pea|tempeh|seitan|quorn|ricotta|mascarpone|gruy|brie|camembert|gorgonzola|blue cheese|roquefort|goat cheese|halloumi|manchego|pecorino|provolone|monterey|jack cheese|cottage|cream cheese|evaporated|condensed|half.and.half|ghee|clarified|margarine|maple|agave|corn syrup|golden syrup|treacle|pecan|walnut|almond|hazelnut|cashew|pistachio|peanut|macadamia|pine nut|nuts?\b|seeds?\b|raisin|sultana|currant|chocolate chip|cocoa|cacao|wafer|graham|cracker|cereal|corn flakes|oats?\b|rolled oat|bran|wheat germ|pita|naan|bagel|brioche|croissant|crumpet|english muffin|bun\b|rolls?\b|baguette|ciabatta|cornstarch\b.*cup/i, 'skip'],
  // placard (épices fortes avant les poivrons frais)
  [/pepper flakes|chil[ie]+ (powder|flakes|sauce)|cayenne|black pepper|white pepper|ground pepper|peppercorn|^(salt and )?pepper$|salt and pepper|pepper to taste/i, 'pantry'],
  [/bell pepper|green pepper|red pepper|yellow pepper|sweet pepper|capsicum|jalape|green chil|red chil|chil[ie]s?$|chil[ie] pepper/i, 'poivrons', { piece: 150, cup: 150 }],
  [/coconut milk|coconut cream/i, 'lait-coco', { cup: 240, can: 400 }],
  // placard
  [/\bwater\b|\bice\b|salt\b|pepper(corns)?\b(?!s? ?\(?(bell|green|red|yellow|sweet))|peppercorn|black pepper|white pepper|cayenne|paprika|cumin|coriander (seed|powder)|ground coriander|turmeric|cinnamon|nutmeg|clove(s)? \(spice\)|ground cloves|allspice|cardamom|ginger powder|ground ginger|curry powder|garam masala|chil[ie]+ (powder|flakes)|red pepper flakes|chili flakes|oregano|thyme|rosemary|basil|bay lea|sage|marjoram|tarragon|dill|mint|chives|cilantro|coriander lea|fresh coriander|parsley flakes|herbs|spice|seasoning|bouillon|stock cube|stock\b|broth|vanilla|baking powder|baking soda|bicarbonate|yeast|cream of tartar|cornstarch|corn starch|cornflour|vinegar|worcestershire|ketchup|mustard|soy sauce|fish sauce|hot sauce|tabasco|sriracha|oil\b|cooking spray|lemon zest|orange zest|zest|garlic (powder|salt)|onion powder|msg|sesame seed/i, 'pantry'],
  // produits
  [/chicken (breast|fillet|thigh|drumstick|leg|wing|tender|piece)|chicken\b|poultry/i, 'poulet', { piece: 180, cup: 140 }],
  [/ground beef|minced beef|beef mince|hamburger meat/i, 'boeuf', { cup: 220 }],
  [/ground (pork|meat)|minced (pork|meat)|mince\b/i, 'hache', { cup: 220 }],
  [/stewing beef|beef chuck|chuck roast|beef stew|stew meat|beef roast|pot roast/i, 'boeuf-ragout'],
  [/steak|sirloin|beef (strips|tenderloin|fillet)|flank|beef\b/i, 'steak'],
  [/bacon|pancetta|lardon/i, 'lardons', { piece: 25 }],
  [/ham\b/i, 'jambon', { piece: 30, cup: 140 }],
  [/chorizo/i, 'chorizo'],
  [/sausage|frankfurter|hot dog|bratwurst/i, 'merguez'],
  [/turkey/i, 'dinde', { piece: 150 }],
  [/salmon/i, 'saumon', { piece: 150 }],
  [/tuna/i, 'thon', { can: 160 }],
  [/shrimp|prawn/i, 'crevettes', { cup: 150 }],
  [/cod\b|white fish|haddock|pollock|hake|fish fillet|fish\b/i, 'cabillaud', { piece: 150 }],
  [/mussel/i, 'moules'],
  [/egg yolk|egg white|eggs?\b/i, 'oeufs'],
  [/heavy cream|whipping cream|double cream|single cream|light cream|sour cream|cr[eè]me fra[iî]che|cream\b/i, 'creme'],
  [/milk/i, 'lait'],
  [/yog(h)?urt/i, 'yaourts', { cup: 245, piece: 125 }],
  [/butter/i, 'beurre', { cup: 227, stick: 113, tbsp: 14 }],
  [/parmesan|grana/i, 'parmesan', { cup: 100 }],
  [/mozzarella/i, 'mozzarella', { cup: 115 }],
  [/feta/i, 'feta', { cup: 150 }],
  [/cheddar|swiss cheese|emmental|gouda|cheese/i, 'emmental', { cup: 110, piece: 25 }],
  [/all.purpose flour|plain flour|self.rais|wheat flour|flour/i, 'farine', { cup: 125, tbsp: 8 }],
  [/brown sugar|caster sugar|granulated sugar|white sugar|powdered sugar|icing sugar|confectioner|superfine|sugar/i, 'sucre', { cup: 200, tbsp: 12 }],
  [/honey/i, 'miel', { cup: 340, tbsp: 21 }],
  [/chocolate/i, 'chocolat', { cup: 170, piece: 30 }],
  [/spaghetti|linguine|fettuccine|tagliatelle|macaroni|penne|fusilli|rigatoni|farfalle|pasta|noodle(?!s? soup)/i, 'pates', { cup: 100 }],
  [/lasagn/i, 'lasagne', { piece: 20 }],
  [/basmati|jasmine rice|long.grain|white rice|brown rice|cooked rice|uncooked rice|rice\b/i, 'riz', { cup: 185 }],
  [/couscous/i, 'semoule', { cup: 175 }],
  [/quinoa/i, 'quinoa', { cup: 170 }],
  [/lentil/i, 'lentilles', { cup: 190 }],
  [/chickpea|garbanzo/i, 'pois-chiches', { cup: 165, can: 400 }],
  [/kidney bean|red bean/i, 'haricots-rouges', { cup: 180, can: 400 }],
  [/green bean|string bean/i, 'haricots-verts', { cup: 110 }],
  [/\bcorn\b|sweetcorn|maize/i, 'mais', { cup: 160, can: 300 }],
  [/\bpeas\b|frozen vegetables|mixed vegetables/i, 'legumes-surg', { cup: 145 }],
  [/canned tomato|crushed tomato|tomato sauce|tomato pur[eé]e|passata|diced tomatoes|chopped tomatoes|tomato paste|tinned tomato/i, 'tomates-conc', { cup: 245, can: 400, tbsp: 16 }],
  [/cherry tomato|tomato/i, 'tomates', { piece: 120, cup: 180 }],
  [/sweet potato/i, 'patate-douce', { piece: 250, cup: 135 }],
  [/potato/i, 'pdt', { piece: 200, cup: 150 }],
  [/spring onion|green onion|scallion|shallot|red onion|yellow onion|white onion|onion/i, 'oignons', { piece: 150, cup: 160 }],
  [/garlic/i, 'ail', { piece: 5, clove: 5, head: 50 }],
  [/ginger/i, 'gingembre', { piece: 15, tbsp: 6 }],
  [/carrot/i, 'carottes', { piece: 80, cup: 120 }],
  [/celery/i, 'poireaux', { piece: 40, cup: 100 }],
  [/leek/i, 'poireaux', { piece: 200 }],
  [/zucchini|courgette/i, 'courgettes', { piece: 250, cup: 125 }],
  [/eggplant|aubergine/i, 'aubergine', { piece: 1 }],
  [/bell pepper|green pepper|red pepper|yellow pepper|sweet pepper|capsicum|chil[ie]|jalape/i, 'poivrons', { piece: 150, cup: 150 }],
  [/broccoli/i, 'brocoli', { piece: 400, cup: 90 }],
  [/cauliflower/i, 'chou-fleur', { piece: 1 }],
  [/spinach/i, 'epinards', { cup: 30 }],
  [/mushroom/i, 'champignons', { piece: 20, cup: 70 }],
  [/cabbage|lettuce|salad greens|greens/i, 'salade', { piece: 1, cup: 0.1 }],
  [/cucumber/i, 'concombre', { piece: 1 }],
  [/avocado/i, 'avocats', { piece: 1 }],
  [/pumpkin|butternut|squash/i, 'courge', { cup: 120 }],
  [/lemon juice|lime juice|lemon|lime/i, 'citrons', { piece: 1, juice: 1 }],
  [/orange juice|orange/i, 'oranges', { piece: 200, cup: 250 }],
  [/banana/i, 'bananes', { piece: 120, cup: 150 }],
  [/apple/i, 'pommes', { piece: 180, cup: 125 }],
  [/strawberr/i, 'skip'],
  [/coconut milk|coconut cream/i, 'lait-coco', { cup: 240, can: 400 }],
  [/parsley/i, 'persil', { cup: 0.5, tbsp: 0.05, piece: 1 }],
  [/pesto/i, 'pesto', { cup: 250, tbsp: 15 }],
  [/olive/i, 'olives', { cup: 135, piece: 4 }],
  [/mayonnaise|mayo/i, 'mayonnaise', { cup: 230 }],
  [/bread ?crumbs|panko/i, 'chapelure', { cup: 110 }],
  [/tortilla|wrap/i, 'tortillas', { piece: 1 }],
  [/puff pastry/i, 'pate-feuil', { piece: 1 }],
  [/pie crust|pastry|shortcrust/i, 'pate-brisee', { piece: 1 }],
  [/bread|toast/i, 'pain', { piece: 35, cup: 45 }],
  [/wine/i, 'vin-cuisine'],
];

// Unités → [type, facteur] ; type : g, ml, cup, tbsp, tsp, pc, can, clove, stick…
const UNITS = [
  [/^(cups?|c\.?)\b/i, 'cup'], [/^(tablespoons?|tbsps?|tbs|tbls?|T)\b\.?/, 'tbsp'], [/^(teaspoons?|tsps?|t)\b\.?/, 'tsp'],
  [/^(pounds?|lbs?)\b\.?/i, 'lb'], [/^fl\.? ?oz\b|^fluid ounces?\b/i, 'floz'], [/^(ounces?|oz)\b\.?/i, 'oz'],
  [/^(kilograms?|kgs?)\b/i, 'kg'], [/^(grams?|gr|g)\b\.?/i, 'g'], [/^(millilit(er|re)s?|ml)\b/i, 'ml'], [/^(decilit(er|re)s?|dl)\b/i, 'dl'],
  [/^(centilit(er|re)s?|cl)\b/i, 'cl'], [/^(lit(er|re)s?|l)\b/i, 'l'], [/^(cans?|tins?|jars?)\b/i, 'can'], [/^(cloves?)\b/i, 'clove'],
  [/^(sticks?)\b/i, 'stick'], [/^(ea\.?|each)(?=\s|$)/i, 'pc'], [/^(slices?|rashers?|strips?|pieces?|fillets?|breasts?|thighs?|stalks?|ribs?|sprigs?|leaves|leaf|large|medium|small|whole|bunch(es)?|heads?)\b/i, 'pc'],
  [/^(pinch(es)?|dash(es)?|handful|splash|drizzle|knob)\b/i, 'tiny'],
];
const FRAC = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 };

function parseQty(text) {
  let t = text.trim().replace(/^[-–•*]\s*/, '').replace(/^(about|approx\.?|approximately|around)\s+/i, '');
  const num = '(\\d+(?:[.,]\\d+)?(?:\\s*[½¼¾⅓⅔⅛])?|\\d+\\s+\\d+/\\d+|\\d+/\\d+|[½¼¾⅓⅔⅛])';
  const m = t.match(new RegExp(`^${num}(?:\\s*(?:-|–|to)\\s*${num})?`));
  if (!m) return { qty: null, rest: t };
  const val = (s) => {
    if (!s) return null;
    s = s.trim();
    let v = 0;
    for (const part of s.split(/\s+/)) {
      if (FRAC[part]) v += FRAC[part];
      else if (/^\d+\/\d+$/.test(part)) { const [a, b] = part.split('/').map(Number); v += a / b; }
      else {
        const f = part.match(/^(\d+(?:[.,]\d+)?)([½¼¾⅓⅔⅛])?$/);
        if (f) v += Number(f[1].replace(',', '.')) + (f[2] ? FRAC[f[2]] : 0);
      }
    }
    return v;
  };
  const a = val(m[1]);
  const b = val(m[2]);
  return { qty: b ? (a + b) / 2 : a, rest: t.slice(m[0].length).trim() };
}

// ---------- Ingrédients de placard : nom français ----------
// (gardés dans la recette avec leur quantité, mais pas achetés pour elle)
const PANTRY_FR = [
  [/seasoning cube|stock cube|maggi|knorr/, 'cube de bouillon'], [/\bmace\b/, 'macis'], [/italian seasoning|italian herbs/, 'herbes italiennes'],
  [/five.spice/, 'cinq-épices'], [/cajun/, 'épices cajun'], [/mixed spice|pumpkin pie spice|seasoning|spices?\b|suya|banga/, 'mélange d\'épices'],
  [/celery seed/, 'graines de céleri'], [/zest.*lemon|lemon.*zest/, 'zeste de citron'], [/zest.*orange|orange.*zest/, 'zeste d\'orange'], [/zest/, 'zeste'], [/chil[ie]+ sauce/, 'sauce pimentée'], [/cornmeal|maize/, 'semoule de maïs'],
  [/\bmsg\b/, 'glutamate'], [/saffron/, 'safran'], [/asafoetida/, 'ase fétide'], [/ghee/, 'ghee'], [/\brum\b/, 'rhum'],
  [/chocolate chip/, 'pépites de chocolat'], [/raisin/, 'raisins secs'], [/\bdates\b/, 'dattes'], [/spinach/, 'épinards'], [/tofu/, 'tofu'],
  [/sweetener/, 'édulcorant'], [/savory/, 'sarriette'], [/cherr/, 'cerises confites'], [/pistachio|almond/, 'pistaches ou amandes'],
  [/crayfish/, 'écrevisses séchées'], [/buns?\b/, 'petits pains'],
  [/olive oil/, 'huile d\'olive'], [/sesame oil/, 'huile de sésame'], [/\boil\b|cooking spray|shortening/, 'huile'],
  [/baking powder/, 'levure chimique'], [/baking soda|bicarbonate/, 'bicarbonate'], [/yeast/, 'levure de boulanger'],
  [/cream of tartar/, 'crème de tartre'], [/corn ?starch|cornflour/, 'fécule de maïs'],
  [/vanilla/, 'vanille'], [/cinnamon/, 'cannelle'], [/nutmeg/, 'muscade'], [/smoked paprika/, 'paprika fumé'], [/paprika/, 'paprika'],
  [/cumin/, 'cumin'], [/turmeric/, 'curcuma'], [/garam masala/, 'garam masala'], [/curry/, 'curry'],
  [/cayenne|chil[ie]+ (powder|flakes)|red pepper flakes|pepper flakes|hot pepper/, 'piment'],
  [/garlic powder|garlic salt/, 'ail en poudre'], [/onion powder/, 'oignon en poudre'], [/ginger/, 'gingembre'],
  [/oregano/, 'origan'], [/thyme/, 'thym'], [/rosemary/, 'romarin'], [/basil/, 'basilic'], [/bay lea/, 'laurier'],
  [/sage/, 'sauge'], [/marjoram/, 'marjolaine'], [/tarragon/, 'estragon'], [/dill/, 'aneth'], [/mint/, 'menthe'],
  [/chives/, 'ciboulette'], [/cilantro|coriander lea|fresh coriander/, 'coriandre fraîche'], [/coriander/, 'coriandre'],
  [/parsley/, 'persil'], [/herbs|herbes/, 'herbes'], [/clove/, 'clous de girofle'], [/allspice/, 'quatre-épices'],
  [/cardamom/, 'cardamome'], [/sesame seed/, 'graines de sésame'], [/poppy seed/, 'graines de pavot'],
  [/mustard seed/, 'graines de moutarde'], [/fennel seed/, 'graines de fenouil'],
  [/worcestershire/, 'sauce Worcestershire'], [/soy sauce/, 'sauce soja'], [/fish sauce/, 'sauce poisson'],
  [/hot sauce|tabasco|sriracha/, 'sauce piquante'], [/ketchup/, 'ketchup'], [/mustard/, 'moutarde'],
  [/cider vinegar/, 'vinaigre de cidre'], [/wine vinegar/, 'vinaigre de vin'], [/balsamic/, 'vinaigre balsamique'], [/vinegar/, 'vinaigre'],
  [/stock|broth|bouillon/, 'bouillon'], [/lemon zest|lemon rind|lemon peel/, 'zeste de citron'], [/orange zest|orange rind|orange peel/, 'zeste d\'orange'],
  [/lemon juice/, 'jus de citron'], [/honey/, 'miel'], [/cocoa/, 'cacao'], [/icing sugar|powdered sugar|confectioner/, 'sucre glace'],
  [/brown sugar/, 'cassonade'], [/sugar/, 'sucre'], [/self.raising|self.rising/, 'farine levante'], [/flour/, 'farine'],
  [/butter|margarine/, 'beurre'], [/milk/, 'lait'], [/cream/, 'crème'], [/wine/, 'vin'],
  [/\bwater\b/, 'eau'], [/\bice\b/, 'glaçons'], [/black pepper|white pepper|peppercorn|\bpepper\b/, 'poivre'], [/salt/, 'sel'],
];
export function pantryName(en) {
  const t = String(en ?? '').toLowerCase();
  return PANTRY_FR.find(([re]) => re.test(t))?.[1] ?? null;
}
// Quantité d'un ingrédient de placard : cuillères gardées telles quelles (cc, cs).
function pantryAmount(qty, unit) {
  if (!(qty > 0)) return null;
  if (unit === 'tsp') return [qty, 'cc'];
  if (unit === 'tbsp') return [qty, 'cs'];
  if (unit === 'cup') return [qty * 240, 'ml'];
  const g = { g: 1, kg: 1000, lb: 454, oz: 28.35 }[unit];
  const ml = { ml: 1, l: 1000, dl: 100, cl: 10, floz: 30 }[unit];
  if (g) return [qty * g, 'g'];
  if (ml) return [qty * ml, 'ml'];
  if (!unit || unit === 'pc' || unit === 'clove') return [qty, 'pc'];
  return null;
}

/** « 2 cups flour, sifted » → { key, amount (unité du paquet), pantry } ou null (introuvable). */
export function parseIngredient(line) {
  const clean = line.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  let { qty, rest } = parseQty(clean);
  // « (400 g) » entre parenthèses : souvent la mesure métrique, plus fiable.
  const metric = rest.match(/\((\d+(?:[.,]\d+)?)\s*(g|kg|ml|l)\b[^)]*\)/i);
  let unit = null;
  if (metric) { qty = Number(metric[1].replace(',', '.')); unit = metric[2].toLowerCase(); rest = rest.replace(metric[0], ''); } else {
    rest = rest.replace(/^\([^)]*\)\s*/, '');
    for (const [re, u] of UNITS) {
      const m = rest.match(re);
      if (m) { unit = u; rest = rest.slice(m[0].length).trim(); break; }
    }
  }
  rest = rest.replace(/^\([^)]*\)\s*/, '').replace(/^of\s+/i, '');
  const name = rest.split(/,|\(| - | – |;/)[0].toLowerCase();
  const optional = /optional|to taste|for (garnish|serving|frying|greasing|dusting)|as needed/i.test(clean);
  let hit = null;
  for (const [re, key, conv] of MAP) if (re.test(name)) { hit = { key, conv: conv ?? {} }; break; }
  if (!hit) return optional ? { pantry: true, name, qty, unit } : null;
  if (hit.key === 'skip') return optional ? { pantry: true, name, qty, unit } : null;
  if (hit.key === 'pantry' || unit === 'tiny') return { pantry: true, name, qty: unit === 'tiny' ? null : qty, unit };
  if (hit.key === 'vin-cuisine') return { pantry: true, name, qty, unit };
  const def = ING[hit.key];
  if (!def) return null;
  const target = def.pack[1];
  const c = hit.conv;
  const q = qty ?? (target === 'pc' ? 1 : null);
  if (q == null) {
    // Sans quantité : une pièce ou une portion habituelle.
    if (['beurre', 'sucre', 'farine', 'lait', 'miel', 'creme'].includes(hit.key)) return { pantry: true, name, qty, unit };
    if (c.piece) return { key: hit.key, total: target === 'pc' ? 1 : c.piece, name };
    return optional ? { pantry: true, name } : null;
  }
  let amount = null;
  const g = { g: 1, kg: 1000, lb: 454, oz: 28.35 }[unit];
  const ml = { ml: 1, l: 1000, dl: 100, cl: 10, floz: 30 }[unit];
  if (target === 'g') {
    if (g) amount = q * g;
    else if (ml) amount = q * ml; // densité ~1
    else if (unit === 'cup') amount = q * (c.cup ?? 150);
    else if (unit === 'tbsp') amount = q * (c.tbsp ?? 15);
    else if (unit === 'tsp') amount = q * (c.tbsp ?? 15) / 3;
    else if (unit === 'can') amount = q * (c.can ?? 400);
    else if (unit === 'stick') amount = q * (c.stick ?? 113);
    else if (unit === 'clove') amount = q * (c.clove ?? 5);
    else if (!unit || unit === 'pc') amount = q * (c.piece ?? 100);
  } else if (target === 'ml') {
    if (ml) amount = q * ml;
    else if (g) amount = q * g;
    else if (unit === 'cup') amount = q * 240;
    else if (unit === 'tbsp') amount = q * 15;
    else if (unit === 'tsp') amount = q * 5;
    else if (unit === 'can') amount = q * (c.can ?? 400);
    else if (!unit || unit === 'pc') amount = c.piece ? q * c.piece : null;
  } else { // pièces
    if (!unit || unit === 'pc' || unit === 'clove') amount = q;
    else if (unit === 'cup') amount = q * (c.cup ?? 1);
    else if (unit === 'tbsp') amount = q * (c.tbsp ?? 0.05) * (c.juice ? 0.33 : 1);
    else if (unit === 'tsp') amount = q * (c.tbsp ?? 0.05) / 3;
    else if (g) amount = (q * g) / (c.piece ?? 100);
    else if (ml) amount = c.juice ? (q * ml) / 40 : null;
    else if (unit === 'can') amount = q;
  }
  if (amount == null || !(amount > 0)) return null;
  // Petites quantités de sucre / farine / beurre / miel : placard.
  if (['sucre', 'farine', 'miel'].includes(hit.key) && amount <= 30) return { pantry: true, name, qty: amount, unit: target };
  return { key: hit.key, total: amount, name };
}

// ---------- Recettes ----------
const EXCLUDE_CAT = /Beverage|Sauce|dressing|Spice_mix|Marinade|Condiment|Chutney|Dip_|Frosting|Filling|Broth|Dough|Bread|Fermented|Butter_recipes|Baking_recipes|Salsa|Swallow|Jam|Jelly|Preserve|Pickle|Smoothie|Cocktail|Punch|Tea_|Coffee|Baby|Pet_/i;
const EXCLUDE_TITLE = /sauce|dressing|stock|seasoning|spice|rub\b|marinade|syrup|jam\b|jelly|bread|dough|drink|tea\b|coffee|cocktail|punch|lemonade|wine|beer|butter\b|mayonnaise|ketchup|mustard|vinegar|pickle|basic|how to|technique|frosting|icing|glaze|crust\b|batter/i;
const DESSERT = /Dessert|Cake|Cookie|Pie|Pastry|Pudding|Confection|Custard|Cheesecake|Meringue|Muffin|Biscuit|Scone|Fruit_recipes|Sweet/i;
const BREAKFAST = /Breakfast|Pancake|Porridge|Waffle/i;
const LUNCH = /Salad|Sandwich|Appetizer|Snack/i;
const NO_TOOL = /slow cooker|crock.?pot|pressure cooker|instant pot|deep fryer|bread machine|ice.?cream maker|waffle iron|smoker|barbecue|\bbbq\b|charcoal|rice cooker|tandoor|dehydrator|sous.vide|pasta machine|grill pan|outdoor grill|campfire|dutch oven over/i;

function toolsOf(text) {
  const t = text.toLowerCase();
  const tools = [];
  if (/\boven\b|\bbake|baking|\broast|\bbroil|preheat/.test(t)) tools.push('four');
  if (/skillet|frying pan|saucepan|\bpans?\b|\bpots?\b|\bwok\b|stove|\bboil|simmer|saut[eé]|\bfry|fried|griddle|medium heat|high heat|low heat|bring to a boil|melt/.test(t) && !(tools.includes('four') && !/skillet|saucepan|stove|simmer|boil|fry|saut|wok|heat\b/.test(t))) tools.push('plaques');
  if (/microwave/.test(t)) tools.push(tools.includes('plaques') ? null : 'micro');
  if (/blender|food processor|\bblend|pur[eé]e|liquidi[sz]e|immersion|hand mixer|electric mixer|stand mixer/.test(t)) tools.push('mixeur');
  if (/air ?fryer/.test(t)) return ['airfryer'];
  return tools.filter(Boolean);
}

function minutesOf(time, steps, tools) {
  if (time) {
    const h = time.match(/(\d+(?:\.\d+)?)\s*(h|hour)/i);
    const m = time.match(/(\d+)\s*(min|m\b)/i);
    const d = time.match(/(\d+)\s*day/i);
    const total = (d ? Number(d[1]) * 1440 : 0) + (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
    if (total) return total;
  }
  return 15 + steps * 5 + (tools.includes('four') ? 30 : 0);
}

// Ingrédients de placard → « ~sel:0.25cc ~levure-de-boulanger:2g ~poivre », par personne.
function pantryTokens(items, servings) {
  const acc = new Map();
  for (const p of items) {
    const fr = pantryName(p.name) ?? 'assaisonnement';
    const amt = pantryAmount(p.qty, p.unit);
    const cur = acc.get(fr) ?? { amount: 0, unit: amt?.[1] ?? null };
    if (amt && (cur.unit === amt[1] || !cur.amount)) { cur.amount += amt[0]; cur.unit = amt[1]; }
    acc.set(fr, cur);
  }
  const slug = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return [...acc].map(([fr, { amount, unit }]) => {
    const per = amount / servings;
    const nice = unit === 'cc' || unit === 'cs' ? Math.round(per * 8) / 8 : unit === 'pc' ? Math.round(per * 4) / 4 : Math.round(per);
    return `~${slug(fr)}${amount && nice > 0 ? `:${nice}${unit}` : ''}`;
  });
}

export function importRecipes(raw) {
  const out = [];
  const reasons = {};
  const why = (r) => { reasons[r] = (reasons[r] ?? 0) + 1; };
  for (const { recipe_data: r } of raw) {
    const cat = r.infobox?.category ?? '';
    const title = r.title.replace(/^Cookbook:/, '');
    if (EXCLUDE_CAT.test(cat)) { why('catégorie'); continue; }
    if (EXCLUDE_TITLE.test(title)) { why('titre'); continue; }
    const ingLines = r.text_lines.filter((l) => /^ingredients?:?$/i.test(l.section ?? '') && l.line_type === 'ul').map((l) => l.text);
    const steps = r.text_lines.filter((l) => /procedure|preparation|instructions|method|directions/i.test(l.section ?? '') && /ol|ul|p/.test(l.line_type)).map((l) => l.text);
    if (ingLines.length < 2 || ingLines.length > 18 || !steps.length) { why('structure'); continue; }
    const text = steps.join(' ');
    if (NO_TOOL.test(text)) { why('appareil'); continue; }
    const servings = Math.min(Number(String(r.infobox?.servings ?? '').match(/\d+/)?.[0] ?? 4) || 4, 24);
    const parsed = ingLines.map(parseIngredient);
    if (parsed.some((p) => p === null)) { why('ingrédient introuvable'); continue; }
    const totals = new Map();
    for (const p of parsed) if (!p.pantry) totals.set(p.key, (totals.get(p.key) ?? 0) + p.total);
    if (totals.size < 2) { why('trop simple'); continue; }
    const per = [...totals.entries()].map(([key, total]) => [key, total / servings]);
    // Garde-fous : quantités par personne plausibles.
    const bad = per.some(([key, a]) => { const u = ING[key].pack[1]; return u === 'pc' ? a > 6 || a < 0.02 : a > 900 || a < 1; });
    if (bad) { why('quantités'); continue; }
    const tools = toolsOf(text);
    const type = DESSERT.test(cat) ? 'dessert' : BREAKFAST.test(cat) ? 'petitdej' : LUNCH.test(cat) ? 'midi' : 'plat';
    const minutes = Math.min(minutesOf(r.infobox?.time, steps.length, tools), 24 * 60);
    const round = (x, u) => (u === 'pc' ? Math.round(x * 100) / 100 : Math.max(1, Math.round(x)));
    const ingredients = [
      ...per.map(([key, a]) => `${key}:${round(a, ING[key].pack[1])}${ING[key].pack[1]}`),
      ...pantryTokens(parsed.filter((p) => p.pantry), servings),
    ].join(' ');
    out.push({ src: r.url, title, type, minutes, servings, tools: tools.join(' '), ingredients, steps });
    why('gardée');
  }
  return { recipes: out, reasons };
}

if (process.argv[1]?.endsWith('wikibooks.mjs') && process.argv[2]) {
  const raw = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const { recipes, reasons } = importRecipes(raw);
  console.log(reasons);
  const byType = {};
  for (const r of recipes) byType[r.type] = (byType[r.type] ?? 0) + 1;
  console.log(byType);
  if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(recipes, null, 1));
}
