# Grocery Opti — notes pour reprendre le travail

App web installable (PWA) qui trouve **où faire ses courses au coût total le plus bas** autour
d'une adresse à Bruxelles, avec les **vrais prix** Colruyt, Delhaize et Aldi. Utilisateur :
Yannis (francophone, Bruxelles, **mange halal**, adore le poulet). Il veut des explications
**simples en français** et que Claude « gère tout » (coder, tester, publier).

En ligne : https://yannisbesri0912.github.io/Grocery-App/ — dépôt `yannisbesri0912/Grocery-App`,
branche `main` (publiée par `.github/workflows/pages.yml`).

## Règles à respecter (toujours)

- **Jamais l'adresse de l'utilisateur dans le dépôt** (elle apparaît sur ses captures) : elle
  reste dans le `localStorage` du téléphone.
- Pas d'identifiants, pas de paiement automatique, **pas de robot sur colruyt.be** (risque de
  blocage IP ; même collectandgo.be répond par une page anti-robot). Collect&Go : seulement des
  liens que l'utilisateur ouvre lui-même : `/fr/recherche?searchTerm=…` (les fiches utilisent un
  numéro interne `#pdp_…` absent des données Colruyt, pas de lien direct possible).
- Recettes et photos : **seulement des sources libres** (CC BY-SA, CC0, domaine public),
  attribution affichée. Jamais Marmiton, 750g, TheMealDB (payant pour une app publiée).
- Pas de PR sauf demande ; on pousse directement sur `main`. Pas d'identifiant de modèle dans
  les commits. Fin des messages de commit : `Co-Authored-By: Claude …` + `Claude-Session: …`.
- Ne pas contourner les refus des contrôles de sécurité (ex. `rm -rf` refusé).

## Lancer, tester

```bash
npm ci && npm test                     # ~93 tests node:test (test/*.test.js), doivent tous passer
python3 -m http.server 5175            # depuis la racine : l'app sur http://localhost:5175
```
Tests navigateur : scripts Playwright jetables dans le scratchpad (`e2e*.cjs`, Chromium déjà
installé) qui pré-remplissent `localStorage` (`courses-opti:v1`), routent `**overpass**` et
`**google.com/s2/favicons**`, puis cliquent dans l'app et font des captures.

**Le bac à sable n'atteint ni Delhaize, ni Wikimedia, ni cuisine-libre.** Pour lire ces sites :
branche `data-raw` + `.github/workflows/raw.yml` (se lance à chaque push sur `data-raw`, écrit
dans `data-raw/` et le commit). Worktree : `git worktree add <scratchpad>/wt2 data-raw`,
y copier les scripts (`git checkout main -- src …`), modifier l'étape de `raw.yml`, pousser,
suivre avec les outils GitHub (`actions_list`, `get_job_logs`), puis
`git fetch origin data-raw && git show FETCH_HEAD:data-raw/<fichier>`.

À chaque changement de fichiers servis : **monter la version du cache** dans `sw.js`
(`grocery-opti-vNN`, ligne 2) et ajouter tout nouveau module `src/*.js` à la liste `FILES`
(un test le vérifie).

## Architecture (JS natif, sans build)

- `src/app.js` (~3 300 lignes) : état, rendu de tous les écrans, actions (`data-action`).
  Écouteur de clics global sur `document`. `render()` redessine la vue ; `deferRender()` après
  saisie. **Tout texte inséré dans le HTML passe par `esc()`** (y compris les attributs).
- `src/optimizer.js` : plans (1 à 3 magasins, retrait Collect, livraison), `priceInfo`
  (promo terminée → prix normal), `lineCost`/`packsFor` (paquets entiers, ≤ 5 % d'un paquet
  en moins), formats alternatifs sans hériter de la promo de l'article principal.
- `src/data.js` : 74 produits génériques, enseignes, catégories (0 fruits-légumes … 9 bébé-animaux).
- `src/match-rules.js` + `src/matcher.js` : produit générique ↔ articles des catalogues
  (mots, exclusions, format ; pas de conserve ni de mélange pour un légume frais).
- `src/catalog.js` : lignes de catalogue `ROW` (id, name, content, price, …, nutri, deal, walk, art, tech).
- `src/recipes.js` : `ING` (ingrédients → produits, flags m p f d e g n a), 104 recettes écrites
  pour l'app, `addRecipes` (fichiers importés, sans doublon de nom), régimes (`DIETS` dont
  **halal** : ni porc ni alcool, viande chez le boucher), `MEATS`/préférences (j'adore / jamais),
  `familiarity` (3 plat familial, 2 recette de l'app, 1 classique importé, 0 « découverte »),
  `pickDishes` (budget par portion, viandes préférées, part de découverte, variété).
  Préparation des 104 recettes de l'app : une étape par ligne (`\n`), au tutoiement, avec durées,
  feu, signes de cuisson, cuisson du riz/des pâtes, et toujours une sauce pour le riz et les pâtes.
  `splitSteps` découpe aussi les recettes importées (une phrase = une étape) ; dans l'app, on
  coche les étapes et l'écran reste allumé (Wake Lock).
- `src/smart.js` : panier malin (budget, gammes). `src/questions.js` : questionnaire (6 / 21 q.).
- `src/placard.js` : import de liste, reconnaissance des produits, durées de conservation
  (`shelfDays`, `freshness`). `src/halal.js` : porc / alcool / viande → boucher, boucheries OSM.
- `src/spend.js` : familles de dépenses, Nutri-Score, reçu en Markdown. `src/validate.js` :
  nettoyage de tout ce qui vient de l'extérieur (lien partagé, sauvegarde, stockage).
- `src/same.js` (même article / équivalent entre enseignes), `src/deals.js` (promos), `src/history.js`,
  `src/aisles.js`, `src/calib.js`, `src/share.js`, `src/order.js` (Collect&Go, Delhaize),
  `src/scan.js` (codes-barres), `src/receipt.js` (OCR ticket), `src/voice.js`, `src/tuto.js`.
- `index.html` a une CSP (scripts : soi-même + cdn.jsdelivr.net). `sw.js` : hors ligne.

## Données (`data/`) et robots (`prices/`)

- `prices.yml` (04:17 UTC, + 15:41 Colruyt seul) → `prices/run.mjs` : Colruyt (copie publique
  BelgianNoise), Delhaize et Aldi (catalogues complets, `prices/catalogs.mjs`), promos PrijsProfeet ;
  écrit `prices.json`, `catalog-*.json`, `same.json`, `history.json`, `prices-report.md`.
  Une source qui reconnaît < 60 % de la veille garde ses anciens prix (avertissement Actions).
- Recettes importées (CC BY-SA 4.0, voir `data/RECETTES-LICENCE.md`) :
  `recipes-wikibooks.json` (~550, Wikibooks anglais traduit, `prices/wikibooks.mjs`) et
  `recipes-wikilivres.json` (~245, Livre de cuisine en français, `prices/fetch-wikilivres.mjs`
  → `prices/wikilivres.mjs`) et `recipes-kookboek.json` (~130, Kookboek néerlandais,
  `prices/fetch-kookboek.mjs` → `prices/kookboek.mjs` + traductions faites à la main dans
  `prices/kookboek-fr.json`, clé = titre néerlandais, `null` = écartée). L'app les charge dans
  l'ordre Wikilivres (`wl-`), Kookboek (`kb-`), Wikibooks (`wb-`) ; un nom déjà vu est ignoré.
  ~1 010 recettes en tout. Format : `[nom, type, minutes, ustensiles, ingrédients, étapes, src, fam?]`,
  ingrédients `clé:quantité-par-personne` et `~placard`.
- `recipe-images.json` : ~515 photos libres Wikimedia (URL, auteur, licence, page), chargées à la
  demande ; `prices/recipe-images.mjs` (à lancer via `data-raw`). Les recherches « devinées »
  sur Wikipédia sont listées dans `<sortie>.guesses.txt` : **les relire** et ajouter les ratées
  (plante, animal vivant, autre plat, personne…) à `BAD_GUESS`. Les ids de photo doivent
  correspondre aux recettes réellement gardées par l'app (le script reporte la photo d'un doublon).

## Fonctions principales (côté utilisateur)

Liste (recherche dans les 3 catalogues, dictée, scan), plan (coût total avec trajet et temps,
% de vrais prix, panier le moins cher en euros), commande Collect (prix en colonne, équivalent
d'un article d'une autre enseigne), panier malin (questionnaire, budget → plats, « faire confiance
/ vérifier les plats », 👎 pas pour moi), Plats (Mon menu dans l'ordre où cuisiner, plats gardés ❤️,
menu promo, placard, filtres), halal (boucher halal + boucheries proches), « Courses faites » →
« C'était exactement ça ? » → placard avec dates limites + reçu, Budget (reçus, « Copier pour
Claude », diagrammes familles et Nutri-Score, « Refaire cette liste »), réglages (régime, viandes
préférées, plats classiques / découverte, œufs, carte Delhaize Plus).

## Pistes et limites connues

- Nutri-Score absent pour Colruyt (pas publié) ; synchro du foyer entre téléphones (non fait).
- Lidl et Carrefour Express : prix estimés. Lidl n'a ni API publique ni boutique en ligne
  alimentaire (lidl.be : ~175 articles en ligne, robots.txt interdit les listes) ; Open Prices
  presque vide pour Lidl BE. Piste proposée : retenir les vrais prix des tickets Lidl Plus scannés.
- Quantités du placard non décomptées quand on cuisine (« Fini » à la main).
- Kookboek : 131 recettes traduites sur ~560 ; les autres ont un ingrédient introuvable en
  Belgique ou une page sans liste d'ingrédients. Pour en ajouter : compléter `MAP` dans
  `prices/kookboek.mjs`, relancer, traduire les nouvelles dans `kookboek-fr.json` (le script
  liste celles « À traduire »).
- cuisine-libre.org (~600 recettes CC0) : demander leur accord avant tout relevé automatique.
