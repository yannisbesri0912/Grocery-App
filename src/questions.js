// Questions du panier malin : 5 en mode simple, 20 en mode complet.
// Les réponses donnent le budget, le régime, les ustensiles, le nombre de
// plats à proposer et les produits de base (petit-déj, fruits, boissons…).
import { DIETS, ALLERGIES, TOOLS } from './recipes.js';

const opts = (o) => Object.entries(o).map(([value, label]) => ({ value, label }));

export const QUESTIONS = [
  // Mode simple
  { id: 'budget', simple: true, text: 'Quel budget pour ces courses ?', type: 'one',
    options: [30, 50, 80, 120, 150].map((b) => ({ value: b, label: `${b} €` })) },
  { id: 'people', simple: true, text: 'Pour combien de personnes ?', type: 'one',
    options: [1, 2, 3, 4, 5].map((n) => ({ value: n, label: n === 5 ? '5 ou +' : String(n) })) },
  { id: 'days', simple: true, text: 'Pour combien de jours ?', type: 'one',
    options: [{ value: 3, label: '2-3 jours' }, { value: 7, label: 'Une semaine' }, { value: 14, label: 'Deux semaines' }] },
  { id: 'dinners', simple: true, text: 'Combien de repas veux-tu cuisiner ?', type: 'one',
    options: [0, 3, 5, 7, 10, 14].map((n) => ({ value: n, label: n ? `${n} repas` : 'Aucun' })) },
  { id: 'diet', simple: true, text: 'Ton alimentation ?', type: 'one', options: opts(Object.fromEntries(Object.entries(DIETS).map(([k, d]) => [k, d.label]))) },
  // Mode complet
  { id: 'kitchen', text: 'Quels appareils as-tu dans ta cuisine ?', type: 'many', options: opts(TOOLS) },
  { id: 'time', text: 'Combien de temps pour cuisiner un repas ?', type: 'one',
    options: [{ value: 20, label: '20 min max' }, { value: 40, label: '40 min' }, { value: 90, label: '1 h 30' }, { value: 999, label: 'Pas de limite' }] },
  { id: 'allergies', text: 'Allergies ou intolérances ?', type: 'many', options: opts(ALLERGIES) },
  { id: 'lunch', text: 'Le midi, tu manges…', type: 'one',
    options: opts({ maison: 'À la maison (restes du soir)', sandwich: 'Des sandwichs', dehors: 'Dehors / à la cantine' }) },
  { id: 'breakfast', text: 'Au petit-déjeuner ?', type: 'one',
    options: opts({ tartines: 'Tartines', cereales: 'Céréales et lait', sale: 'Salé (œufs, fromage)', flocons: 'Porridge / flocons', aucun: 'Rien' }) },
  { id: 'hot', text: 'Boisson chaude ?', type: 'one', options: opts({ cafe: 'Café', the: 'Thé', both: 'Les deux', none: 'Aucune' }) },
  { id: 'meat', text: 'La viande, tu en manges…', type: 'one', options: opts({ souvent: 'Souvent', parfois: 'Parfois', rarement: 'Rarement', jamais: 'Jamais' }) },
  { id: 'fish', text: 'Et le poisson ?', type: 'one', options: opts({ souvent: 'Souvent', parfois: 'Parfois', rarement: 'Rarement', jamais: 'Jamais' }) },
  { id: 'fruits', text: 'Fruits ?', type: 'one', options: opts({ beaucoup: 'Beaucoup', normal: 'Normalement', peu: 'Peu' }) },
  { id: 'dairy', text: 'Yaourts et produits laitiers ?', type: 'one', options: opts({ beaucoup: 'Beaucoup', normal: 'Normalement', peu: 'Peu ou pas' }) },
  { id: 'snacks', text: 'Pour grignoter ?', type: 'one', options: opts({ sucre: 'Sucré (biscuits, chocolat)', fruits: 'Des fruits', non: 'Rien' }) },
  { id: 'drinks', text: 'Quelles boissons acheter ?', type: 'many',
    options: opts({ eau: 'Eau plate', 'eau-gaz': 'Eau pétillante', jus: 'Jus', coca: 'Soda', biere: 'Bière', vin: 'Vin' }) },
  { id: 'gamme', text: 'Plutôt…', type: 'one', options: opts({ cheap: 'Le moins cher possible', best: 'Le meilleur dans mon budget' }) },
  { id: 'house', text: "Produits d'entretien à racheter ?", type: 'many',
    options: opts({ lessive: 'Lessive', vaisselle: 'Liquide vaisselle', 'tablettes-lv': 'Tablettes lave-vaisselle', pq: 'Papier toilette', 'essuie-tout': 'Essuie-tout', 'sacs-poubelle': 'Sacs poubelle', eponges: 'Éponges' }) },
  { id: 'hygiene', text: 'Hygiène à racheter ?', type: 'many',
    options: opts({ 'gel-douche': 'Gel douche', shampoing: 'Shampoing', dentifrice: 'Dentifrice', deodorant: 'Déodorant', mouchoirs: 'Mouchoirs' }) },
];

export const questionsFor = (mode) => QUESTIONS.filter((q) => mode === 'complet' || q.simple);

/** Réponses par défaut (questions non posées en mode simple). */
export const DEFAULT_PROFILE = {
  budget: 50, people: 1, days: 7, dinners: 5, diet: 'tout',
  kitchen: ['plaques', 'four', 'micro', 'bouilloire'], time: 999, allergies: [], lunch: 'dehors',
  breakfast: 'aucun', hot: 'none', meat: 'parfois', fish: 'parfois', fruits: 'normal', dairy: 'peu',
  snacks: 'non', drinks: [], dessert: '0', gamme: 'best', house: [], hygiene: [],
};

/**
 * Produits de base selon les réponses : [{ id, qty }] (quantités pour
 * personnes × jours). Les plats sont choisis à part (pickDishes).
 */
export function staplesFor(profile) {
  const pr = { ...DEFAULT_PROFILE, ...profile };
  const pd = pr.people * pr.days; // personnes × jours
  const banned = new Set([...(pr.diet === 'vegan' ? 'de' : ''), ...pr.allergies]);
  const meatOk = pr.diet === 'tout';
  const out = new Map();
  // Quantités cumulées en fractions de paquet, arrondies au paquet à la fin.
  const add = (id, qty, flags = '') => {
    if ([...flags].some((f) => banned.has(f)) || qty <= 0) return;
    out.set(id, (out.get(id) ?? 0) + qty);
  };
  // Fruits (g par personne et par jour), moitié bananes, moitié pommes.
  const fruitG = { beaucoup: 300, normal: 150, peu: 60 }[pr.fruits] + (pr.snacks === 'fruits' ? 100 : 0);
  add('bananes', (pd * fruitG) / 2 / 1000);
  add('pommes', (pd * fruitG) / 2 / 1000);
  // Petit-déjeuner
  if (pr.breakfast === 'tartines') { add('pain', (pd * 100) / 800, 'g'); add('beurre', (pd * 10) / 250, 'd'); add('confiture', (pd * 20) / 450); }
  if (pr.breakfast === 'cereales') { add('cereales', (pd * 40) / 500, 'g'); add('lait', (pd * 200) / 1000, 'd'); }
  if (pr.breakfast === 'sale') { add('pain', (pd * 80) / 800, 'g'); add('oeufs', pd / 12, 'e'); add('gouda', (pd * 30) / 300, 'd'); }
  if (pr.breakfast === 'flocons') { add('lait', (pd * 200) / 1000, 'd'); }
  // Boissons chaudes
  if (pr.hot === 'cafe' || pr.hot === 'both') add('cafe', (pd * (pr.hot === 'both' ? 8 : 15)) / 500);
  if (pr.hot === 'the' || pr.hot === 'both') add('the', (pd * (pr.hot === 'both' ? 1 : 2)) / 20);
  // Midi en sandwich
  if (pr.lunch === 'sandwich') {
    add('pain', (pd * 120) / 800, 'g');
    if (meatOk) add('jambon', (pd * 50) / 200, 'p'); else add('gouda', (pd * 40) / 300, 'd');
    add('salade', pd / 8);
  }
  // Produits laitiers
  if (pr.dairy !== 'peu') add('yaourts', (pd * (pr.dairy === 'beaucoup' ? 2 : 1)) / 8, 'd');
  if (pr.dairy === 'beaucoup') add('lait', (pd * 150) / 1000, 'd');
  // Grignotage
  if (pr.snacks === 'sucre') { add('biscuits', pd / 10, 'g'); add('chocolat', pd / 14); }
  // Boissons
  const drinks = new Set(pr.drinks);
  if (drinks.has('eau')) add('eau', (pd * 1.2) / 9);
  if (drinks.has('eau-gaz')) add('eau-gaz', (pd * 0.8) / 9);
  if (drinks.has('jus')) add('jus', (pd * 0.2) / 1);
  if (drinks.has('coca')) add('coca', pd / 12);
  if (drinks.has('biere')) add('biere', 1);
  if (drinks.has('vin')) add('vin', pr.days / 7);
  // Maison et hygiène : une unité de chaque
  for (const id of [...pr.house, ...pr.hygiene]) add(id, 1);
  return [...out.entries()].map(([id, qty]) => ({ id, qty: Math.ceil(qty - 1e-9) }));
}

/** Nombre de portions à cuisiner par plat (double si le midi se mange à la maison). */
export const servingsFor = (profile) => {
  const pr = { ...DEFAULT_PROFILE, ...profile };
  return pr.people * (pr.lunch === 'maison' ? 2 : 1);
};
