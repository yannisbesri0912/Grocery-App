# 🛒 Grocery Opti

App web (installable sur téléphone) qui trouve **où faire ses courses au coût total le plus bas**
autour du boulevard du Triomphe (Auderghem, Bruxelles), avec les **vrais prix** des enseignes.

Coût total = prix des produits + frais éventuels + temps passé à se déplacer et en magasin
(valorisé au taux horaire que tu choisis). L'app compare toutes les combinaisons de magasins et
l'ordre de passage, puis donne le meilleur plan, la liste par magasin et l'itinéraire.

## Utiliser l'app

👉 **https://yannisbesri0912.github.io/Grocery-App/** — à ouvrir sur le téléphone, puis
« Ajouter à l'écran d'accueil ». Les prix sont mis à jour chaque nuit. Ta liste reste sur
ton téléphone (onglet Réglages → Exporter pour la sauvegarder).

Première fois : dans Réglages, mets ton adresse exacte puis « Localiser » pour des distances
précises (elle reste sur ton appareil, jamais dans ce dépôt).

## D'où viennent les prix

Chaque nuit, le workflow **Prix réels** (`.github/workflows/prices.yml`) met à jour
`data/prices.json`, puis redéploie l'app.

| Enseigne | Source | Ce qu'on obtient |
|---|---|---|
| **Colruyt** | Catalogue complet publié chaque jour par le projet open source [colruyt-products-scraper](https://github.com/BelgianNoise/colruyt-products-scraper) | Prix réels de ~16 000 articles, sans toucher au site de Colruyt |
| **Delhaize** | Robot navigateur (`prices/browser.mjs`) : une recherche par produit sur delhaize.be | Prix affichés sur le site |
| **Aldi** | Même robot sur aldi.be | Prix affichés sur le site |
| **Promotions** (Colruyt, Delhaize, Aldi, Lidl) | API publique [PrijsProfeet](https://www.prijsprofeet.be) | Promotions de la semaine |
| **Lidl, Carrefour Express** | Estimation | Prix Colruyt × indice de prix de l'enseigne (+ promos Lidl) |

Pour chaque produit de la liste, `src/match-rules.js` décrit ce qu'on cherche (mots-clés FR/NL,
exclusions, format). `src/matcher.js` retient l'article **le moins cher au kilo/litre/pièce**
dans un format proche, puis ramène son prix au format de la liste. Le rapport
`data/prices-report.md` montre l'article retenu pour chaque produit et chaque enseigne.

Une source en panne (site changé, blocage) garde ses prix de la veille ; l'app indique la date
des prix et marque les estimations.

### Blocages et NordVPN

Colruyt ne demande aucun accès à son site. Pour Delhaize et Aldi, le robot fait environ 75
recherches espacées par nuit, depuis les serveurs de GitHub. Si un site bloque ces serveurs, on
peut faire passer le robot par **NordVPN** :

1. Sur nordaccount.com → NordVPN → **Configuration manuelle** → copie les *identifiants de
   service* (ce ne sont pas ton e-mail et ton mot de passe).
2. Dans ce dépôt : **Settings → Secrets and variables → Actions → New repository secret** :
   `NORDVPN_USER` et `NORDVPN_PASS`.

Le workflow se connecte alors à un serveur belge avant de lancer le robot. Les adresses de VPN
sont parfois elles-mêmes bloquées : c'est un essai, pas une garantie.

Une clé PrijsProfeet gratuite (secret `PRIJSPROFEET_KEY`) relève leur limite de requêtes ;
elle n'est pas nécessaire.

## Onglets

| Onglet | Fonction |
|---|---|
| 🧺 **Liste** | ~75 produits courants (ou ajout libre), quantités, tri par rayon. |
| 🧭 **Plan** | Meilleurs plans : 1 à 3 magasins, ou Collect&Go / livraison Delhaize. Liste à cocher, itinéraire, WhatsApp. « Courses faites » retire les articles cochés. |
| 🔁 **Auto** | Produits récurrents remis automatiquement dans la liste quand il faut en racheter ; la fréquence s'ajuste à ta consommation. |
| 💶 **Prix** | Prix de chaque enseigne avec leur source (réel, promo, estimation) et l'article retenu. Tu peux corriger avec ton ticket. |
| ⚙️ **Réglages** | Adresse exacte (gardée sur ton appareil), magasins à inclure, sauvegarde. |

## Lancer en local

```bash
npm install
npm start               # http://localhost:5173
npm test                # tests
npm run prices          # met à jour data/prices.json (toutes les sources)
node prices/run.mjs colruyt promos   # seulement certaines sources
```

## Limites

- Les prix Colruyt viennent du magasin choisi par le projet source, pas forcément d'Auderghem
  (les écarts entre magasins Colruyt sont faibles).
- Le rapprochement produit ↔ article se fait par mots-clés : vérifie le rapport, et corrige une
  règle dans `src/match-rules.js` si un article retenu ne convient pas.
- Horaires, frais Collect&Go et livraison Delhaize : valeurs indicatives (`src/data.js`).
- L'app ne passe pas commande à ta place.
