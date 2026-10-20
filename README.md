# 🛒 Grocery Opti

App web (installable sur téléphone) qui trouve **où faire ses courses au coût total le plus bas**
autour de ton adresse, avec les **vrais prix** des supermarchés belges.

Coût total = prix des produits + frais éventuels + temps passé à se déplacer et en magasin
(valorisé au taux horaire que tu choisis). L'app compare toutes les combinaisons de magasins et
l'ordre de passage, puis donne le meilleur plan, la liste par magasin et l'itinéraire.

## Utiliser l'app

👉 **https://yannisbesri0912.github.io/Grocery-App/** — à ouvrir sur le téléphone, puis
« Ajouter à l'écran d'accueil ». Les prix sont mis à jour chaque nuit. Ta liste reste sur
ton téléphone (onglet Réglages → Exporter pour la sauvegarder).

Au premier lancement, l'app demande ton adresse (ou ta position) et cherche les supermarchés
autour via OpenStreetMap. L'adresse est **enregistrée seulement sur ton téléphone**, jamais dans
ce dépôt ni sur un serveur de l'app (il n'y en a pas). Pour fonctionner, elle est envoyée aux
services qui en ont besoin : Nominatim (adresse → carte), Overpass (magasins et boucheries
proches), Google Maps quand tu ouvres un itinéraire. Les codes-barres passent par Open Food Facts.

## D'où viennent les prix

Chaque nuit, le workflow **Prix réels** (`.github/workflows/prices.yml`) met à jour
`data/prices.json`, puis redéploie l'app.

| Enseigne | Source | Ce qu'on obtient |
|---|---|---|
| **Colruyt** | Copie publique du catalogue publiée chaque jour par le projet open source [colruyt-products-scraper](https://github.com/BelgianNoise/colruyt-products-scraper), relue deux fois par jour | ~9 500 articles à leur vrai prix, sans toucher au site de Colruyt |
| **Delhaize** | Catalogue complet lu chaque nuit (`prices/catalogs.mjs`), rayon par rayon | ~14 000 articles, promos et prix carte Plus, Nutri-Score |
| **Aldi** | Catalogue complet lu chaque nuit (`prices/catalogs.mjs`) | ~2 300 articles |
| **Promotions** (Colruyt, Delhaize, Aldi, Lidl) | API publique [PrijsProfeet](https://www.prijsprofeet.be) | Promotions de la semaine |
| **Lidl, Carrefour Express** | Estimation | Prix Colruyt × indice de prix de l'enseigne (+ promos Lidl) |

Une recherche sur le site (`prices/browser.mjs`) ne sert plus qu'en secours, pour les rares
produits absents d'un catalogue.

Pour chaque produit de la liste, `src/match-rules.js` décrit ce qu'on cherche (mots-clés FR/NL,
exclusions, format). `src/matcher.js` retient l'article **le moins cher au kilo/litre/pièce**
dans un format proche (jamais une conserve ni un mélange pour un fruit ou légume frais), et
garde aussi les autres formats. Le rapport `data/prices-report.md` montre l'article retenu
pour chaque produit et chaque enseigne.

Dans le plan, l'app paie des **paquets entiers** (750 g vendus pour 500 g voulus = 1 paquet ;
on ne manque jamais de plus de 5 % d'un paquet) et choisit le format le moins cher pour la
quantité voulue. Chaque format garde sa propre promo ; une promo terminée revient au prix normal.

Une source en panne, ou qui reconnaît beaucoup moins de produits que d'habitude, garde ses prix
de la veille et laisse un avertissement dans l'onglet Actions. L'app indique la date des prix,
marque les estimations (« approx. ») et affiche la part de vrais prix dans chaque plan.

### VPN (optionnel)

Les catalogues Delhaize et Aldi sont lus une fois par nuit, avec peu de requêtes et sans compte.
Si un jour un site bloquait les serveurs de GitHub, le workflow peut passer par NordVPN
(secrets `NORDVPN_USER` et `NORDVPN_PASS`, identifiants de *service* NordVPN). Sans ces
secrets, l'étape est simplement sautée.

Une clé PrijsProfeet gratuite (secret `PRIJSPROFEET_KEY`) relève leur limite de requêtes ;
elle n'est pas nécessaire.

## Onglets

| Onglet | Fonction |
|---|---|
| 🧺 **Liste** | ~75 produits courants (ou ajout libre), quantités, tri par rayon. |
| 🧭 **Plan** | Meilleurs plans : 1 à 3 magasins, ou Collect&Go / livraison Delhaize. Liste à cocher, itinéraire, WhatsApp. « Courses faites » retire les articles cochés. Pour un retrait Collect : **Préparer ma commande** (panier assisté, voir plus bas). |
| 🔁 **Auto** | Produits récurrents remis automatiquement dans la liste quand il faut en racheter ; la fréquence s'ajuste à ta consommation. |
| 💶 **Prix** | Prix de chaque enseigne avec leur source (réel, promo, estimation) et l'article retenu. Tu peux corriger avec ton ticket. |
| ⚙️ **Réglages** | Adresse exacte (gardée sur ton appareil), magasins à inclure, sauvegarde. |

## Recherche dans les catalogues

La recherche fouille **les catalogues complets Colruyt, Delhaize et Aldi** (vrais prix mis à
jour chaque nuit dans `data/catalog-*.json`). Les noms Colruyt sont en néerlandais : l'app les
traduit en français (`src/translate.js`). Le produit général (comparé dans tous les magasins)
passe d'abord, puis les articles précis de chaque enseigne. Un article vendu dans les deux
enseignes est comparé automatiquement (`data/same.json`) ; sinon l'app propose un
**équivalent** (même type, format proche, bio/sans gluten/demi-écrémé respectés).

## Panier malin

Liste → **Panier malin** : on donne un budget, l'app compose le meilleur panier
aux vrais prix Colruyt (`src/smart.js`). Chaque produit a jusqu'à trois choix :
premier prix (Everyday), marque Colruyt (Boni), grande marque. Les produits
« indispensables » passent d'abord au moins cher, puis les propositions
(habitudes, produits courants) qui rentrent dans le budget, puis l'app monte
en gamme avec ce qui reste (« Le meilleur dans mon budget ») — ou pas (« Le
moins cher »). Toucher une gamme l'impose. « Mettre ce panier dans ma liste »
remplace la liste ; le plan choisit ensuite les magasins.

## Questions et plats

- **Questions** (Panier malin) : *Simple* (5 questions : budget, personnes,
  jours, repas à cuisiner, alimentation) ou *Complet* (20 : ustensiles,
  temps, allergies, petit-déj, boissons, viande/poisson, entretien…). Les
  réponses donnent les plats proposés et les produits de base
  (`src/questions.js`).
- **Plats** (onglet) : 659 recettes — 104 écrites pour l'app (`src/recipes.js`)
  et 555 adaptées du [Wikibooks Cookbook](https://en.wikibooks.org/wiki/Cookbook:Table_of_Contents)
  (CC BY-SA 4.0, `data/recipes-wikibooks.json`, voir `data/RECETTES-LICENCE.md`) :
  traduites en français, mesures américaines converties, ingrédients reliés
  aux produits (`prices/wikibooks.mjs`). Toutes
  filtrées selon les appareils de la cuisine (taques, four, micro-ondes, air
  fryer, bouilloire, mixeur), le régime et les allergies, avec un prix par
  personne aux vrais prix Colruyt. « Ajouter à ma liste » ajoute les
  ingrédients (en paquets entiers : deux recettes à 250 g de pâtes = un
  paquet). Dans le panier malin, un plat compte le prix des paquets qu'il fait
  acheter.

**Photos des plats** : 252 recettes ont une photo libre de Wikimedia Commons (image de la page
Wikibooks de la recette, sinon de l'article Wikipédia du plat), avec auteur et licence affichés
sur la recette (`data/recipe-images.json`, créé par `prices/recipe-images.mjs`). Les photos ne
sont pas copiées dans le dépôt : l'app les charge depuis Wikimedia quand on les regarde. Les
autres plats ont une icône.

**Panier malin, à la fin des questions** : *Faire confiance au panier malin* (le panier tout de
suite) ou *Vérifier les plats* : « Pas pour moi » écarte un plat pour de bon et le remplace par un
autre du même genre (viande, poisson, végé) dans le budget.

## Reçus et dépenses

Chaque « Courses faites » (et chaque ticket scanné) garde un **reçu** : Budget → **Mes reçus**.
Pour chaque article : produit demandé, article acheté, quantité, prix (réel, promo ou estimé),
famille (viande, biscuits et sucreries, produits ménagers…) et Nutri-Score quand il est connu
(Delhaize, Aldi). Un reçu se copie en Markdown (« Copier pour Claude ») ou se télécharge en `.md`,
pour vérifier un problème. Les diagrammes montrent où part l'argent (par famille) et le
Nutri-Score des achats, sur le mois, 3 mois ou tout (`src/spend.js`).

## Panier assisté (Collect&Go, Delhaize Collect)

Dans le plan, **Préparer ma commande** liste les articles avec un bouton par
produit qui l'ouvre sur le site du magasin : fiche produit Delhaize, sinon une
recherche (sans la marque d'une autre enseigne). On l'ajoute au panier sur le site, on
revient, la case est cochée. Le créneau et le paiement se font sur le site.
L'app ne demande aucun identifiant et ne touche pas au compte.

Collect&Go (Colruyt) n'a pas d'adresse de recherche directe : le bouton copie
le nom du produit et ouvre le site, il suffit de le coller dans la recherche. Si
tu colles une fois l'adresse d'une fiche produit, l'app en déduit des liens
directs pour tous les produits (aucun robot ne visite le site).

## Halal

Réglages → Mon alimentation → **Halal** : recettes sans porc ni alcool, viande
mise sur la liste du **boucher halal** (avec les boucheries proches, d'après
OpenStreetMap) au lieu du plan supermarché ; seuls les articles marqués « halal »
restent achetables en magasin. Porc, alcool et plats avec viande sont signalés
dans la recherche et la liste (`src/halal.js`). C'est une aide, pas une garantie.

## Sécurité et vie privée

- Pas de compte, pas de serveur : tout est enregistré dans le navigateur du téléphone.
- Une liste partagée par lien, une sauvegarde importée ou les données enregistrées sont
  revérifiées champ par champ (`src/validate.js`) ; tout ce qui est affiché est échappé, et la
  page interdit le code en ligne (Content-Security-Policy).
- Le rapport « Signaler un problème » n'inclut pas ton adresse.

## Lancer en local

```bash
npm ci
npm start               # http://localhost:5173
npm test                # tests
npm run prices          # met à jour data/prices.json (toutes les sources)
node prices/run.mjs colruyt promos   # seulement certaines sources
```

## Limites

- Les prix Colruyt viennent du magasin choisi par le projet source, pas forcément du tien
  (les écarts entre magasins Colruyt sont faibles).
- Le rapprochement produit ↔ article se fait par mots-clés, rayon et format : vérifie le
  rapport, et corrige une règle dans `src/match-rules.js` si un article retenu ne convient pas.
- Lidl et Carrefour Express : prix estimés (pas de catalogue public fiable).
- Horaires : ceux renseignés dans OpenStreetMap (absents pour certains magasins). Frais Collect&Go
  et livraison Delhaize : valeurs indicatives (`src/data.js`).
- L'app ne passe pas commande à ta place.
