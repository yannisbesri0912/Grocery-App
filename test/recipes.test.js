import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, ING, TOOLS, compatible, pickDishes, formatAmount, recipeCost } from '../src/recipes.js';
import { PRODUCTS } from '../src/data.js';
import { QUESTIONS, questionsFor, staplesFor, servingsFor } from '../src/questions.js';

test('recettes : ingrédients, unités et ustensiles connus', () => {
  const ids = new Set(PRODUCTS.map((p) => p.id));
  assert.ok(RECIPES.length >= 100);
  assert.equal(new Set(RECIPES.map((r) => r.id)).size, RECIPES.length);
  for (const r of RECIPES) {
    for (const i of r.ingredients) {
      assert.ok(ING[i.key], `${r.name} : ${i.key}`);
      if (!i.pantry) assert.equal(i.unit, ING[i.key].pack[1], `${r.name} : unité de ${i.key}`);
    }
    for (const g of r.tools) for (const t of g) assert.ok(TOOLS[t], `${r.name} : ${t}`);
  }
  for (const def of Object.values(ING)) if (def.p) assert.ok(ids.has(def.p), def.p);
});

test('compatible : ustensiles, régime, allergies, temps', () => {
  const r = (id) => RECIPES.find((x) => x.id === id);
  const all = { plaques: true, four: true, micro: true, airfryer: true, bouilloire: true, mixeur: true };
  assert.ok(compatible(r('poulet-pane-croustillant-et-frites'), { kitchen: { airfryer: true } }));
  assert.ok(!compatible(r('pizza-maison'), { kitchen: { airfryer: true, plaques: true } }));
  assert.ok(!compatible(r('pates-carbonara'), { kitchen: all, diet: 'sans-porc' }));
  assert.ok(!compatible(r('pates-carbonara'), { kitchen: all, diet: 'vegetarien' }));
  assert.ok(compatible(r('chili-sin-carne'), { kitchen: all, diet: 'vegan' }));
  assert.ok(!compatible(r('lasagnes-a-la-bolognaise'), { kitchen: all, allergies: ['g'] }));
  assert.ok(!compatible(r('carbonnade-flamande'), { kitchen: all, maxTime: 60 }));
});

test('pickDishes : nombre, variété et coût', () => {
  const all = { plaques: true, four: true, micro: true, airfryer: true, bouilloire: true, mixeur: true };
  const ids = pickDishes(5, { kitchen: all }, (r) => r.minutes, { meat: 'souvent', fish: 'jamais' });
  assert.equal(ids.length, 5);
  assert.equal(new Set(ids).size, 5);
  assert.ok(ids.every((id) => !RECIPES.find((r) => r.id === id).flags.has('f')));
  const vege = pickDishes(4, { kitchen: all, diet: 'vegetarien' }, () => 1);
  assert.ok(vege.every((id) => !RECIPES.find((r) => r.id === id).flags.has('m')));
});

test('recipeCost et formatAmount', () => {
  const r = RECIPES.find((x) => x.id === 'spaghetti-ail-et-huile');
  assert.ok(recipeCost(r, 2, () => 1) > 0);
  assert.equal(formatAmount(250, 'g'), '250 g');
  assert.equal(formatAmount(1500, 'g'), '1,5 kg');
  assert.equal(formatAmount(0.5, 'pc'), '0,5');
});

test('questions : 6 en simple, 21 en complet (préférences sautées pour les végétariens)', () => {
  assert.equal(questionsFor('simple').length, 6);
  assert.equal(questionsFor('complet').length, 21);
  assert.equal(QUESTIONS.length, 21);
  assert.equal(questionsFor('simple', { diet: 'vegetarien' }).length, 5);
});

test('staplesFor : quantités selon personnes × jours, régime respecté', () => {
  const s = Object.fromEntries(staplesFor({ people: 2, days: 7, breakfast: 'tartines', lunch: 'sandwich', drinks: ['eau'], diet: 'tout' }).map((x) => [x.id, x.qty]));
  assert.equal(s.pain, Math.ceil((14 * 100) / 800 + (14 * 120) / 800));
  assert.ok(s.jambon >= 1 && s.eau >= 1 && s.bananes >= 1);
  const veg = Object.fromEntries(staplesFor({ diet: 'vegan', breakfast: 'tartines', lunch: 'sandwich' }).map((x) => [x.id, x.qty]));
  assert.ok(!veg.jambon && !veg.beurre);
  assert.equal(servingsFor({ people: 2, lunch: 'maison' }), 4);
});

test('recettes Wikibooks : toutes chargées, ingrédients connus, source indiquée', async () => {
  const { readFileSync } = await import('node:fs');
  const { addRecipes, RECIPES: all } = await import('../src/recipes.js');
  const rows = JSON.parse(readFileSync(new URL('../data/recipes-wikibooks.json', import.meta.url)));
  assert.ok(rows.length >= 500);
  addRecipes(rows);
  const imported = all.filter((r) => r.id.startsWith('wb-'));
  assert.equal(imported.length, rows.length);
  for (const r of imported) {
    assert.ok(/^https:\/\/en\.wikibooks\.org\//.test(r.src), r.name);
    assert.ok(r.steps.length > 20 && !/°F/.test(r.steps), r.name);
  }
});

test('recettes importées : ingrédients de placard nommés, cuillères, filtres d\'envies', async () => {
  const { makeRecipe, formatAmount, PANTRY_LABELS, STYLES, proteinOf } = await import('../src/recipes.js');
  const r = makeRecipe(['Test', 'plat', 12, 'plaques', 'poulet:150g tomates:200g ~sel:0.25cc ~huile-d-olive:1cs ~poivre', 'Cuire.']);
  const salt = r.ingredients.find((i) => i.key === 'sel');
  assert.equal(salt.pantry, true);
  assert.equal(formatAmount(salt.amount, salt.unit), '¼ c. à café');
  assert.equal(formatAmount(1.5, 'cs'), '1½ c. à soupe');
  assert.equal(PANTRY_LABELS['huile-d-olive'], "huile d'olive");
  assert.equal(proteinOf(r), 35);
  assert.ok(STYLES.rapide.test(r) && STYLES.proteine.test(r) && STYLES.healthy.test(r) && !STYLES.veggie.test(r));
});

test('régimes : le placard compte aussi (farine du placard = gluten)', async () => {
  const { readFileSync } = await import('node:fs');
  const { RECIPES, ING, addRecipes, compatible } = await import('../src/recipes.js');
  addRecipes(JSON.parse(readFileSync(new URL('../data/recipes-wikibooks.json', import.meta.url), 'utf8')));
  const kitchen = { four: true, plaques: true, micro: true, airfryer: true, mixeur: true, robot: true, grill: true };
  let bad = 0;
  for (const r of RECIPES) {
    for (const i of r.ingredients) for (const f of ING[i.key]?.flags ?? '') if (!r.flags.has(f)) bad++;
  }
  assert.equal(bad, 0);
  const bourgui = RECIPES.find((r) => /bourguignon/i.test(r.name) && r.ingredients.some((i) => i.key === 'farine'));
  if (bourgui) assert.equal(compatible(bourgui, { kitchen, allergies: ['g'] }), false);
});

test('pickDishes : un plus gros budget par portion donne d\'autres plats', async () => {
  const { pickDishes } = await import('../src/recipes.js');
  const kitchen = { four: true, plaques: true, micro: true };
  const cost = (r) => r.ingredients.filter((i) => !i.pantry).reduce((t, i) => t + i.amount, 0) / 100; // coût fictif
  const cheap = pickDishes(5, { kitchen }, cost);
  const rich = pickDishes(5, { kitchen }, cost, { perServing: 6 });
  assert.equal(cheap.length, 5);
  assert.notDeepEqual(rich, cheap);
});

test('viandes préférées : « J\'adore » le poulet en donne plus souvent, « Jamais » le bœuf l\'écarte', async () => {
  const { pickDishes, meatsOf, compatible, RECIPES } = await import('../src/recipes.js');
  const filters = { kitchen: { four: true, plaques: true, micro: true }, diet: 'tout' };
  const cost = (r) => r.minutes; // coût fictif
  const count = (ids) => ids.map((id) => RECIPES.find((r) => r.id === id)).filter((r) => meatsOf(r).has('poulet')).length;
  const base = pickDishes(7, filters, cost, { meat: 'souvent', fish: 'rarement' });
  const loved = pickDishes(7, filters, cost, { meat: 'souvent', fish: 'rarement', loves: ['poulet'] });
  assert.ok(count(loved) >= 2 && count(loved) > count(base), `${count(base)} → ${count(loved)}`);
  const noBeef = RECIPES.filter((r) => compatible(r, { ...filters, avoid: ['boeuf'] }));
  assert.ok(noBeef.length > 0 && noBeef.every((r) => !meatsOf(r).has('boeuf')));
  // Halal : les lardons (de dinde chez le boucher) comptent comme de la dinde.
  const carbo = RECIPES.find((r) => r.name === 'Pâtes carbonara');
  assert.ok(meatsOf(carbo, true).has('dinde') && meatsOf(carbo).has('porc'));
});
