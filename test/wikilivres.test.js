import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseIngredient, unwiki, importWikilivres } from '../prices/wikilivres.mjs';

test('wikilivres : modèles wiki et ingrédients en français', () => {
  assert.equal(unwiki("* 4 {{i|'=oui|œuf|œufs}}"), '* 4 œufs');
  assert.equal(unwiki('* {{Unité|1.5|kg}} de {{i|pomme de terre|pommes de terre}},'), '* 1.5 kg de pommes de terre,');
  assert.deepEqual(parseIngredient('* 4 {{i|oignon|oignons}}'), { key: 'oignons', total: 400 });
  assert.deepEqual(parseIngredient('* 200 g de champignons de Paris,'), { key: 'champignons', total: 200 });
  assert.deepEqual(parseIngredient('* 1 kg de bœuf à braiser'), { key: 'boeuf-ragout', total: 1000 });
  assert.deepEqual(parseIngredient('* 2 cuillerées à soupe de crème fraîche'), { key: 'creme', total: 30 });
  assert.deepEqual(parseIngredient('* 1 cuillère à soupe de sucre'), { pantry: true, key: 'sucre' }); // petite quantité : placard
  assert.equal(parseIngredient('* 1 bouquet garni').key, 'herbes');
  assert.equal(parseIngredient('* 200 g de viande de veau ou bœuf').key, 'boeuf-ragout'); // l'alternative qui s'achète
  assert.equal(parseIngredient('* 4 cuisses de lapin'), null); // introuvable : recette écartée
});

test('wikilivres : une page de recette devient une recette de l\'app', () => {
  const page = {
    title: 'Livre de cuisine/Boulet à la liégeoise', cats: ['Cuisine belge'],
    text: "== Ingrédients ==\npour 4 personnes\n* 1 kg de hachis {{i|porc}} et {{i|veau}}\n* 2 {{i|'=oui|œuf}}s\n* 3 gros {{i|'=oui|oignon}}s\n* 50 g de {{i|beurre}}\n== Préparation ==\n# Hachez les oignons.\n# Dans une {{Ustensile|poêle}}, faites fondre le beurre.\n# Cuire à feu doux 20 minutes.",
  };
  const { recipes } = importWikilivres([page]);
  assert.equal(recipes.length, 1);
  const [name, type, , tools, ings, , src, fam] = recipes[0];
  assert.equal(name, 'Boulet à la liégeoise');
  assert.equal(type, 'plat');
  assert.match(tools, /plaques/);
  assert.match(ings, /hache:250g/);
  assert.match(src, /fr\.wikibooks\.org/);
  assert.equal(fam, 1);
});

test('recettes françaises chargées sans doublon', async () => {
  const { RECIPES, addRecipes } = await import('../src/recipes.js');
  const before = RECIPES.length;
  const added = addRecipes(JSON.parse(readFileSync(new URL('../data/recipes-wikilivres.json', import.meta.url), 'utf8')), 'wl-');
  assert.ok(added > 150, `${added} ajoutées`);
  assert.equal(RECIPES.length, before + added);
  const names = RECIPES.map((r) => r.name.toLowerCase());
  assert.equal(names.filter((x) => x === 'carbonnade flamande').length, 1); // déjà dans l'app
});
