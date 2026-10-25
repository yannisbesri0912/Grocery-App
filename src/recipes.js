// Recettes : base écrite pour l'app (libre, aucune source tierce). Chaque
// ingrédient correspond à un produit de l'app (prix comparés partout) ou à
// une recherche dans le catalogue Colruyt, avec une quantité PAR PERSONNE.
// Les ustensiles servent à ne proposer que les plats faisables chez soi.

// Ustensiles de cuisine.
export const TOOLS = {
  plaques: 'Taques / plaques',
  four: 'Four',
  micro: 'Micro-ondes',
  airfryer: 'Air fryer',
  bouilloire: 'Bouilloire',
  mixeur: 'Mixeur',
};

// Ingrédients. p : produit de l'app ; q : recherche dans le catalogue Colruyt.
// pack : contenance d'un paquet [quantité, unité] ; ref : prix indicatif d'un
// paquet (si le catalogue n'est pas chargé).
// flags : m viande, p porc, f poisson, d lait, e œuf, g gluten, n fruits à coque, a alcool.
// pantry : ingrédient de placard (pas acheté pour une recette).
const P = (p, amount, unit, flags = '') => ({ p, pack: [amount, unit], flags });
const Q = (q, name, amount, unit, ref, flags = '') => ({ q, name, pack: [amount, unit], ref, flags });
export const ING = {
  // Produits de l'app
  bananes: P('bananes', 1000, 'g'), pommes: P('pommes', 1000, 'g'), oranges: P('oranges', 2000, 'g'),
  citrons: P('citrons', 5, 'pc'), tomates: P('tomates', 1000, 'g'), concombre: P('concombre', 1, 'pc'),
  salade: P('salade', 1, 'pc'), carottes: P('carottes', 1000, 'g'), oignons: P('oignons', 1000, 'g'),
  ail: P('ail', 250, 'g'), pdt: P('pdt', 2500, 'g'), courgettes: P('courgettes', 1000, 'g'),
  poivrons: P('poivrons', 500, 'g'), brocoli: P('brocoli', 500, 'g'), champignons: P('champignons', 500, 'g'),
  avocats: P('avocats', 2, 'pc'), pain: P('pain', 800, 'g', 'g'), baguette: P('baguette', 1, 'pc', 'g'),
  lait: P('lait', 1000, 'ml', 'd'), oeufs: P('oeufs', 12, 'pc', 'e'), beurre: P('beurre', 250, 'g', 'd'),
  yaourts: P('yaourts', 8, 'pc', 'd'), gouda: P('gouda', 300, 'g', 'd'), emmental: P('emmental', 200, 'g', 'd'),
  mozzarella: P('mozzarella', 125, 'g', 'd'), creme: P('creme', 200, 'ml', 'd'), skyr: P('skyr', 500, 'g', 'd'),
  poulet: P('poulet', 1000, 'g', 'm'), hache: P('hache', 500, 'g', 'mp'), jambon: P('jambon', 200, 'g', 'mp'),
  saumon: P('saumon', 250, 'g', 'f'), thon: P('thon', 240, 'g', 'f'), merguez: P('merguez', 6, 'pc', 'm'),
  pates: P('pates', 1000, 'g', 'g'), riz: P('riz', 1000, 'g'), farine: P('farine', 1000, 'g', 'g'),
  sucre: P('sucre', 1000, 'g'), 'tomates-conc': P('tomates-conc', 700, 'g'), chocolat: P('chocolat', 200, 'g'),
  'pois-chiches': P('pois-chiches', 400, 'g'), mayonnaise: P('mayonnaise', 500, 'ml', 'e'),
  'legumes-surg': P('legumes-surg', 1000, 'g'), frites: P('frites', 1000, 'g'), pizza: P('pizza', 1, 'pc', 'gd'),
  biere: P('biere', 24, 'pc', 'a'),
  // Catalogue Colruyt
  boeuf: Q('rundergehakt', 'Haché pur bœuf', 500, 'g', 5.5, 'm'),
  steak: Q('steak cat', 'Steak de bœuf', 300, 'g', 6.5, 'm'),
  'boeuf-ragout': Q('runderstoofvlees', 'Bœuf à braiser', 500, 'g', 8.5, 'm'),
  'steak-burger': Q('hamburger bœuf', 'Hamburgers bœuf-porc', 4, 'pc', 4.5, 'mp'),
  dinde: Q('filet de dinde', 'Filet de dinde', 500, 'g', 6.5, 'm'),
  lardons: Q('lardons', 'Lardons', 200, 'g', 2.3, 'mp'),
  chorizo: Q('chorizo', 'Chorizo', 200, 'g', 3, 'mp'),
  crevettes: Q('crevettes', 'Crevettes', 200, 'g', 5, 'f'),
  cabillaud: Q('cabillaud', 'Filet de cabillaud', 400, 'g', 7.5, 'f'),
  moules: Q('moules', 'Moules', 1000, 'g', 6, 'f'),
  parmesan: Q('parmigiano râpé', 'Parmesan', 100, 'g', 2.8, 'd'),
  feta: Q('feta', 'Feta', 200, 'g', 2.5, 'd'),
  cheddar: Q('cheddar', 'Cheddar en tranches', 200, 'g', 2.5, 'd'),
  reblochon: Q('reblochon', 'Reblochon', 1, 'pc', 6, 'd'),
  'lait-coco': Q('lait de coco', 'Lait de coco', 400, 'ml', 1.6),
  'pate-feuil': Q('pâte feuilletée', 'Pâte feuilletée', 1, 'pc', 1.5, 'gd'),
  'pate-brisee': Q('kruimeldeeg', 'Pâte brisée', 1, 'pc', 1.5, 'gd'),
  'pate-pizza': Q('pizzadeeg', 'Pâte à pizza', 1, 'pc', 1.8, 'g'),
  tortillas: Q('wraps 6st', 'Tortillas / wraps', 8, 'pc', 2, 'g'),
  'pain-burger': Q('pains hamburger', 'Pains à hamburger', 4, 'pc', 1.8, 'g'),
  'pain-mie': Q('toast', 'Pain de mie', 20, 'pc', 1.7, 'g'),
  'pain-pita': Q('pains pita', 'Pains pita', 6, 'pc', 1.8, 'g'),
  bouchees: Q('vol-au-vent bladerd', 'Bouchées à la reine', 4, 'pc', 2.5, 'gd'),
  chapelure: Q('paneermeel', 'Chapelure', 400, 'g', 1.2, 'g'),
  lasagne: Q('lasagnebladen', 'Feuilles de lasagne', 500, 'g', 1.5, 'g'),
  gnocchi: Q('gnocchi', 'Gnocchi', 500, 'g', 1.8, 'g'),
  nouilles: Q('mie noodles', 'Nouilles', 250, 'g', 1.5, 'g'),
  semoule: Q('couscous', 'Semoule de couscous', 1000, 'g', 1.8, 'g'),
  quinoa: Q('quinoa', 'Quinoa', 500, 'g', 3.5),
  flocons: Q("flocons d'avoine", "Flocons d'avoine", 500, 'g', 1.2, 'g'),
  lentilles: Q('lentilles', 'Lentilles', 500, 'g', 1.8),
  'haricots-rouges': Q('haricots rouges', 'Haricots rouges', 400, 'g', 0.9),
  'haricots-verts': Q('sperziebonen extra fin', 'Haricots verts', 1000, 'g', 2.5),
  mais: Q('maïs', 'Maïs en boîte', 300, 'g', 0.9),
  epinards: Q('épinards', 'Épinards', 450, 'g', 1.5),
  poireaux: Q('poireaux', 'Poireaux', 1000, 'g', 2.2),
  aubergine: Q('aubergine', 'Aubergine', 1, 'pc', 1.2),
  'patate-douce': Q('pomme de terre doux', 'Patates douces', 1000, 'g', 2.8),
  'chou-fleur': Q('chou-fleur', 'Chou-fleur', 1, 'pc', 2.2),
  chicons: Q('chicons', 'Chicons', 1000, 'g', 2.8),
  courge: Q('potiron', 'Potiron / butternut', 1000, 'g', 2),
  persil: Q('persil', 'Persil', 1, 'pc', 1.2),
  gingembre: Q('gingembre', 'Gingembre', 100, 'g', 0.8),
  pesto: Q('pesto', 'Pesto', 190, 'g', 2),
  olives: Q('olives', 'Olives', 150, 'g', 1.5),
  soja: Q('sojasaus', 'Sauce soja', 250, 'ml', 1.8, 'g'),
  miel: Q('bloemenhoning', 'Miel', 250, 'g', 3),
  sirop: Q('sirop de Liège', 'Sirop de Liège', 450, 'g', 2.5),
  tofu: Q('tofu', 'Tofu', 200, 'g', 2.2),
  falafel: Q('falafels', 'Falafels', 200, 'g', 2.5, 'g'),
  houmous: Q('houmous', 'Houmous', 200, 'g', 1.8),
  'raisins-secs': Q('raisins secs', 'Raisins secs', 500, 'g', 2),
  noix: Q('walnoten', 'Noix', 600, 'g', 8, 'n'),
  amandes: Q('amandelen', 'Amandes', 250, 'g', 5, 'n'),
  cacao: Q('cacaopoeder', 'Cacao en poudre', 250, 'g', 4),
  'fromage-frais': Q('roomkaas', 'Fromage frais', 200, 'g', 1.5, 'd'),
  cacahuete: Q('pindakaas', 'Beurre de cacahuète', 350, 'g', 1.6, 'n'),
  porc: Q('varkenskotelet', 'Côtelettes de porc', 1000, 'g', 6.2, 'mp'),
  fraises: Q('BONI fraises', 'Fraises', 1000, 'g', 4),
  // Placard : supposé à la maison, listé à part
  huile: { p: 'huile', pack: [1000, 'ml'], pantry: true, name: 'Huile' },
  epices: { p: 'sel-poivre', pack: [1, 'pc'], pantry: true, name: 'Sel, poivre, épices' },
  bouillon: { q: 'bouillon cubes', name: 'Bouillon (cube)', pack: [1, 'pc'], ref: 1.5, pantry: true },
  moutarde: { q: 'moutarde', name: 'Moutarde', pack: [1, 'pc'], ref: 1.2, pantry: true },
  vinaigre: { q: 'vinaigre', name: 'Vinaigre', pack: [1, 'pc'], ref: 1, pantry: true },
};

// Recettes : [nom, type, minutes, ustensiles, ingrédients par personne, étapes].
// ustensiles : groupes séparés par un espace, alternatives par « | »
//   (« four|airfryer plaques » = un four OU un air fryer, ET des plaques).
// ingrédients : « clé:quantité » (g, ml ou pc) ; « ~clé » = placard.
const R = [
  // Pâtes
  ['Spaghetti bolognaise', 'plat', 30, 'plaques', 'pates:100g boeuf:125g tomates-conc:150g oignons:60g ail:5g emmental:20g ~huile ~epices', "Épluche et hache finement l'oignon et l'ail.\nFais chauffer un filet d'huile dans une grande poêle à feu moyen. Fais revenir l'oignon 3 min, jusqu'à ce qu'il devienne transparent, puis ajoute l'ail 1 min.\nAjoute le haché et émiette-le à la cuillère en bois. Laisse-le dorer 5 min, jusqu'à ce qu'il n'y ait plus de rose.\nVerse la sauce tomate, sale, poivre (et ajoute des herbes si tu en as). Baisse à feu doux et laisse mijoter 15 min en remuant de temps en temps.\nPendant ce temps, fais bouillir une grande casserole d'eau salée. Plonge les spaghetti et fais-les cuire le temps indiqué sur le paquet (8 à 10 min), en remuant au début pour qu'ils ne collent pas.\nGoûte un spaghetti : il doit être tendre mais encore un peu ferme. Égoutte.\nSers les pâtes avec la sauce par-dessus et le fromage râpé."],
  ['Pâtes carbonara', 'plat', 20, 'plaques', 'pates:100g lardons:60g oeufs:1pc parmesan:20g ~epices ~huile', "Fais bouillir une grande casserole d'eau salée et fais cuire les pâtes le temps indiqué sur le paquet.\nPendant ce temps, fais dorer les lardons à sec (sans huile) dans une poêle à feu moyen, 5 à 6 min, jusqu'à ce qu'ils soient croustillants. Coupe le feu.\nDans un bol, bats les œufs avec le parmesan râpé et beaucoup de poivre.\nAvant d'égoutter les pâtes, garde un petit verre d'eau de cuisson.\nMets les pâtes égouttées dans la poêle des lardons, feu éteint. Verse le mélange œuf-parmesan et mélange vite : la chaleur des pâtes cuit l'œuf et fait une sauce crémeuse.\nSi c'est trop épais, ajoute un peu d'eau de cuisson. Sers tout de suite."],
  ['Pâtes au thon et à la tomate', 'plat', 20, 'plaques', 'pates:100g thon:80g tomates-conc:120g oignons:40g ~huile ~epices', "Hache l'oignon. Égoutte le thon.\nFais revenir l'oignon dans un filet d'huile à feu moyen, 3 min.\nAjoute la sauce tomate et le thon émietté, sale, poivre. Laisse chauffer à feu doux 10 min.\nPendant ce temps, fais cuire les pâtes dans une grande casserole d'eau bouillante salée, le temps indiqué sur le paquet.\nÉgoutte les pâtes, mélange-les à la sauce et sers."],
  ['Pâtes au pesto et tomates', 'plat', 15, 'plaques', 'pates:100g pesto:40g parmesan:15g tomates:80g', "Fais cuire les pâtes dans une grande casserole d'eau bouillante salée, le temps indiqué sur le paquet.\nPendant ce temps, coupe les tomates en petits dés.\nGarde 2 cuillères à soupe d'eau de cuisson, puis égoutte les pâtes.\nRemets les pâtes dans la casserole, ajoute le pesto et l'eau de cuisson et mélange : la sauce devient plus onctueuse.\nAjoute les tomates, parsème de parmesan et sers."],
  ['Pâtes crème et champignons', 'plat', 20, 'plaques', 'pates:100g champignons:125g creme:50ml oignons:30g emmental:20g ~huile ~epices', "Hache l'oignon. Nettoie les champignons et coupe-les en lamelles.\nFais chauffer un filet d'huile dans une poêle à feu moyen-vif. Fais revenir l'oignon 2 min, puis les champignons 6 à 8 min, jusqu'à ce que leur eau s'évapore et qu'ils dorent.\nAjoute la crème, sale, poivre et laisse épaissir 3 min à feu doux.\nPendant ce temps, fais cuire les pâtes dans de l'eau bouillante salée, le temps indiqué sur le paquet. Égoutte.\nMélange les pâtes à la sauce et parsème de fromage râpé."],
  ['Lasagnes à la bolognaise', 'plat', 75, 'four plaques', 'lasagne:80g boeuf:120g tomates-conc:180g oignons:50g lait:150ml beurre:15g farine:15g emmental:30g ~epices ~huile', "Préchauffe le four à 180 °C.\nBolognaise : hache l'oignon et fais-le revenir 3 min dans un filet d'huile. Ajoute le haché, émiette-le et laisse dorer 5 min. Verse la sauce tomate, sale, poivre et laisse mijoter 10 min.\nBéchamel : dans une casserole, fais fondre le beurre à feu moyen. Ajoute la farine et remue 1 min.\nVerse le lait petit à petit en fouettant sans arrêt pour éviter les grumeaux. Laisse épaissir 3 à 5 min en fouettant : la sauce doit napper la cuillère. Sale, poivre (une pincée de muscade si tu en as).\nDans un plat, étale un peu de bolognaise, puis une couche de feuilles de lasagne, de la bolognaise, de la béchamel. Recommence jusqu'à épuisement, en finissant par de la béchamel.\nParsème de fromage râpé et enfourne 40 min : le dessus doit être doré et les feuilles tendres quand tu piques un couteau.\nLaisse reposer 5 min avant de couper."],
  ['Gratin de pâtes au jambon', 'plat', 35, 'four|airfryer plaques', 'pates:90g jambon:50g creme:50ml emmental:40g ~epices', "Préchauffe le four à 200 °C (ou l'air fryer à 180 °C).\nFais cuire les pâtes 2 min de moins que le temps du paquet (elles finissent au four). Égoutte.\nCoupe le jambon en petits morceaux.\nDans un plat, mélange les pâtes, le jambon et la crème. Sale peu (le jambon est salé) et poivre.\nCouvre de fromage râpé et enfourne 15 à 20 min, jusqu'à ce que le dessus soit bien doré."],
  ['Pâtes poulet brocoli', 'plat', 25, 'plaques', 'pates:90g poulet:110g brocoli:150g creme:40ml ail:5g ~huile ~epices', "Coupe le poulet en petits morceaux et le brocoli en petits bouquets. Hache l'ail.\nFais bouillir une grande casserole d'eau salée. Mets les pâtes à cuire ; 4 min avant la fin, ajoute le brocoli dans la même casserole.\nPendant ce temps, fais dorer le poulet dans un filet d'huile à feu moyen-vif, 6 à 8 min. Il est cuit quand il est blanc au centre.\nAjoute l'ail 1 min, puis la crème. Sale, poivre et laisse épaissir 2 min à feu doux.\nÉgoutte les pâtes et le brocoli, mélange-les à la sauce et sers."],
  ['One pot pasta tomate mozzarella', 'plat', 20, 'plaques', 'pates:100g tomates-conc:150g mozzarella:60g ail:5g ~huile ~epices', "Hache l'ail.\nMets dans une grande poêle ou une casserole : les pâtes crues, la sauce tomate, l'ail, un filet d'huile, du sel, du poivre et assez d'eau pour couvrir juste les pâtes (environ 2 fois le volume des pâtes).\nPorte à ébullition puis laisse cuire à feu moyen 10 à 12 min, en remuant souvent : l'eau est absorbée et la sauce épaissit.\nSi ça accroche avant que les pâtes soient tendres, ajoute un peu d'eau.\nCoupe le feu, ajoute la mozzarella en morceaux, couvre 1 min pour qu'elle fonde et sers."],
  ['Gnocchi poêlés sauce tomate', 'plat', 15, 'plaques', 'gnocchi:200g tomates-conc:120g mozzarella:50g ~huile ~epices', "Fais chauffer un filet d'huile dans une grande poêle à feu moyen-vif.\nMets les gnocchi crus en une seule couche et laisse-les dorer 3 min sans toucher, puis retourne-les et dore 3 min de plus.\nVerse la sauce tomate, sale, poivre et laisse chauffer 3 min en remuant.\nAjoute la mozzarella en morceaux, couvre 2 min pour qu'elle fonde et sers."],
  ['Pâtes aux courgettes et feta', 'plat', 20, 'plaques', 'pates:100g courgettes:150g feta:50g ail:5g citrons:0.25pc ~huile ~epices', "Lave les courgettes et coupe-les en petits dés. Hache l'ail.\nFais cuire les pâtes dans de l'eau bouillante salée, le temps indiqué sur le paquet. Garde un petit verre d'eau de cuisson.\nPendant ce temps, fais dorer les courgettes dans un filet d'huile à feu moyen-vif, 6 à 8 min. Ajoute l'ail 1 min, sale peu et poivre.\nMets les pâtes égouttées dans la poêle avec 2 à 3 cuillères d'eau de cuisson et le jus du citron, mélange.\nÉmiette la feta par-dessus et sers."],
  ['Spaghetti ail et huile', 'plat', 15, 'plaques', 'pates:110g ail:8g parmesan:15g ~huile ~epices', "Fais cuire les spaghetti dans une grande casserole d'eau bouillante salée, le temps indiqué sur le paquet. Garde un verre d'eau de cuisson.\nPendant ce temps, épluche l'ail et coupe-le en fines lamelles.\nFais chauffer 3 cuillères à soupe d'huile à feu doux et laisse l'ail cuire doucement 2 à 3 min : il doit blondir, pas brûler (sinon il devient amer). Ajoute du piment si tu aimes.\nMets les spaghetti égouttés dans la poêle avec un peu d'eau de cuisson et mélange bien pour enrober.\nPoivre, parsème de parmesan et sers."],
  // Riz, céréales
  ['Poulet curry coco et riz', 'plat', 30, 'plaques', 'riz:80g poulet:130g lait-coco:100ml oignons:50g ~huile ~epices', "Rince le riz dans une passoire, puis fais-le cuire 10 à 12 min dans une grande casserole d'eau bouillante salée. Égoutte.\nPendant ce temps, coupe le poulet en morceaux et hache l'oignon.\nFais chauffer un filet d'huile dans une poêle à feu moyen. Fais revenir l'oignon 3 min, puis ajoute le poulet et 1 à 2 cuillères à café de curry. Fais dorer 5 min en remuant.\nVerse le lait de coco, sale et laisse mijoter 10 min à feu doux : la sauce épaissit et le poulet finit de cuire (blanc au centre).\nSers le poulet et sa sauce sur le riz."],
  ['Riz cantonais', 'plat', 25, 'plaques', 'riz:80g oeufs:1pc jambon:40g legumes-surg:100g soja:10ml ~huile', "Fais cuire le riz 10 à 12 min dans de l'eau bouillante salée, égoutte-le et laisse-le refroidir (du riz de la veille, c'est encore mieux : il colle moins).\nCoupe le jambon en petits dés.\nDans une grande poêle ou un wok, fais chauffer un filet d'huile à feu vif. Bats l'œuf, verse-le et brouille-le 1 min. Retire-le.\nMets les légumes surgelés dans la poêle et fais-les sauter 4 à 5 min.\nAjoute le riz, le jambon et l'œuf, puis la sauce soja. Fais sauter 3 min en remuant sans arrêt et sers bien chaud."],
  ['Chili con carne', 'plat', 40, 'plaques', 'boeuf:110g haricots-rouges:100g tomates-conc:150g oignons:50g mais:40g riz:70g ~huile ~epices', "Fais cuire le riz 10 à 12 min dans de l'eau bouillante salée et égoutte-le.\nHache l'oignon. Égoutte et rince les haricots rouges et le maïs.\nFais revenir l'oignon dans un filet d'huile 3 min à feu moyen, puis ajoute le haché, émiette-le et laisse dorer 5 min.\nAjoute les épices (1 cuillère à café de cumin, du paprika, du piment selon ton goût), remue 1 min.\nVerse la sauce tomate, les haricots et le maïs. Sale, poivre et laisse mijoter 20 min à feu doux en remuant de temps en temps.\nSers le chili sur le riz."],
  ['Chili sin carne', 'plat', 40, 'plaques', 'lentilles:60g haricots-rouges:120g tomates-conc:150g oignons:50g mais:50g riz:70g ~huile ~epices', "Rince les lentilles. Égoutte et rince les haricots rouges et le maïs. Hache l'oignon.\nFais revenir l'oignon dans un filet d'huile 3 min, puis ajoute les épices (cumin, paprika, piment) et remue 1 min.\nAjoute les lentilles, la sauce tomate et un grand verre d'eau. Laisse cuire 15 min à feu doux à couvert.\nAjoute les haricots et le maïs, sale, poivre et laisse mijoter encore 10 min : les lentilles doivent être tendres. Ajoute un peu d'eau si ça épaissit trop.\nPendant ce temps, fais cuire le riz 10 à 12 min dans de l'eau bouillante salée et égoutte.\nSers le chili sur le riz."],
  ['Risotto aux champignons', 'plat', 35, 'plaques', 'riz:80g champignons:120g oignons:40g parmesan:20g beurre:10g ~bouillon', "Prépare le bouillon : 1 cube dans environ 250 ml d'eau chaude par personne. Garde-le chaud.\nHache l'oignon, coupe les champignons en lamelles.\nDans une casserole, fais fondre la moitié du beurre et fais revenir l'oignon 3 min. Ajoute les champignons 5 min.\nAjoute le riz cru et remue 1 min, jusqu'à ce que les grains deviennent un peu transparents.\nVerse une louche de bouillon et remue jusqu'à ce qu'il soit absorbé. Recommence louche par louche pendant 18 à 20 min, en remuant souvent : le riz doit être tendre et crémeux.\nHors du feu, ajoute le reste du beurre et le parmesan, mélange et sers."],
  ['Saumon, riz et brocoli', 'plat', 25, 'plaques|four', 'saumon:125g riz:75g brocoli:150g citrons:0.25pc creme:30ml ~huile ~epices', "Fais cuire le riz 10 à 12 min dans de l'eau bouillante salée ; ajoute le brocoli en petits bouquets 5 min avant la fin. Égoutte.\nPendant ce temps, sèche le saumon avec du papier, sale et poivre.\nFais chauffer un filet d'huile dans une poêle à feu moyen-vif. Pose le saumon côté peau et laisse cuire 4 min sans toucher, puis retourne et cuis 2 à 3 min. Il est cuit quand il se défait en lamelles.\nSauce : dans la même poêle, feu doux, verse la crème avec le jus du citron, sale, poivre et laisse épaissir 1 min.\nSers le saumon sur le riz et le brocoli, nappé de sauce."],
  ['Riz sauté aux crevettes', 'plat', 20, 'plaques', 'riz:80g crevettes:100g legumes-surg:120g oeufs:1pc soja:10ml ~huile', "Fais cuire le riz 10 à 12 min dans de l'eau bouillante salée, égoutte et laisse refroidir (le riz de la veille marche très bien).\nDans une grande poêle ou un wok à feu vif, fais chauffer un filet d'huile. Bats l'œuf et brouille-le 1 min, puis retire-le.\nFais sauter les crevettes 2 à 3 min jusqu'à ce qu'elles deviennent roses (décongèle-les d'abord si elles sont surgelées).\nAjoute les légumes surgelés et fais sauter 4 min.\nAjoute le riz, l'œuf et la sauce soja, fais sauter 3 min en remuant et sers."],
  ['Poulet teriyaki et riz', 'plat', 25, 'plaques', 'poulet:130g riz:80g soja:20ml miel:10g brocoli:100g ~huile', "Fais cuire le riz 10 à 12 min dans de l'eau bouillante salée et égoutte. Fais cuire le brocoli en bouquets 5 min à l'eau bouillante (ou à la vapeur).\nSauce : mélange la sauce soja, le miel et 2 cuillères à soupe d'eau.\nCoupe le poulet en morceaux et fais-le dorer dans un filet d'huile à feu moyen-vif, 6 à 8 min, jusqu'à ce qu'il soit blanc au centre.\nVerse la sauce et laisse-la réduire 2 à 3 min en remuant : elle devient brillante et nappe le poulet.\nSers le poulet et sa sauce sur le riz, avec le brocoli."],
  ['Curry de pois chiches', 'plat', 30, 'plaques', 'pois-chiches:200g lait-coco:100ml tomates-conc:100g oignons:50g riz:70g epinards:60g ~huile ~epices', "Rince le riz et fais-le cuire 10 à 12 min dans de l'eau bouillante salée. Égoutte.\nHache l'oignon. Égoutte et rince les pois chiches.\nFais revenir l'oignon dans un filet d'huile 3 min, puis ajoute 1 à 2 cuillères à café de curry (et du cumin si tu en as) et remue 1 min.\nAjoute la sauce tomate, le lait de coco et les pois chiches. Sale et laisse mijoter 15 min à feu doux.\nAjoute les épinards et remue 2 min, jusqu'à ce qu'ils fondent.\nSers sur le riz."],
  ['Dahl de lentilles corail', 'plat', 35, 'plaques', 'lentilles:80g lait-coco:100ml tomates-conc:80g oignons:40g gingembre:5g riz:60g ~huile ~epices', "Rince les lentilles corail dans une passoire. Hache l'oignon, râpe le gingembre.\nFais revenir l'oignon dans un filet d'huile 3 min, ajoute le gingembre et 1 cuillère à café de curry ou de curcuma, remue 1 min.\nAjoute les lentilles, la sauce tomate, le lait de coco et un grand verre d'eau. Sale.\nLaisse cuire 15 à 20 min à feu doux en remuant souvent : les lentilles se défont et le dahl devient crémeux. Ajoute de l'eau s'il épaissit trop.\nPendant ce temps, fais cuire le riz 10 à 12 min dans de l'eau bouillante salée et égoutte.\nSers le dahl avec le riz."],
  ['Paëlla express', 'plat', 40, 'plaques', 'riz:80g poulet:80g chorizo:30g crevettes:60g poivrons:80g oignons:40g legumes-surg:60g ~huile ~epices ~bouillon', "Prépare le bouillon : 1 cube dans environ 250 ml d'eau chaude par personne.\nCoupe le poulet en morceaux, le chorizo en rondelles, le poivron en lanières, hache l'oignon.\nDans une grande poêle, fais dorer le poulet et le chorizo dans un filet d'huile à feu moyen-vif, 5 min. Ajoute l'oignon et le poivron 3 min.\nAjoute le riz cru et 1 cuillère à café de paprika (et du curcuma pour la couleur), remue 1 min.\nVerse le bouillon chaud, sale, et laisse cuire 15 min à feu moyen sans remuer.\nAjoute les crevettes et les légumes surgelés sur le dessus et laisse cuire encore 5 min : le riz doit avoir absorbé le bouillon et être tendre.\nCouvre et laisse reposer 5 min hors du feu avant de servir."],
  ['Poulet basquaise', 'plat', 45, 'plaques', 'poulet:150g poivrons:150g tomates-conc:120g oignons:50g riz:70g ~huile ~epices', "Coupe le poulet en morceaux, les poivrons en lanières, hache l'oignon.\nFais dorer le poulet dans un filet d'huile à feu moyen-vif, 5 min, puis retire-le.\nDans la même cocotte, fais revenir l'oignon et les poivrons 8 min à feu moyen, jusqu'à ce qu'ils soient tendres.\nAjoute la sauce tomate, un peu de paprika (ou de piment d'Espelette), sale, poivre, et remets le poulet. Laisse mijoter 20 min à feu doux à couvert.\nPendant ce temps, fais cuire le riz 10 à 12 min dans de l'eau bouillante salée et égoutte.\nVérifie que le poulet est blanc au centre et sers avec le riz et beaucoup de sauce."],
  ['Escalope de dinde aux champignons', 'plat', 25, 'plaques', 'dinde:150g champignons:100g creme:40ml riz:70g ~huile ~epices', "Fais cuire le riz 10 à 12 min dans de l'eau bouillante salée et égoutte.\nCoupe les champignons en lamelles. Sale et poivre les escalopes.\nFais chauffer un filet d'huile à feu moyen-vif et fais dorer les escalopes 3 à 4 min de chaque côté : elles doivent être blanches au centre. Mets-les dans une assiette.\nDans la même poêle, fais revenir les champignons 5 min.\nAjoute la crème, sale, poivre et laisse épaissir 2 min. Remets les escalopes 1 min dans la sauce pour les réchauffer.\nSers avec le riz et la sauce aux champignons."],
  ['Tofu sauté aux légumes', 'plat', 25, 'plaques', 'tofu:120g legumes-surg:150g riz:70g soja:15ml ~huile', "Fais cuire le riz 10 à 12 min dans de l'eau bouillante salée et égoutte.\nÉgoutte le tofu, sèche-le avec du papier et coupe-le en cubes.\nFais chauffer un filet d'huile dans une grande poêle à feu vif et fais dorer le tofu 6 à 8 min en le retournant : il doit être doré sur toutes les faces.\nAjoute les légumes surgelés et fais sauter 5 min.\nVerse la sauce soja avec 2 cuillères à soupe d'eau, mélange 1 min et sers sur le riz."],
  ['Poke bowl au saumon', 'plat', 25, 'plaques', 'riz:80g saumon:100g avocats:0.5pc concombre:0.25pc soja:15ml', "Rince le riz et fais-le cuire 10 à 12 min dans de l'eau bouillante salée. Égoutte et laisse tiédir.\nCoupe le saumon en petits cubes (prends du saumon très frais, ou fais-le cuire 3 min à la poêle si tu préfères).\nMélange le saumon avec la moitié de la sauce soja et laisse mariner 10 min au frigo.\nCoupe l'avocat et le concombre en dés.\nDans un bol, mets le riz, puis le saumon, l'avocat et le concombre côte à côte. Arrose du reste de sauce soja."],
  ['Buddha bowl quinoa', 'plat', 25, 'plaques', 'quinoa:70g pois-chiches:100g avocats:0.5pc carottes:80g houmous:40g ~huile', "Rince le quinoa dans une passoire et fais-le cuire 12 à 15 min dans de l'eau bouillante salée. Égoutte.\nÉgoutte et rince les pois chiches. Fais-les dorer 5 min à la poêle avec un filet d'huile et des épices (paprika, cumin) si tu veux.\nRâpe les carottes, coupe l'avocat en tranches.\nDans un bol, dispose le quinoa, les pois chiches, les carottes et l'avocat.\nAjoute le houmous au centre (détends-le avec un peu d'eau ou de citron pour en faire une sauce)."],
  // Viandes, poissons, plats belges
  ['Poulet rôti et pommes de terre', 'plat', 60, 'four|airfryer', 'poulet:180g pdt:250g oignons:40g ~huile ~epices', "Préchauffe le four à 200 °C (ou l'air fryer à 190 °C).\nLave les pommes de terre (pas besoin de les éplucher) et coupe-les en quartiers. Coupe l'oignon en quartiers.\nDans un plat, mélange les pommes de terre et l'oignon avec un filet d'huile, du sel, du poivre et du paprika ou des herbes.\nFrotte les morceaux de poulet avec un peu d'huile, du sel, du poivre et du paprika, et pose-les sur les pommes de terre.\nEnfourne 45 à 50 min (35 min à l'air fryer), en retournant les pommes de terre à mi-cuisson.\nVérifie : la peau du poulet est dorée et le jus qui coule quand tu piques la partie la plus épaisse est clair, pas rosé. Les pommes de terre sont tendres quand un couteau y entre facilement.\nSers en arrosant avec le jus du plat."],
  ['Poulet pané croustillant et frites', 'plat', 30, 'airfryer|four', 'poulet:150g farine:15g oeufs:0.5pc chapelure:25g frites:200g ~huile ~epices', "Coupe le poulet en lanières ou en morceaux pas trop épais (2 cm), sale et poivre.\nPrépare trois assiettes : la farine, l'œuf battu, la chapelure.\nPasse chaque morceau dans la farine, puis dans l'œuf, puis dans la chapelure en appuyant pour qu'elle colle bien.\nAir fryer : 200 °C, mets d'abord les frites 8 min, puis ajoute le poulet (vaporisé d'un peu d'huile) et cuis encore 12 min en secouant à mi-cuisson. Au four : 200 °C, 20 à 25 min, en retournant à mi-cuisson.\nVérifie : la panure est dorée et le poulet est blanc au centre.\nSers avec une sauce (mayonnaise, ketchup ou sauce andalouse)."],
  ['Steak, frites et salade', 'plat', 25, 'plaques airfryer|four', 'steak:150g frites:200g salade:0.25pc ~huile ~epices', "Sors le steak du frigo 20 min avant pour qu'il cuise mieux.\nFais cuire les frites : 15 à 20 min à l'air fryer à 200 °C en secouant 2 fois (ou au four selon le paquet).\nPendant ce temps, lave la salade et prépare une vinaigrette (1 cuillère de vinaigre, 3 d'huile, sel, poivre, un peu de moutarde).\nFais chauffer une poêle à feu vif avec un filet d'huile jusqu'à ce qu'elle soit très chaude.\nPose le steak et ne le touche pas : 2 min par côté pour saignant, 3 min pour à point, 4 min pour bien cuit (pour un steak de 2 cm). Sale et poivre après cuisson.\nLaisse reposer le steak 2 min sur l'assiette, puis sers avec les frites et la salade assaisonnée."],
  ['Boulettes sauce tomate et purée', 'plat', 45, 'plaques', 'hache:150g tomates-conc:150g oignons:40g pdt:250g lait:60ml beurre:10g ~epices ~huile', "Purée : épluche les pommes de terre, coupe-les en morceaux et fais-les cuire 20 min dans de l'eau salée. Elles sont prêtes quand un couteau entre sans résistance.\nPendant ce temps, hache l'oignon. Mélange la viande hachée avec la moitié de l'oignon, du sel et du poivre, et forme des boulettes de la taille d'une balle de golf.\nFais dorer les boulettes dans un peu d'huile à feu moyen, 5 min en les retournant pour qu'elles soient dorées partout.\nAjoute le reste de l'oignon 2 min, puis la sauce tomate. Couvre et laisse mijoter 15 min à feu doux : les boulettes finissent de cuire dans la sauce.\nÉgoutte les pommes de terre, écrase-les au presse-purée avec le beurre et le lait chaud. Sale et poivre.\nSers les boulettes et leur sauce avec la purée."],
  ['Boulets à la liégeoise et frites', 'plat', 60, 'plaques airfryer|four', 'hache:160g oignons:60g sirop:30g frites:200g ~bouillon ~epices ~huile', "Hache finement les oignons.\nMélange la viande hachée avec un tiers des oignons, du sel et du poivre. Forme de grosses boulettes (environ 2 par personne).\nFais dorer les boulets dans un peu d'huile (ou de beurre) à feu moyen, 8 min, en les retournant.\nAjoute le reste des oignons et laisse-les dorer 5 min.\nAjoute le sirop de Liège et le bouillon (½ cube dans un verre d'eau chaude), remue, couvre et laisse mijoter 20 min à feu doux. La sauce doit être brune, brillante et un peu épaisse.\nPendant ce temps, fais cuire les frites (air fryer 200 °C 15 à 20 min, ou four selon le paquet).\nSers les boulets et leur sauce avec les frites."],
  ['Hachis parmentier', 'plat', 60, 'four|airfryer plaques', 'boeuf:120g pdt:250g lait:60ml beurre:10g oignons:40g emmental:25g ~epices ~huile', "Épluche les pommes de terre, coupe-les en morceaux et fais-les cuire 20 min dans de l'eau salée.\nPendant ce temps, hache l'oignon et fais-le revenir dans un peu d'huile 3 min. Ajoute la viande hachée, émiette-la et laisse dorer 6 à 8 min. Sale et poivre.\nPréchauffe le four à 200 °C (ou l'air fryer à 180 °C).\nÉgoutte les pommes de terre et écrase-les en purée avec le beurre et le lait chaud. Sale.\nDans un plat, étale la viande, puis la purée par-dessus. Parsème de fromage râpé.\nEnfourne 20 min, jusqu'à ce que le dessus soit doré."],
  ['Saucisses et purée', 'plat', 30, 'plaques', 'merguez:2pc pdt:250g lait:60ml beurre:10g ~epices', "Épluche les pommes de terre, coupe-les en morceaux et fais-les cuire 20 min dans de l'eau salée.\nPendant ce temps, fais cuire les saucisses à la poêle à feu moyen, 12 à 15 min, en les retournant souvent. Pique-les une fois avec une fourchette au début. Elles sont cuites quand elles sont bien dorées et que l'intérieur n'est plus rosé.\nÉgoutte les pommes de terre et écrase-les en purée avec le beurre et le lait chaud. Sale et poivre (une pincée de muscade si tu en as).\nSers les saucisses avec la purée et le jus de cuisson de la poêle."],
  ['Stoemp aux carottes et saucisse', 'plat', 35, 'plaques', 'merguez:2pc pdt:250g carottes:150g beurre:10g ~epices', "Épluche les pommes de terre et les carottes, coupe-les en morceaux.\nFais-les cuire ensemble 20 min dans de l'eau salée, jusqu'à ce qu'elles soient bien tendres.\nPendant ce temps, fais cuire les saucisses à la poêle à feu moyen 12 à 15 min en les retournant souvent, jusqu'à ce qu'elles soient dorées et cuites au centre.\nÉgoutte les légumes et écrase-les grossièrement avec le beurre : le stoemp garde des morceaux. Sale, poivre, une pincée de muscade.\nSers le stoemp avec les saucisses et leur jus."],
  ['Merguez et semoule aux légumes', 'plat', 40, 'plaques bouilloire|plaques', 'merguez:2pc semoule:80g carottes:100g courgettes:100g pois-chiches:80g oignons:40g ~huile ~epices', "Coupe les carottes en rondelles, les courgettes en dés, hache l'oignon. Égoutte les pois chiches.\nDans une casserole, fais revenir l'oignon dans un filet d'huile 3 min. Ajoute les carottes, 1 cuillère à café de cumin (ou d'épices à couscous), et assez d'eau pour couvrir. Sale et laisse cuire 10 min.\nAjoute les courgettes et les pois chiches et laisse cuire encore 10 min : c'est le bouillon qui servira de sauce.\nPendant ce temps, fais cuire les merguez à la poêle, sans huile, à feu moyen 10 min en les retournant.\nSemoule : mets-la dans un saladier, sale, ajoute un filet d'huile et verse le même volume d'eau bouillante. Couvre 5 min, puis égrène à la fourchette.\nSers la semoule avec les légumes, leur bouillon et les merguez."],
  ['Chicons au gratin', 'plat', 60, 'four plaques', 'chicons:250g jambon:50g lait:120ml beurre:15g farine:15g emmental:30g pdt:200g ~epices', "Préchauffe le four à 200 °C.\nRetire le cône amer à la base des chicons avec un couteau. Fais-les cuire 15 min dans de l'eau salée (ou 20 min à la poêle à couvert), puis égoutte-les bien en les pressant : ils rendent beaucoup d'eau.\nPendant ce temps, épluche les pommes de terre, coupe-les et fais-les cuire 20 min dans de l'eau salée.\nBéchamel : fais fondre le beurre, ajoute la farine et remue 1 min, puis verse le lait petit à petit en fouettant jusqu'à ce que la sauce épaississe. Ajoute la moitié du fromage, sale, poivre, une pincée de muscade.\nEnroule chaque chicon dans une tranche de jambon et range-les dans un plat. Nappe de béchamel et parsème du reste de fromage.\nEnfourne 20 à 25 min, jusqu'à ce que ce soit bien doré. Sers avec les pommes de terre (en purée si tu préfères)."],
  ['Carbonnade flamande', 'plat', 150, 'plaques airfryer|four', 'boeuf-ragout:180g biere:1pc oignons:80g pain:30g frites:200g ~moutarde ~epices ~huile', "Coupe la viande en gros cubes et sèche-les avec du papier. Émince les oignons.\nDans une cocotte, fais dorer la viande dans un peu d'huile à feu vif, en plusieurs fois pour qu'elle dore bien. Mets-la de côté.\nBaisse le feu et fais revenir les oignons 5 min jusqu'à ce qu'ils soient dorés.\nRemets la viande, verse la bière, sale et poivre. Tartine la tranche de pain de moutarde et pose-la sur le dessus : elle va fondre et épaissir la sauce.\nCouvre et laisse mijoter 2 heures à feu très doux en remuant de temps en temps. La viande est prête quand elle se défait à la fourchette. (Version halal : remplace la bière par du bouillon avec 1 cuillère de vinaigre et 1 de cassonade.)\nFais cuire les frites (air fryer ou four) et sers avec la carbonnade."],
  ['Vol-au-vent', 'plat', 45, 'plaques four|airfryer', 'poulet:120g champignons:80g creme:50ml bouchees:1pc frites:200g ~bouillon ~huile ~epices', "Coupe le poulet en petits morceaux et les champignons en lamelles.\nPrépare le bouillon : ½ cube dans un verre d'eau chaude.\nDans une casserole, fais dorer le poulet dans un peu de beurre ou d'huile 5 min, ajoute les champignons 3 min.\nVerse le bouillon et laisse cuire 10 min à feu doux. Ajoute la crème, sale, poivre et laisse épaissir 5 min : la sauce doit napper la cuillère.\nPendant ce temps, fais cuire les frites et réchauffe les bouchées 5 min au four (ou à l'air fryer) à 180 °C.\nRemplis les bouchées de garniture bien chaude et sers avec les frites."],
  ['Waterzooi de poulet', 'plat', 45, 'plaques', 'poulet:150g carottes:80g poireaux:80g pdt:200g creme:40ml ~bouillon ~epices', "Épluche les pommes de terre et les carottes. Coupe les carottes et les poireaux en fines lanières, les pommes de terre en morceaux.\nPrépare le bouillon : 1 cube dans environ 300 ml d'eau chaude par personne.\nDans une grande casserole, mets le poulet en morceaux, les légumes et le bouillon. Porte à ébullition puis laisse cuire 25 min à feu doux à couvert.\nVérifie que le poulet est blanc au centre et que les pommes de terre sont tendres.\nAjoute la crème, sale, poivre et laisse chauffer 2 min sans faire bouillir.\nSers dans des assiettes creuses, avec beaucoup de bouillon crémeux."],
  ['Moules frites', 'plat', 30, 'plaques airfryer|four', 'moules:500g oignons:40g frites:200g ~epices ~huile', "Rince les moules à l'eau froide. Jette celles qui sont cassées ou qui restent ouvertes quand tu tapes dessus.\nMets les frites à cuire (air fryer 200 °C 15 à 20 min, ou four selon le paquet).\nÉmince l'oignon et fais-le revenir 2 min dans un peu de beurre ou d'huile dans une grande casserole.\nAjoute les moules, poivre (le sel n'est pas nécessaire), couvre et fais cuire à feu vif 5 à 7 min en secouant la casserole 2 ou 3 fois.\nLes moules sont cuites quand elles sont toutes ouvertes. Jette celles qui restent fermées.\nSers les moules avec leur jus et les frites, avec de la mayonnaise."],
  ['Fajitas au poulet', 'plat', 25, 'plaques', 'tortillas:2pc poulet:120g poivrons:100g oignons:40g creme:30ml ~huile ~epices', "Coupe le poulet, le poivron et l'oignon en fines lanières.\nFais chauffer un filet d'huile à feu vif et fais dorer le poulet 5 min, avec 1 cuillère à café de paprika, un peu de cumin, du sel et du poivre.\nAjoute le poivron et l'oignon et fais sauter 5 min : ils doivent rester un peu croquants. Vérifie que le poulet est blanc au centre.\nRéchauffe les tortillas 20 s au micro-ondes (ou 30 s par face dans une poêle sèche).\nGarnis chaque tortilla de poulet et de légumes, ajoute une cuillère de crème et roule-la."],
  ['Tacos au bœuf', 'plat', 25, 'plaques', 'tortillas:2pc boeuf:110g tomates:80g salade:0.15pc cheddar:30g ~epices', "Fais dorer le haché dans une poêle à feu moyen-vif 6 à 8 min en l'émiettant, avec 1 cuillère à café de cumin, du paprika, du sel et du poivre. Ajoute 2 cuillères à soupe d'eau pour qu'il reste moelleux.\nCoupe les tomates en dés, émince la salade, râpe le fromage.\nRéchauffe les tortillas 20 s au micro-ondes ou 30 s par face dans une poêle sèche.\nGarnis chaque tortilla de viande chaude, puis de fromage (il fond un peu), de tomates et de salade. Plie et mange."],
  ['Burger maison et frites', 'plat', 25, 'plaques airfryer|four', 'pain-burger:1pc steak-burger:1pc cheddar:20g tomates:50g salade:0.1pc frites:180g ~epices', "Mets les frites à cuire (air fryer 200 °C 15 à 20 min, ou four selon le paquet).\nCoupe la tomate en rondelles et lave la salade.\nFais chauffer une poêle à feu vif. Cuis le steak haché 3 à 4 min par face, sale et poivre. Pose le fromage dessus la dernière minute et couvre pour qu'il fonde.\nCoupe le pain en deux et fais-le toaster 1 min dans la poêle, côté mie.\nMonte le burger : pain, sauce (ketchup, mayo…), salade, steak au fromage, tomate, pain. Sers avec les frites."],
  ['Quiche lorraine', 'plat', 55, 'four', 'pate-brisee:0.25pc lardons:50g oeufs:1pc creme:50ml emmental:25g salade:0.2pc ~epices', "Préchauffe le four à 190 °C.\nDéroule la pâte dans un moule en gardant le papier dessous. Pique le fond avec une fourchette.\nFais dorer les lardons à sec dans une poêle 5 min, puis égoutte-les sur du papier.\nDans un saladier, bats les œufs avec la crème, du poivre et une pincée de muscade (peu de sel, les lardons sont salés). Ajoute le fromage râpé.\nRépartis les lardons sur la pâte et verse le mélange par-dessus.\nEnfourne 30 à 35 min : la quiche doit être dorée et ne plus trembler au centre. Sers tiède avec la salade."],
  ['Quiche saumon et poireaux', 'plat', 55, 'four plaques', 'pate-brisee:0.25pc poireaux:100g saumon:60g oeufs:1pc creme:50ml ~epices ~huile', "Préchauffe le four à 190 °C. Déroule la pâte dans un moule et pique le fond avec une fourchette.\nCoupe le poireau en fines rondelles et lave-le bien (il peut y avoir de la terre entre les feuilles).\nFais-le fondre dans un peu de beurre ou d'huile à feu doux, 10 min, en remuant. Sale et poivre.\nCoupe le saumon en petits morceaux.\nBats les œufs avec la crème, sale et poivre.\nRépartis le poireau et le saumon sur la pâte et verse le mélange. Enfourne 30 à 35 min : la quiche doit être dorée et prise au centre."],
  ['Croque-monsieur et salade', 'plat', 15, 'four|airfryer|plaques', 'pain-mie:4pc jambon:40g gouda:40g beurre:10g salade:0.2pc', "Beurre une face de chaque tranche de pain.\nSur la face non beurrée d'une tranche, pose une tranche de fromage, le jambon, puis une autre tranche de fromage. Ferme avec une tranche de pain, face beurrée vers l'extérieur.\nCuisson : 10 min au four à 200 °C, ou 6 min à l'air fryer à 180 °C, ou 3 min par face dans une poêle à feu moyen. Le pain doit être doré et le fromage fondu.\nPendant ce temps, lave la salade et assaisonne-la d'une vinaigrette. Sers avec les croque-monsieur."],
  ['Pizza maison', 'plat', 35, 'four', 'pate-pizza:0.5pc tomates-conc:80g mozzarella:80g jambon:40g champignons:50g ~epices', "Préchauffe le four à 220 °C.\nDéroule la pâte sur une plaque avec son papier.\nÉtale la sauce tomate en laissant 1 cm de bord. Sale, poivre et ajoute de l'origan si tu en as.\nAjoute le jambon en morceaux, les champignons en lamelles, puis la mozzarella en morceaux.\nEnfourne 12 à 15 min : les bords doivent être dorés et le fromage fondu et bouillonnant."],
  ['Tarte fine tomate mozzarella', 'plat', 35, 'four|airfryer', 'pate-feuil:0.25pc tomates:150g mozzarella:60g pesto:15g ~huile ~epices', "Préchauffe le four à 200 °C (ou l'air fryer à 180 °C).\nDéroule la pâte feuilletée sur la plaque avec son papier et pique-la avec une fourchette.\nÉtale le pesto en laissant 1 cm de bord.\nCoupe les tomates et la mozzarella en rondelles et dispose-les en alternance. Sale, poivre, un filet d'huile.\nEnfourne 20 à 25 min : la pâte doit être bien dorée et gonflée sur les bords."],
  ['Gratin dauphinois au jambon', 'plat', 70, 'four', 'pdt:300g creme:80ml lait:80ml ail:3g jambon:50g emmental:30g ~epices', "Préchauffe le four à 180 °C. Frotte le plat avec l'ail coupé en deux.\nÉpluche les pommes de terre et coupe-les en rondelles très fines (2 à 3 mm). Ne les rince pas : leur amidon épaissit la sauce.\nDans une casserole, fais chauffer le lait et la crème avec du sel, du poivre et une pincée de muscade. Ajoute les pommes de terre et laisse cuire 10 min à feu doux en remuant doucement.\nVerse la moitié dans le plat, ajoute le jambon en morceaux, puis le reste. Parsème de fromage râpé.\nEnfourne 45 min à 1 h : le dessus est doré et un couteau entre sans résistance dans les pommes de terre."],
  ['Gratin de courgettes', 'plat', 45, 'four|airfryer plaques', 'courgettes:250g oeufs:1pc creme:40ml emmental:40g ~epices ~huile', "Préchauffe le four à 200 °C (ou l'air fryer à 180 °C).\nCoupe les courgettes en rondelles et fais-les revenir 8 min à la poêle avec un filet d'huile pour qu'elles rendent leur eau. Sale et poivre.\nDans un bol, bats l'œuf avec la crème et la moitié du fromage.\nMets les courgettes dans un plat, verse le mélange et parsème du reste du fromage.\nEnfourne 20 à 25 min, jusqu'à ce que ce soit pris et doré."],
  ['Poulet tikka et riz', 'plat', 35, 'airfryer|four plaques', 'poulet:150g yaourts:1pc riz:70g oignons:50g ail:5g tomates-conc:100g creme:40ml ~huile ~epices', "Coupe le poulet en morceaux de la taille d'une bouchée.\nMarinade : dans un bol, mélange le yaourt avec 1 cuillère à café de curry, 1 cuillère à café de paprika, du sel et du poivre. Ajoute le poulet, remue pour bien l'enrober et laisse au moins 15 min (1 h au frigo, c'est encore meilleur).\nPendant ce temps, rince le riz dans une passoire et fais-le cuire 10 à 12 min dans une grande casserole d'eau bouillante salée. Égoutte.\nPréchauffe l'air fryer à 200 °C (ou le four à 200 °C). Étale le poulet en une seule couche (sans trop de marinade) : 15 min à l'air fryer en secouant à mi-cuisson, ou 20 min au four.\nSauce : hache l'oignon et l'ail. Fais revenir l'oignon dans un filet d'huile à feu moyen 3 min, puis l'ail et 1 cuillère à café de curry 1 min.\nAjoute la sauce tomate, sale et laisse mijoter 5 min à feu doux. Verse la crème, remue et laisse épaissir 2 min.\nVérifie le poulet : coupe le plus gros morceau, il doit être blanc au centre, sans rose. Mets-le dans la sauce et mélange.\nSers le poulet et sa sauce sur le riz."],
  ['Saumon au four et légumes', 'plat', 30, 'four|airfryer', 'saumon:125g courgettes:120g poivrons:80g citrons:0.25pc ~huile ~epices', "Préchauffe le four à 200 °C (ou l'air fryer à 180 °C).\nCoupe la courgette et le poivron en morceaux. Mets-les dans un plat avec un filet d'huile, du sel et du poivre, et enfourne 10 min.\nPose le saumon sur les légumes, sale, poivre, ajoute une rondelle de citron et un filet d'huile.\nEnfourne encore 12 à 15 min : le saumon est cuit quand il se défait en lamelles et n'est plus translucide au centre.\nArrose du jus de citron restant avant de servir."],
  ['Cabillaud pané et purée', 'plat', 30, 'plaques|airfryer', 'cabillaud:150g chapelure:20g oeufs:0.5pc pdt:250g lait:50ml beurre:10g ~epices ~huile', "Purée : épluche les pommes de terre, coupe-les en morceaux et fais-les cuire 20 min dans de l'eau salée.\nSèche le poisson avec du papier, sale et poivre. Passe-le dans l'œuf battu puis dans la chapelure en appuyant.\nFais-le dorer dans un filet d'huile à feu moyen, 3 à 4 min par face (ou 10 à 12 min à l'air fryer à 200 °C). Il est cuit quand il se défait en lamelles blanches.\nÉgoutte les pommes de terre et écrase-les avec le beurre et le lait chaud. Sale.\nSers le poisson avec la purée et un quartier de citron ou de la sauce tartare."],
  ['Poisson en papillote au micro-ondes', 'plat', 15, 'micro', 'cabillaud:150g courgettes:100g tomates:80g citrons:0.25pc riz:70g ~epices ~huile', "Fais cuire le riz 10 à 12 min dans de l'eau bouillante salée et égoutte.\nCoupe la courgette en fines rondelles et la tomate en dés.\nDans un plat qui va au micro-ondes, mets les légumes, puis le poisson par-dessus. Sale, poivre, ajoute le jus du citron et un filet d'huile.\nCouvre avec un couvercle pour micro-ondes (ou une assiette) et cuis 4 à 6 min à puissance maximale.\nVérifie : le poisson doit être blanc et se défaire en lamelles. Sinon, remets 1 min.\nSers le poisson et les légumes sur le riz, en versant le jus de cuisson dessus : c'est ta sauce."],
  ['Wok de bœuf aux légumes', 'plat', 20, 'plaques', 'steak:120g legumes-surg:150g nouilles:80g soja:15ml gingembre:5g ~huile', "Fais cuire les nouilles comme indiqué sur le paquet (souvent 3 à 4 min dans l'eau bouillante), égoutte.\nCoupe le steak en fines lanières. Râpe le gingembre.\nFais chauffer un filet d'huile dans un wok ou une grande poêle à feu très vif. Saisis le bœuf 2 min seulement, puis retire-le.\nFais sauter les légumes surgelés et le gingembre 4 à 5 min.\nAjoute les nouilles, le bœuf, la sauce soja et 2 cuillères à soupe d'eau. Mélange 1 à 2 min sur le feu vif et sers."],
  ['Nouilles sautées au poulet', 'plat', 20, 'plaques', 'nouilles:90g poulet:110g legumes-surg:120g soja:15ml ~huile', "Fais cuire les nouilles comme indiqué sur le paquet, égoutte.\nCoupe le poulet en fines lanières.\nDans un wok ou une grande poêle à feu vif, fais dorer le poulet dans un filet d'huile 5 min, jusqu'à ce qu'il soit blanc au centre.\nAjoute les légumes surgelés et fais sauter 4 à 5 min.\nAjoute les nouilles, la sauce soja et 2 cuillères à soupe d'eau. Mélange 2 min et sers."],
  ['Ramen express', 'plat', 10, 'bouilloire|plaques', 'nouilles:90g oeufs:1pc epinards:50g champignons:50g soja:15ml ~bouillon', "Fais bouillir de l'eau. Fais cuire l'œuf 6 à 7 min dans l'eau bouillante (jaune coulant), puis passe-le sous l'eau froide et écale-le.\nPrépare le bouillon : 1 cube dans 400 ml d'eau bouillante par personne, avec la sauce soja.\nAjoute les champignons en lamelles et laisse cuire 3 min.\nAjoute les nouilles et fais-les cuire le temps du paquet (2 à 4 min). Ajoute les épinards la dernière minute.\nVerse dans un grand bol et pose l'œuf coupé en deux sur le dessus."],
  ['Gyros de poulet maison', 'plat', 30, 'plaques', 'poulet:130g pain-pita:1pc tomates:60g oignons:30g yaourts:0.5pc salade:0.1pc ~huile ~epices', "Coupe le poulet en fines lanières. Mélange-les avec un filet d'huile, du paprika, de l'origan, du cumin, du sel et du poivre.\nFais-les dorer dans une poêle bien chaude à feu vif, 6 à 8 min, jusqu'à ce qu'ils soient grillés et blancs au centre.\nSauce : mélange le yaourt avec un peu d'ail râpé, du sel et du poivre (façon tzatziki).\nCoupe la tomate en dés, l'oignon en fines rondelles, émince la salade.\nRéchauffe le pain pita 1 min à la poêle, ouvre-le et garnis-le de poulet, de crudités et de sauce."],
  ['Pain de viande et purée', 'plat', 70, 'four plaques', 'hache:150g oeufs:0.5pc chapelure:20g pdt:250g tomates-conc:80g ~epices', "Préchauffe le four à 180 °C.\nMélange la viande hachée avec l'œuf, la chapelure, du sel, du poivre et des herbes si tu en as.\nForme un pain allongé dans un plat ou un moule à cake et nappe-le avec la moitié de la sauce tomate.\nEnfourne 45 min. Il est cuit quand le jus qui sort est clair quand tu piques le centre.\nPendant ce temps, épluche les pommes de terre, fais-les cuire 20 min dans de l'eau salée, puis écrase-les en purée avec un peu de beurre et de lait.\nRéchauffe le reste de sauce tomate et sers le pain de viande en tranches avec la purée et la sauce."],
  ['Poêlée pommes de terre et lardons', 'plat', 30, 'plaques', 'pdt:300g lardons:60g oignons:40g creme:40ml ~huile ~epices', "Épluche les pommes de terre et coupe-les en petits dés (1 à 2 cm). Émince l'oignon.\nFais chauffer un filet d'huile dans une grande poêle à feu moyen. Mets les pommes de terre, couvre et laisse cuire 10 min en remuant de temps en temps.\nRetire le couvercle, ajoute les lardons et l'oignon et laisse dorer 10 min à feu moyen-vif en remuant : les pommes de terre doivent être dorées et tendres.\nAjoute la crème, poivre et mélange 1 min avant de servir."],
  ['Tartiflette', 'plat', 50, 'four plaques', 'pdt:300g lardons:60g oignons:40g reblochon:0.25pc creme:30ml', "Préchauffe le four à 200 °C.\nÉpluche les pommes de terre, coupe-les en morceaux et fais-les cuire 15 min dans de l'eau salée : elles doivent rester un peu fermes. Égoutte.\nPendant ce temps, fais dorer les lardons et l'oignon émincé à la poêle 5 min.\nDans un plat, mélange les pommes de terre, les lardons, l'oignon et la crème. Poivre.\nCoupe le reblochon en deux dans l'épaisseur et pose-le sur le dessus, croûte vers le haut.\nEnfourne 20 à 25 min, jusqu'à ce que le fromage soit fondu et doré."],
  // Végétarien
  ['Omelette aux champignons', 'plat', 15, 'plaques', 'oeufs:3pc champignons:80g emmental:20g salade:0.25pc ~huile ~epices', "Coupe les champignons en lamelles et fais-les dorer 5 min dans un filet d'huile à feu moyen. Sale et mets-les de côté.\nBats les œufs dans un bol avec du sel et du poivre.\nFais chauffer un filet d'huile (ou un peu de beurre) dans la poêle à feu moyen. Verse les œufs.\nRamène doucement les bords vers le centre avec une spatule pendant 1 à 2 min, puis laisse prendre sans toucher.\nQuand le dessus est presque pris mais encore un peu baveux, ajoute les champignons et le fromage sur une moitié, replie l'omelette et glisse-la dans l'assiette.\nSers avec la salade assaisonnée."],
  ['Shakshuka', 'plat', 25, 'plaques', 'oeufs:2pc tomates-conc:200g poivrons:100g oignons:40g pain:60g ~huile ~epices', "Coupe le poivron en lanières et hache l'oignon.\nFais-les revenir dans un filet d'huile à feu moyen dans une poêle, 8 min, jusqu'à ce qu'ils soient tendres.\nAjoute 1 cuillère à café de cumin et de paprika (un peu de piment si tu aimes), remue 1 min.\nVerse la sauce tomate, sale, poivre et laisse mijoter 5 min.\nCreuse des petits trous dans la sauce avec une cuillère et casse un œuf dans chacun.\nCouvre et laisse cuire 5 à 7 min à feu doux : le blanc doit être pris et le jaune encore coulant. Sers avec le pain pour saucer."],
  ['Tortilla espagnole', 'plat', 40, 'plaques', 'oeufs:2pc pdt:200g oignons:50g salade:0.2pc ~huile ~epices', "Épluche les pommes de terre et coupe-les en fines rondelles. Émince l'oignon.\nFais-les cuire à feu doux dans 3 à 4 cuillères à soupe d'huile, à couvert, 15 à 20 min, en remuant de temps en temps : elles doivent être tendres, pas grillées.\nBats les œufs avec du sel dans un saladier. Ajoute les pommes de terre et l'oignon égouttés, mélange et laisse reposer 5 min.\nRemets un filet d'huile dans la poêle à feu moyen et verse le mélange. Laisse cuire 5 min.\nPose une grande assiette sur la poêle, retourne la tortilla dessus, puis fais-la glisser dans la poêle pour cuire l'autre face 3 à 4 min.\nSers chaude ou tiède avec la salade."],
  ['Frittata aux légumes', 'plat', 25, 'plaques|four', 'oeufs:2pc courgettes:100g poivrons:60g feta:30g ~huile ~epices', "Coupe la courgette en dés et le poivron en lanières.\nFais-les revenir dans un filet d'huile à feu moyen 8 min, dans une poêle qui peut aller au four si tu en as une. Sale et poivre.\nBats les œufs avec un peu de sel et de poivre et verse-les sur les légumes. Émiette la feta par-dessus.\nLaisse cuire à feu doux à couvert 8 à 10 min, jusqu'à ce que le dessus soit pris (ou finis 5 min au four à 200 °C).\nFais glisser sur une assiette et coupe en parts."],
  ['Pommes de terre farcies', 'plat', 35, 'airfryer|four|micro', 'pdt:300g jambon:40g emmental:30g creme:30ml ~epices', "Lave les pommes de terre et pique-les plusieurs fois avec une fourchette.\nCuisson : 8 à 10 min au micro-ondes à puissance maximale en les retournant à mi-cuisson, ou 45 min au four / 35 min à l'air fryer à 200 °C. Elles sont cuites quand un couteau entre facilement.\nCoupe-les en deux et creuse la chair avec une cuillère en laissant 5 mm autour.\nÉcrase la chair avec la crème, le jambon en petits morceaux, la moitié du fromage, du sel et du poivre.\nRemplis les pommes de terre de ce mélange et parsème du reste du fromage.\nPasse 10 min au four ou 5 min à l'air fryer à 200 °C (ou 1 à 2 min au micro-ondes) pour faire fondre le fromage."],
  ['Patate douce rôtie et pois chiches', 'plat', 35, 'four|airfryer', 'patate-douce:250g pois-chiches:120g feta:40g epinards:40g ~huile ~epices', "Préchauffe le four à 200 °C (ou l'air fryer à 190 °C).\nÉpluche la patate douce et coupe-la en cubes de 2 cm. Égoutte et rince les pois chiches.\nMélange-les dans un plat avec un filet d'huile, du sel, du paprika et du cumin.\nEnfourne 25 à 30 min (20 min à l'air fryer) en remuant à mi-cuisson : la patate douce doit être tendre et un peu dorée.\nAjoute les épinards crus, ils tombent avec la chaleur, et émiette la feta par-dessus."],
  ['Wraps aux falafels', 'plat', 15, 'airfryer|four|plaques', 'falafel:120g tortillas:2pc salade:0.15pc tomates:80g houmous:40g', "Réchauffe les falafels : 8 min à l'air fryer à 180 °C, 12 min au four, ou 5 min à la poêle en les retournant.\nCoupe les tomates en dés et émince la salade.\nRéchauffe les tortillas 20 s au micro-ondes.\nÉtale une bonne cuillère de houmous sur chaque tortilla, ajoute les falafels écrasés, la salade et les tomates.\nRoule en serrant bien et coupe en deux."],
  ['Ratatouille et riz', 'plat', 50, 'plaques', 'courgettes:150g aubergine:0.5pc poivrons:100g tomates:150g oignons:50g riz:60g ~huile ~epices', "Coupe la courgette, l'aubergine, le poivron et les tomates en dés. Hache l'oignon.\nDans une cocotte, fais revenir l'oignon dans un filet d'huile 3 min, puis ajoute l'aubergine et le poivron 5 min.\nAjoute la courgette, les tomates, du sel, du poivre et des herbes (thym ou herbes de Provence).\nCouvre et laisse mijoter 30 min à feu doux en remuant de temps en temps : les légumes doivent être fondants et former une sauce.\nPendant ce temps, fais cuire le riz 10 à 12 min dans de l'eau bouillante salée et égoutte.\nSers la ratatouille sur le riz."],
  ['Gratin de chou-fleur', 'plat', 45, 'four|airfryer plaques', 'chou-fleur:0.4pc lait:120ml beurre:12g farine:12g emmental:40g ~epices', "Préchauffe le four à 200 °C (ou l'air fryer à 180 °C).\nCoupe le chou-fleur en bouquets et fais-les cuire 8 à 10 min dans de l'eau bouillante salée : ils doivent être tendres mais pas en purée. Égoutte bien.\nBéchamel : fais fondre le beurre, ajoute la farine et remue 1 min, puis verse le lait petit à petit en fouettant jusqu'à ce que ça épaississe. Ajoute la moitié du fromage, sale, poivre et une pincée de muscade.\nMets le chou-fleur dans un plat, nappe de béchamel et parsème du reste du fromage.\nEnfourne 20 min, jusqu'à ce que ce soit doré."],
  ['Couscous aux légumes', 'plat', 40, 'plaques bouilloire|plaques', 'semoule:80g pois-chiches:100g carottes:100g courgettes:120g oignons:40g ~huile ~epices', "Coupe les carottes en rondelles, les courgettes en gros dés, hache l'oignon. Égoutte les pois chiches.\nDans une casserole, fais revenir l'oignon dans un filet d'huile 3 min, ajoute 1 cuillère à café d'épices à couscous (ou cumin et paprika).\nAjoute les carottes et de l'eau à hauteur. Sale et laisse cuire 10 min.\nAjoute les courgettes et les pois chiches et laisse cuire encore 10 min : le bouillon sert de sauce.\nSemoule : mets-la dans un saladier, sale, ajoute un filet d'huile et verse le même volume d'eau bouillante. Couvre 5 min puis égrène à la fourchette.\nSers la semoule avec les légumes et beaucoup de bouillon."],
  ['Soupe de légumes et pain', 'plat', 40, 'plaques mixeur', 'carottes:120g pdt:100g poireaux:80g oignons:40g pain:60g ~bouillon ~epices', "Épluche et coupe en morceaux les carottes, les pommes de terre, le poireau (bien lavé) et l'oignon.\nMets-les dans une casserole avec le bouillon (1 cube pour environ 1 litre d'eau) : l'eau doit juste couvrir les légumes.\nPorte à ébullition puis laisse cuire 25 min à feu doux, jusqu'à ce que les légumes soient bien tendres.\nMixe la soupe. Ajoute un peu d'eau si elle est trop épaisse, sale et poivre.\nSers bien chaude avec le pain."],
  ['Soupe à la tomate', 'plat', 30, 'plaques mixeur', 'tomates:250g oignons:40g creme:20ml pain:60g ~bouillon ~epices ~huile', "Coupe les tomates en morceaux et hache l'oignon.\nFais revenir l'oignon dans un filet d'huile 3 min dans une casserole.\nAjoute les tomates et le bouillon (½ cube dans 250 ml d'eau par personne). Laisse cuire 20 min à feu doux.\nMixe, ajoute la crème, sale, poivre (et un peu de basilic si tu en as).\nSers avec le pain."],
  ['Velouté de potiron', 'plat', 35, 'plaques mixeur', 'courge:250g pdt:80g oignons:30g creme:20ml pain:50g ~bouillon ~epices', "Épluche le potiron (ou garde la peau si c'est un potimarron) et retire les graines. Coupe-le en morceaux, comme la pomme de terre et l'oignon.\nMets-les dans une casserole avec le bouillon (½ cube dans 250 ml d'eau par personne), juste à hauteur.\nLaisse cuire 20 à 25 min jusqu'à ce que tout soit bien tendre.\nMixe avec la crème, sale, poivre (une pincée de muscade si tu en as).\nSers avec le pain."],
  ['Soupe de lentilles corail', 'plat', 30, 'plaques', 'lentilles:60g carottes:100g lait-coco:60ml oignons:40g ~bouillon ~epices ~huile', "Rince les lentilles. Coupe les carottes en petits morceaux et hache l'oignon.\nFais revenir l'oignon dans un filet d'huile 3 min, ajoute 1 cuillère à café de cumin ou de curry.\nAjoute les lentilles, les carottes et le bouillon (½ cube dans 300 ml d'eau par personne). Laisse cuire 20 min : les lentilles se défont.\nMixe avec le lait de coco, sale et poivre. Ajoute de l'eau si la soupe est trop épaisse."],
  ['Salade de lentilles et feta', 'plat', 25, 'plaques', 'lentilles:70g carottes:60g oignons:20g feta:40g ~huile ~vinaigre ~epices', "Rince les lentilles et fais-les cuire 20 à 25 min dans de l'eau non salée (le sel les durcit), jusqu'à ce qu'elles soient tendres mais entières. Égoutte et laisse tiédir.\nRâpe les carottes, hache finement l'oignon.\nVinaigrette : 1 cuillère de vinaigre, 3 d'huile, sel, poivre (un peu de moutarde si tu en as).\nMélange les lentilles, les carottes, l'oignon et la vinaigrette.\nÉmiette la feta par-dessus."],
  ['Pizza surgelée et salade', 'plat', 20, 'four|airfryer', 'pizza:0.5pc salade:0.2pc tomates:60g ~huile ~vinaigre ~epices', "Préchauffe le four (ou l'air fryer) à la température indiquée sur la boîte.\nEnfourne la pizza directement sur la grille pour qu'elle soit croustillante, le temps indiqué (souvent 12 à 15 min).\nPendant ce temps, lave la salade, coupe les tomates et assaisonne d'une vinaigrette (vinaigre, huile, sel, poivre).\nSers la pizza avec la salade."],
  // Midi, salades, sandwichs
  ['Salade niçoise', 'midi', 20, 'plaques|bouilloire', 'thon:80g oeufs:1pc tomates:100g salade:0.25pc pdt:120g olives:20g haricots-verts:80g ~huile ~vinaigre ~epices', "Lave les pommes de terre et fais-les cuire 20 min dans de l'eau salée. Ajoute les haricots verts les 8 dernières minutes.\nFais cuire l'œuf 9 min dans l'eau bouillante, passe-le sous l'eau froide et écale-le.\nÉgoutte tout et laisse refroidir.\nCoupe les pommes de terre et les tomates en morceaux, l'œuf en quartiers. Égoutte le thon.\nDispose sur la salade : pommes de terre, haricots, tomates, thon, œuf et olives.\nArrose d'une vinaigrette (vinaigre, huile, sel, poivre)."],
  ['Salade César au poulet', 'midi', 20, 'plaques|airfryer', 'poulet:110g salade:0.4pc parmesan:15g pain:40g mayonnaise:20ml ~huile ~epices', "Coupe le poulet en lanières, sale, poivre et fais-le dorer 6 à 8 min à la poêle avec un filet d'huile (ou 12 min à l'air fryer à 200 °C), jusqu'à ce qu'il soit blanc au centre.\nCroûtons : coupe le pain en cubes et fais-les dorer 3 min à la poêle ou à l'air fryer.\nSauce : mélange la mayonnaise avec un peu de parmesan râpé, quelques gouttes de citron et 1 cuillère d'eau.\nLave et coupe la salade, mélange-la avec la sauce.\nAjoute le poulet, les croûtons et des copeaux de parmesan."],
  ['Salade de pâtes', 'midi', 20, 'plaques', 'pates:80g tomates:80g mozzarella:50g pesto:20g', "Fais cuire les pâtes dans de l'eau bouillante salée, le temps du paquet. Égoutte et passe-les sous l'eau froide pour les refroidir.\nCoupe les tomates et la mozzarella en dés.\nMélange les pâtes avec le pesto, puis ajoute tomates et mozzarella. Poivre.\nGarde au frais jusqu'au moment de manger."],
  ['Taboulé', 'midi', 15, 'bouilloire|plaques', 'semoule:70g tomates:100g concombre:0.3pc citrons:0.3pc persil:0.2pc ~huile ~epices', "Mets la semoule dans un saladier, sale et verse le même volume d'eau bouillante. Couvre 5 min puis égrène à la fourchette. Laisse refroidir.\nCoupe les tomates et le concombre en petits dés. Hache finement le persil (beaucoup !).\nAjoute-les à la semoule avec le jus du citron, 2 cuillères à soupe d'huile, du sel, du poivre (et de la menthe si tu en as).\nMélange et laisse au frais au moins 30 min pour que la semoule boive le jus."],
  ['Salade grecque', 'midi', 10, '', 'tomates:150g concombre:0.4pc feta:60g olives:25g oignons:20g pain:60g ~huile ~epices', "Coupe les tomates et le concombre en gros morceaux, l'oignon en fines rondelles.\nMets-les dans un saladier avec les olives.\nPose la feta en dés ou en tranche sur le dessus.\nArrose d'huile d'olive, ajoute de l'origan, un peu de sel et du poivre. Sers avec le pain."],
  ['Wrap poulet crudités', 'midi', 15, 'plaques|airfryer', 'tortillas:2pc poulet:100g salade:0.15pc tomates:60g mayonnaise:20ml ~epices ~huile', "Coupe le poulet en lanières, sale, poivre et ajoute un peu de paprika. Fais-le dorer 6 à 8 min à la poêle avec un filet d'huile (ou 12 min à l'air fryer à 200 °C), jusqu'à ce qu'il soit blanc au centre.\nCoupe les tomates en dés et émince la salade.\nRéchauffe les tortillas 20 s au micro-ondes.\nTartine de mayonnaise, ajoute la salade, les tomates et le poulet, puis roule en serrant bien."],
  ['Sandwich jambon fromage', 'midi', 5, '', 'baguette:0.5pc jambon:50g gouda:30g beurre:10g salade:0.1pc', "Coupe la baguette en deux dans la longueur.\nBeurre l'intérieur.\nAjoute le jambon, le fromage en tranches et quelques feuilles de salade.\nReferme et serre bien."],
  ['Sandwich thon mayo', 'midi', 5, '', 'pain:100g thon:60g mayonnaise:20ml tomates:50g ~epices', "Égoutte le thon et émiette-le dans un bol.\nMélange-le avec la mayonnaise, du poivre (et un peu de citron si tu en as).\nCoupe la tomate en rondelles.\nGarnis le pain du thon mayo et des tomates."],
  ['Club sandwich au poulet', 'midi', 15, 'plaques', 'pain-mie:3pc poulet:80g tomates:50g salade:0.1pc mayonnaise:15ml ~huile', "Fais dorer le poulet salé et poivré à la poêle 6 à 8 min avec un filet d'huile, jusqu'à ce qu'il soit blanc au centre. Coupe-le en tranches.\nFais griller les tranches de pain (grille-pain ou poêle).\nCoupe la tomate en rondelles et lave la salade.\nTartine les tranches de mayonnaise. Monte : pain, salade, poulet, pain, tomate, salade, pain.\nCoupe en deux triangles et pique avec un cure-dent pour tenir."],
  ['Pommes de terre au micro-ondes', 'midi', 15, 'micro|four', 'pdt:300g skyr:80g jambon:40g ~epices', "Lave les pommes de terre et pique-les plusieurs fois avec une fourchette.\nFais-les cuire 8 à 10 min au micro-ondes à puissance maximale, en les retournant à mi-cuisson (ou 45 min au four à 200 °C). Un couteau doit entrer facilement.\nPendant ce temps, mélange le skyr avec du sel, du poivre et des herbes (ciboulette si tu en as). Coupe le jambon en morceaux.\nOuvre les pommes de terre en croix, écrase un peu la chair et garnis-les de sauce au skyr et de jambon."],
  // Petit-déjeuner
  ['Pancakes', 'petitdej', 20, 'plaques', 'farine:60g lait:80ml oeufs:0.5pc sucre:10g beurre:5g', "Dans un saladier, mélange la farine, le sucre, une pincée de sel (et un peu de levure chimique si tu en as).\nAjoute l'œuf puis le lait petit à petit en fouettant pour éviter les grumeaux. Ajoute le beurre fondu.\nLaisse reposer la pâte 10 min si tu as le temps.\nFais chauffer une poêle à feu moyen, graisse-la légèrement. Verse une petite louche de pâte.\nRetourne le pancake quand des petites bulles apparaissent sur le dessus (1 à 2 min), puis cuis l'autre face 1 min.\nSers avec du sirop, du miel ou des fruits."],
  ['Porridge à la banane', 'petitdej', 5, 'micro|plaques', 'flocons:50g lait:150ml bananes:60g miel:10g', "Mets les flocons d'avoine et le lait dans un bol (ou une petite casserole).\nMicro-ondes : 2 min à puissance maximale, remue, puis 1 min. Casserole : 4 à 5 min à feu doux en remuant.\nLe porridge est prêt quand il est épais et crémeux.\nCoupe la banane en rondelles et pose-la dessus avec le miel."],
  ['Overnight oats', 'petitdej', 5, '', 'flocons:50g skyr:100g bananes:60g lait:50ml', "La veille, dans un bocal ou un bol, mélange les flocons d'avoine, le skyr et le lait.\nAjoute la moitié de la banane écrasée et mélange.\nFerme et laisse au frigo toute la nuit (au moins 4 h) : les flocons ramollissent.\nLe matin, ajoute le reste de la banane en rondelles et mange froid."],
  ['Pain perdu', 'petitdej', 15, 'plaques', 'pain:80g oeufs:1pc lait:80ml sucre:10g beurre:10g', "Dans une assiette creuse, bats l'œuf avec le lait et le sucre.\nTrempe les tranches de pain des deux côtés : elles doivent être bien imbibées mais pas en miettes (le pain rassis est parfait).\nFais fondre le beurre dans une poêle à feu moyen.\nFais dorer les tranches 2 à 3 min de chaque côté.\nSaupoudre d'un peu de sucre (ou de cannelle) et sers chaud."],
  ['Œufs brouillés et tartines', 'petitdej', 10, 'plaques', 'oeufs:2pc pain:80g beurre:10g ~epices', "Bats les œufs avec du sel et du poivre.\nFais fondre la moitié du beurre dans une poêle à feu doux.\nVerse les œufs et remue doucement et sans arrêt avec une spatule pendant 2 à 3 min.\nRetire du feu quand ils sont encore un peu crémeux : ils finissent de cuire dans la poêle.\nFais griller le pain, beurre-le et sers avec les œufs."],
  ['Smoothie banane', 'petitdej', 5, 'mixeur', 'bananes:120g lait:200ml yaourts:0.5pc', "Épluche la banane et coupe-la en morceaux.\nMets la banane, le lait et le yaourt dans le mixeur.\nMixe 30 s à 1 min jusqu'à ce que ce soit bien lisse.\nBois tout de suite (ajoute des glaçons ou du miel si tu veux)."],
  // Desserts
  ['Crêpes', 'dessert', 30, 'plaques', 'farine:50g lait:100ml oeufs:0.5pc sucre:8g beurre:5g ~huile', "Dans un saladier, mets la farine, le sucre et une pincée de sel. Fais un creux au milieu.\nCasse l'œuf dans le creux et commence à mélanger en ajoutant le lait petit à petit, en fouettant pour éviter les grumeaux.\nAjoute le beurre fondu. Laisse reposer 30 min si tu as le temps.\nFais chauffer une poêle à feu moyen-vif, graisse-la légèrement avec un papier imbibé de beurre ou d'huile.\nVerse une petite louche de pâte et fais tourner la poêle pour couvrir tout le fond.\nRetourne la crêpe quand les bords se décollent (1 min), cuis l'autre face 30 s. Recommence avec le reste de la pâte."],
  ['Mousse au chocolat', 'dessert', 20, 'micro|plaques', 'chocolat:50g oeufs:1.5pc sucre:5g', "Fais fondre le chocolat : 1 min au micro-ondes, remue, puis 20 s si besoin (ou au bain-marie). Laisse tiédir.\nSépare les blancs des jaunes d'œufs.\nMélange les jaunes au chocolat fondu.\nBats les blancs en neige très ferme avec une pincée de sel ; ajoute le sucre à la fin.\nIncorpore les blancs au chocolat en trois fois, délicatement avec une spatule, en soulevant la masse pour ne pas les casser.\nMets au frigo au moins 3 heures avant de manger."],
  ['Crumble aux pommes', 'dessert', 45, 'four|airfryer', 'pommes:150g farine:30g beurre:20g sucre:25g', "Préchauffe le four à 180 °C (ou l'air fryer à 170 °C).\nÉpluche les pommes, coupe-les en morceaux et mets-les dans un plat avec un peu de sucre (et de cannelle si tu aimes).\nPâte à crumble : mélange du bout des doigts la farine, le reste du sucre et le beurre froid en dés, jusqu'à obtenir des miettes.\nRépartis les miettes sur les pommes.\nEnfourne 30 à 35 min (25 min à l'air fryer), jusqu'à ce que le dessus soit doré. Sers tiède."],
  ['Gâteau au yaourt', 'dessert', 45, 'four', 'yaourts:0.5pc farine:60g sucre:40g oeufs:0.75pc ~huile', "Préchauffe le four à 180 °C. Beurre un moule.\nVerse le yaourt dans un saladier et garde le pot vide : il sert de mesure.\nAjoute les œufs, puis 2 pots de sucre et mélange.\nAjoute 3 pots de farine (avec un sachet de levure chimique si tu en as), puis ½ pot d'huile, et mélange jusqu'à ce que la pâte soit lisse.\nVerse dans le moule et enfourne 30 à 35 min. Il est cuit quand un couteau planté au centre ressort sec."],
  ['Mug cake au chocolat', 'dessert', 5, 'micro', 'chocolat:30g farine:25g sucre:15g oeufs:1pc beurre:15g', "Dans une grande tasse, fais fondre le chocolat et le beurre 40 s au micro-ondes. Remue.\nAjoute le sucre et l'œuf et mélange bien à la fourchette.\nAjoute la farine et mélange jusqu'à ce qu'il n'y ait plus de grumeaux.\nCuis 1 min à 1 min 30 au micro-ondes à puissance maximale : le dessus doit être pris mais encore un peu moelleux.\nLaisse tiédir 1 min (c'est très chaud) et mange dans la tasse."],
  ['Salade de fruits', 'dessert', 10, '', 'bananes:80g pommes:80g oranges:120g', "Épluche l'orange à vif (retire la peau blanche) et coupe-la en morceaux au-dessus d'un saladier pour garder le jus.\nÉpluche la pomme et la banane et coupe-les en morceaux.\nMélange tous les fruits avec le jus de l'orange : il empêche la pomme et la banane de noircir.\nGarde au frais jusqu'au moment de servir."],
  ['Riz au lait', 'dessert', 40, 'plaques', 'riz:40g lait:250ml sucre:20g', "Rince le riz (rond de préférence).\nPorte le lait à ébullition dans une casserole (avec une gousse de vanille ou un peu de sucre vanillé si tu en as).\nAjoute le riz, baisse à feu très doux et laisse cuire 30 à 35 min en remuant souvent pour que ça n'attache pas.\nLe riz est prêt quand il est tendre et que le mélange est crémeux. Ajoute le sucre à la fin.\nSers tiède ou froid (une pincée de cannelle dessus, c'est bon)."],
  ['Banana bread', 'dessert', 60, 'four', 'bananes:120g farine:50g sucre:25g oeufs:0.5pc beurre:20g', "Préchauffe le four à 180 °C. Beurre un moule à cake.\nÉcrase les bananes à la fourchette (bien mûres, c'est mieux).\nAjoute le beurre fondu, le sucre et l'œuf, et mélange.\nAjoute la farine (et un peu de levure chimique si tu en as) et mélange juste assez pour qu'il n'y ait plus de farine sèche.\nVerse dans le moule et enfourne 45 à 50 min : un couteau planté au centre doit ressortir sec.\nLaisse refroidir avant de couper."],
  ['Cookies au chocolat', 'dessert', 25, 'four|airfryer', 'farine:45g beurre:25g sucre:25g chocolat:25g oeufs:0.25pc', "Préchauffe le four à 180 °C (ou l'air fryer à 160 °C).\nMélange le beurre mou avec le sucre jusqu'à ce que ce soit crémeux, puis ajoute l'œuf.\nAjoute la farine (et une pincée de sel et de levure si tu en as), puis le chocolat en morceaux.\nForme des boules de la taille d'une noix et pose-les sur du papier cuisson, bien espacées (elles s'étalent).\nEnfourne 10 à 12 min : les bords sont dorés et le centre encore mou. Ils durcissent en refroidissant."],
];

// Ingrédients de placard des recettes importées (« ~sel:0.25cc ») : nom affiché.
export const PANTRY_LABELS = {
  'ail-en-poudre': "ail en poudre",
  'aneth': "aneth",
  'ase-fetide': "ase fétide",
  'assaisonnement': "assaisonnement",
  'basilic': "basilic",
  'beurre': "beurre",
  'bicarbonate': "bicarbonate",
  'bouillon': "bouillon",
  'cacao': "cacao",
  'cannelle': "cannelle",
  'cardamome': "cardamome",
  'cassonade': "cassonade",
  'cerises-confites': "cerises confites",
  'ciboulette': "ciboulette",
  'cinq-epices': "cinq-épices",
  'clous-de-girofle': "clous de girofle",
  'coriandre': "coriandre",
  'coriandre-fraiche': "coriandre fraîche",
  'creme': "crème",
  'creme-de-tartre': "crème de tartre",
  'cube-de-bouillon': "cube de bouillon",
  'cumin': "cumin",
  'curcuma': "curcuma",
  'curry': "curry",
  'dattes': "dattes",
  'eau': "eau",
  'ecrevisses-sechees': "écrevisses séchées",
  'edulcorant': "édulcorant",
  'epices-cajun': "épices cajun",
  'epinards': "épinards",
  'estragon': "estragon",
  'farine': "farine",
  'farine-levante': "farine levante",
  'fecule-de-mais': "fécule de maïs",
  'garam-masala': "garam masala",
  'ghee': "ghee",
  'gingembre': "gingembre",
  'glacons': "glaçons",
  'glutamate': "glutamate",
  'graines-de-celeri': "graines de céleri",
  'graines-de-fenouil': "graines de fenouil",
  'graines-de-moutarde': "graines de moutarde",
  'graines-de-pavot': "graines de pavot",
  'graines-de-sesame': "graines de sésame",
  'herbes': "herbes",
  'herbes-italiennes': "herbes italiennes",
  'huile': "huile",
  'huile-d-olive': "huile d'olive",
  'huile-de-sesame': "huile de sésame",
  'jus-de-citron': "jus de citron",
  'ketchup': "ketchup",
  'lait': "lait",
  'laurier': "laurier",
  'levure-chimique': "levure chimique",
  'levure-de-boulanger': "levure de boulanger",
  'macis': "macis",
  'marjolaine': "marjolaine",
  'melange-d-epices': "mélange d'épices",
  'menthe': "menthe",
  'miel': "miel",
  'moutarde': "moutarde",
  'muscade': "muscade",
  'oignon-en-poudre': "oignon en poudre",
  'origan': "origan",
  'paprika': "paprika",
  'paprika-fume': "paprika fumé",
  'pepites-de-chocolat': "pépites de chocolat",
  'persil': "persil",
  'petits-pains': "petits pains",
  'piment': "piment",
  'pistaches-ou-amandes': "pistaches ou amandes",
  'poivre': "poivre",
  'quatre-epices': "quatre-épices",
  'raisins-secs': "raisins secs",
  'rhum': "rhum",
  'romarin': "romarin",
  'safran': "safran",
  'sarriette': "sarriette",
  'sauce-pimentee': "sauce pimentée",
  'sauce-piquante': "sauce piquante",
  'sauce-poisson': "sauce poisson",
  'sauce-soja': "sauce soja",
  'sauce-worcestershire': "sauce Worcestershire",
  'sauge': "sauge",
  'sel': "sel",
  'semoule-de-mais': "semoule de maïs",
  'sucre': "sucre",
  'sucre-glace': "sucre glace",
  'thym': "thym",
  'tofu': "tofu",
  'vanille': "vanille",
  'vin': "vin",
  'vinaigre': "vinaigre",
  'vinaigre-balsamique': "vinaigre balsamique",
  'vinaigre-de-cidre': "vinaigre de cidre",
  'vinaigre-de-vin': "vinaigre de vin",
  'zeste': "zeste",
  'zeste-d-orange': "zeste d'orange",
  'zeste-de-citron': "zeste de citron",
};

export const TYPES = { plat: 'Plats', midi: 'Midi', petitdej: 'Petit-déj', dessert: 'Desserts' };

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function parseIngredients(text) {
  return text.split(/\s+/).filter(Boolean).map((tok) => {
    const pantry = tok.startsWith('~');
    const [key, amt] = tok.replace(/^~/, '').split(':');
    const m = (amt ?? '').match(/^([\d.]+)(g|ml|pc|cc|cs)?$/);
    return { key, amount: m ? Number(m[1]) : 0, unit: m?.[2] ?? null, pantry: pantry || Boolean(ING[key]?.pantry) };
  });
}

// Ce que contiennent les ingrédients de placard qui ne sont pas dans ING.
const PANTRY_FLAGS = {
  lait: 'd', ghee: 'd', 'pepites-de-chocolat': 'd', 'farine-levante': 'g', 'petits-pains': 'g', 'sauce-soja': 'g',
  'sauce-poisson': 'f', 'sauce-worcestershire': 'f', 'ecrevisses-sechees': 'f', 'pistaches-ou-amandes': 'n', vin: 'a', rhum: 'a',
};
// Ingrédients avec du porc qui existent en version halal chez le boucher.
const HALAL_SWAP = new Set(['hache', 'jambon', 'lardons', 'chorizo', 'steak-burger']);

/** [nom, type, minutes, ustensiles, ingrédients, étapes, source?] → recette. */
export function makeRecipe([name, type, minutes, tools, ingredients, steps, src, fam], prefix = '') {
  const ings = parseIngredients(ingredients);
  // Régimes et allergies : tous les ingrédients comptent, placard compris
  // (« pantry » ne change que ce qu'on achète, pas ce que contient le plat).
  const flags = new Set(ings.flatMap((i) => [...(ING[i.key]?.flags ?? PANTRY_FLAGS[i.key] ?? '')]));
  // Porc qu'un boucher halal remplace (haché, lardons, chorizo de bœuf ou de dinde) : noté à part.
  if (flags.has('p') && ings.every((i) => i.pantry || !ING[i.key]?.flags?.includes('p') || HALAL_SWAP.has(i.key))) flags.add('h');
  return {
    id: prefix + slug(name), name, type, minutes, steps,
    tools: tools ? tools.split(/\s+/).map((g) => g.split('|')) : [],
    ingredients: ings,
    flags,
    ...(src ? { src } : {}),
    ...(fam != null ? { fam } : {}), // plat d'ici (1) ou « découverte » (0), noté à l'import
  };
}

export const RECIPES = R.map((r) => makeRecipe(r));

/**
 * Ajoute des recettes importées (Wikibooks Cookbook, CC BY-SA 4.0) :
 * ingrédients inconnus écartés, identifiants uniques.
 */
export const sameName = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '').replace(/(.)\1/g, '$1');
export function addRecipes(rows, prefix = 'wb-') {
  const ids = new Set(RECIPES.map((r) => r.id));
  const names = new Set(RECIPES.map((r) => sameName(r.name))); // « Carbonnade flamande » déjà là : pas en double
  let added = 0;
  for (const row of rows) {
    const r = makeRecipe(row, prefix);
    if (ids.has(r.id) || names.has(sameName(r.name)) || r.ingredients.some((i) => !ING[i.key] && !(i.pantry && PANTRY_LABELS[i.key]))) continue;
    ids.add(r.id);
    names.add(sameName(r.name));
    RECIPES.push(r);
    added++;
  }
  return added;
}

// ---------- Filtres ----------
export const DIETS = {
  tout: { label: 'Je mange de tout', not: '' },
  'sans-porc': { label: 'Sans porc', not: 'p' },
  // Halal : ni porc ni alcool ; la viande s'achète chez un boucher halal (voir src/halal.js).
  halal: { label: 'Halal', not: 'a', halal: true },
  vegetarien: { label: 'Végétarien', not: 'mpf' },
  vegan: { label: 'Vegan', not: 'mpfde' },
};
export const ALLERGIES = { d: 'Sans lactose', g: 'Sans gluten', e: 'Sans œufs', n: 'Sans fruits à coque' };

// Ingrédients des recettes dans les catalogues en français (Delhaize, Aldi) :
// [recherche, mots exigés, mots exclus (plats préparés, soupes, jus…)].
// Les recherches q ci-dessus visent le catalogue Colruyt (noms néerlandais).
export const FR_Q = {
  boeuf: ['haché', /b(oe|œ)uf/i, /veau|vegan|v[ée]g[ée]tal|burger|poulet|porc|[ée]pic|agneau|merguez|boulette/i],
  steak: ['steak pelé boeuf', /steak|biefstuk/i, /moulu|bio|poivre|cerf|suisse|hach/i],
  'boeuf-ragout': ['carbonnades boeuf', /carbonnade|braiser|stoofvlees/i, /bio|cuit|sauce/i],
  'steak-burger': ['hamburger', /hamburger|burger/i, /compote|pur[ée]e|vegan|poulet|v[ée]g/i],
  dinde: ['filet de dinde', /dinde/i, /tranche|fum|cuit|chorizo/i],
  crevettes: ['crevettes décortiquées', /crevette|scampi/i, /sauce|curry|cocktail|ail/i],
  cabillaud: ['filet de cabillaud', /cabillaud/i, /pan[ée]|sauce|fum/i],
  moules: ['moules fraîches', /moules/i, /vinaigre|sauce|cuit/i],
  parmesan: ['parmigiano reggiano', /parmigiano|parmesan/i, /romanesco|sauce|chips/i],
  feta: ['feta', /feta/i, /olive|herbe|pesto|salade/i],
  'lait-coco': ['lait de coco', /lait de coco|coconut milk|lait coco/i, /frais|boisson|yaourt|sp[ée]cialit/i],
  'patate-douce': ['patate douce', /patate/i, /soupe|repas|pur[ée]e|chili|nouilles|frites|chips/i],
  'chou-fleur': ['chou fleur', /chou.?fleur/i, /b[ée]chamel|riz|gratin|soupe/i],
  chicons: ['chicon', /chicon/i, /brais|jambon|gastronom|gratin/i],
  epinards: ['épinards', /[ée]pinard/i, /cr[eè]me|soupe|feuillet/i],
  poireaux: ['poireaux', /poireau/i, /soupe|blanc/i],
  noix: ['cerneaux de noix', /noix/i, /raisin|pecan|cajou|coco|muscade/i],
  amandes: ['amandes nature', /amande/i, /sal[ée]|grill|chocolat|boisson|lait/i],
  'fromage-frais': ['fromage frais nature', /fromage frais/i, /boursin|fondu|ail|herbe/i],
  cacahuete: ['beurre de cacahuète', /beurre de cacahu/i, /snack|prot[ée]in/i],
  porc: ['porc côtes', /porc/i, /grill[ée]|r[oô]ti|cuit|ib[ée]rico|hach|saucisse/i],
  fraises: ['fraises', /fraise/i, /jus|smoothie|confiture|yaourt|glace|biscuit|barquette|gâteau|gateau|sirop|bonbon|lait|celsius|fruit-tella|\bcl\b|boisson/i],
  lasagne: ['feuilles lasagne', /lasagne/i, /bolognaise|potiron|saumon|l[ée]gumes|v[ée]g/i],
  nouilles: ['nouilles', /nouille|noodle/i, /wet|soupe|instant|poulet|b[oœ]uf|crevette/i],
  'haricots-rouges': ['haricots rouges', /haricots?,? rouges/i, /chili|sauce|2 x 60/i],
  mais: ['maïs doux', /ma[iï]s/i, /repas|baby|crispy|soupe|pop/i],
  cacao: ['cacao poudre', /cacao/i, /nesquik|gaufre|truffe|chocolat en poudre|biscuit|chips/i],
  chorizo: ['chorizo', /chorizo/i, /pizza|chips/i],
  lardons: ['lardons', /lardon/i, /v[ée]g/i],
};

// ---------- Envies : filtres de style ----------
// Protéines (g pour 100 g / 100 ml, ou par pièce pour les œufs) des ingrédients achetés.
const PROTEIN = {
  poulet: 23, dinde: 24, boeuf: 26, steak: 26, 'steak-burger': 17, hache: 18, 'boeuf-ragout': 20, porc: 20, jambon: 18, lardons: 14,
  chorizo: 24, merguez: 15, saumon: 20, thon: 25, cabillaud: 18, crevettes: 20, moules: 12, oeufs: 6, lentilles: 24, 'pois-chiches': 8,
  'haricots-rouges': 8, tofu: 13, skyr: 11, 'fromage-frais': 8, gouda: 25, emmental: 28, mozzarella: 18, parmesan: 33, feta: 14,
  cheddar: 25, reblochon: 20, quinoa: 14, yaourts: 4, lait: 3.4, houmous: 8, falafel: 13, pates: 12, riz: 7, semoule: 12, nouilles: 10,
  cacahuete: 25, amandes: 21, noix: 15, lasagne: 12, gnocchi: 4,
};
const VEG = { tomates: 1, concombre: 1, carottes: 1, oignons: 1, courgettes: 1, poivrons: 1, brocoli: 1, champignons: 1, epinards: 1,
  poireaux: 1, aubergine: 1, 'chou-fleur': 1, chicons: 1, courge: 1, 'haricots-verts': 1, 'legumes-surg': 1, 'patate-douce': 1,
  'tomates-conc': 1, mais: 1, salade: 100, avocats: 150 }; // pièce → grammes
const bought = (r) => r.ingredients.filter((i) => !i.pantry);
const grams = (r, keys) => bought(r).filter((i) => keys[i.key]).reduce((t, i) => t + (i.unit === 'pc' ? i.amount * (keys[i.key] > 1 ? keys[i.key] : 0) : i.amount), 0);

/** Protéines par portion (g), approximatives. */
export function proteinOf(r) {
  return Math.round(bought(r).reduce((t, i) => t + (PROTEIN[i.key] ? (i.unit === 'pc' ? i.amount * PROTEIN[i.key] : (i.amount / 100) * PROTEIN[i.key]) : 0), 0));
}
/** Légumes par portion (g). */
export const vegOf = (r) => Math.round(grams(r, VEG));

export const STYLES = {
  rapide: { label: 'Ultra rapide', hint: '≤ 15 min', test: (r) => r.minutes <= 15 },
  pates: { label: 'Pâtes', test: (r) => bought(r).some((i) => ['pates', 'lasagne', 'gnocchi', 'nouilles'].includes(i.key)) },
  veggie: { label: 'Veggie', test: (r) => !r.flags.has('m') && !r.flags.has('f') },
  proteine: { label: 'Protéiné', hint: '≥ 25 g de protéines', test: (r) => proteinOf(r) >= 25 },
  healthy: {
    label: 'Healthy',
    test: (r) => r.type !== 'dessert' && vegOf(r) >= 150
      && !bought(r).some((i) => ['frites', 'pizza', 'pate-feuil', 'bouchees', 'chocolat', 'sirop'].includes(i.key))
      && bought(r).filter((i) => i.key === 'sucre').reduce((t, i) => t + i.amount, 0) <= 15
      && bought(r).filter((i) => ['creme', 'beurre'].includes(i.key)).reduce((t, i) => t + i.amount, 0) <= 30
      && bought(r).filter((i) => ['gouda', 'emmental', 'mozzarella', 'parmesan', 'cheddar', 'reblochon', 'feta'].includes(i.key)).reduce((t, i) => t + i.amount, 0) <= 40,
  },
};

/** La recette est-elle faisable avec ces ustensiles et ce régime ? */
// Plats connus en Belgique et en France : les recettes écrites pour l'app (2), et
// parmi les recettes importées, les grands classiques (1). Le reste : « découverte » (0).
const FAMILIAR = /fricass|tourte|poulet croustillant|poulet barbecue|haricots verts|riz au curry|œufs brouill|bruschetta|bolognaise|bolo\b|carbonara|lasagne|gratin|quiche|omelette|croque|hachis|parmentier|bourguignon|blanquette|pot-au-feu|ratatouille|poulet r[oô]ti|steak|burger|pizza|chili|risotto|paella|couscous|tajine|boulettes?\b|pur[ée]e|frites|macaroni|spaghetti|tagliatelle|p[aâ]tes|nouilles saut|riz saut|riz pilaf|wok|fajitas|tacos|tortilla|wraps?\b|tartiflette|raclette|coq au vin|goulasch|waterzooi|carbonnade|stoemp|chicons|vol-au-vent|moules|cabillaud|saumon|thon|poulet (au|à la|aux)|escalope|cordon bleu|soupe (de|à la|aux|au) (tomate|légumes|lentilles|poulet|pommes de terre|potiron|courgette)|velout|pommes de terre (farcies|sautées|au four|à la crème)|poivrons farcis|courgettes farcies|tomates farcies|pain de viande|chakchouka|falafels?|curry de (poulet|lentilles|pois)|mafé|ragoût de bœuf|bœuf|dinde rôtie|côtes de porc|gratin/i;
// Origine lointaine écrite dans le nom : plat de découverte, même s'il ressemble à un classique.
const FARAWAY = /\((?![^)]*(variante|express|maison|sans viande|végé))[^)]*\)|africain|ougand|zambien|mongol|cap-verd|pakistan|philippin|nigérian|libérien|rwand|dominicain|péruvien|gambien|éthiopien|égyptien|libyen|kényan|sylheti|trinidad|portoric|indonésien|colombien|hongrois|bulgare|slovaque|maltais|norvégien|suédois|polonais|cubain|séfarade|vietnam|coréen|sindhi|haoussa|caroline|cincinnati|pedernales|texan|créole|mexicain|madras|vindaloo|karahi|tetrazzini|marsala|jollof|tonkatsu|bulgogi|kedgeree|picadillo|gumbo|jambalaya|tso|denver|mjaddara|koshari|maqlouba|sayadeya|dinuguan|babi|langue|cent ans|bryndz|knödel|kasnocken|komle|kroppkakor|pierogi|rissoles|yorkshire|gyuveche|kyufteta|stracciatella|salmorejo|bacalhau|rassolnik|youvarlakia|kugel|aloo|rajma|chushki|asopao|caldo|chraime|chikwanda|damoda|muchomo|buuz|braai|boxty|coddle|figolli|froġa|holzknecht|ibijumba|ikijumba|sukuma|yetakelt|ertesuppe|oliebollen|pickert|racuszki|palatschinken|kaiserschmarrn|lomo|locrio|com chiên|riz gras|mafé/i;
// Les plats préférés des familles, proposés en priorité.
const FAVORITES = new Set(['spaghetti-bolognaise', 'pates-carbonara', 'lasagnes-a-la-bolognaise', 'poulet-curry-coco-et-riz', 'chili-con-carne',
  'poulet-roti-et-pommes-de-terre', 'steak-frites-et-salade', 'boulets-a-la-liegeoise-et-frites', 'hachis-parmentier', 'vol-au-vent', 'moules-frites',
  'burger-maison-et-frites', 'fajitas-au-poulet', 'croque-monsieur-et-salade', 'pizza-maison', 'quiche-lorraine', 'poulet-pane-croustillant-et-frites',
  'saumon-au-four-et-legumes', 'carbonnade-flamande', 'riz-cantonais', 'tacos-au-boeuf', 'boulettes-sauce-tomate-et-puree', 'gratin-de-pates-au-jambon',
  'poulet-basquaise', 'waterzooi-de-poulet', 'cabillaud-pane-et-puree', 'pates-au-thon-et-a-la-tomate', 'omelette-aux-champignons', 'soupe-a-la-tomate']);
// Desserts, midi et petit-déj connus (les noms entre parenthèses y expliquent souvent un classique : « (scones) »).
const FAMILIAR_LIGHT = /croque|wraps?\b|hachis|tourte|roul[ée]s [àa] la cannelle|pudding aux pommes|mousse|cr[eè]me [àa] la banane|pralin|champignons farcis|g[aâ]teau|cake|brownie|blondie|cookie|crumble|cr[eê]pes?\b|pancake|gaufre|muffin|madeleine|mousse au chocolat|riz au lait|tarte|quatre-quarts|meringue|[ée]clair|cr[eè]me (anglaise|p[aâ]tissi[eè]re|au chocolat)|flan|cupcake|scones?|biscuits?|salade|mimosa|coleslaw|porridge|banana split|bananes po[eê]l|tatin|strudel|teurgoule|pain perdu|sandwich|tartines?|smoothie|compote|caprese|omelette|œufs brouill|lemon curd|carr[ée]s au citron|soufflés au citron|sauce chocolat|petit-d[ée]jeuner anglais/i;
const FARAWAY_LIGHT = /tanzan|y[ée]m[ée]nite|catalan|haoussa|tchad|chypri|uruguay|shirazi|chopska|curtido|ontario|ozark|nig[ée]rian|malawi|congee|zimtsterne|vanillekipferl|reindling|sachertorte|halva|panocha|jahnun|kal kals|bu[ñn]uelos|irish potatoes|tire au miel|wainar|welsh|snickerdoodle|grout|thiele|shrewsbury|marly|pascualina|zambien|[ée]gyptien|laban|chapati|monte cristo|red devils|pan con tomate|ancienne mode|bonbon/i;
/** 3 : grand classique familial ; 2 : recette de l'app ; 1 : classique importé ; 0 : découverte. */
export function familiarity(r) {
  if (FAVORITES.has(r.id)) return 3;
  if (r.fam != null) return r.fam; // Livre de cuisine (Wikilivres) : noté à l'import
  if (!r.id.startsWith('wb-')) return 2;
  if (r.type !== 'plat') return FAMILIAR_LIGHT.test(r.name) && !FARAWAY_LIGHT.test(r.name) ? 1 : 0;
  return FAMILIAR.test(r.name) && !FARAWAY.test(r.name) ? 1 : 0;
}
// Réglage « Plats proposés » : part de plats « découverte » dans les propositions.
export const DISCOVERY = {
  classique: { label: 'Classiques', share: 0 },
  mix: { label: 'Un peu de découverte', share: 0.2 },
  aventure: { label: 'Aventure', share: 1 },
};

// Viandes et poissons qu'on peut préférer ou refuser (Réglages, questions du panier malin).
export const MEATS = { poulet: 'Poulet', boeuf: 'Bœuf', dinde: 'Dinde', agneau: 'Agneau', porc: 'Porc', poisson: 'Poisson', 'fruits-mer': 'Crevettes, moules' };
const MEAT_OF = {
  poulet: 'poulet', hache: 'boeuf', boeuf: 'boeuf', steak: 'boeuf', 'boeuf-ragout': 'boeuf', 'steak-burger': 'boeuf', merguez: 'agneau',
  dinde: 'dinde', jambon: 'porc', lardons: 'porc', chorizo: 'porc', porc: 'porc',
  saumon: 'poisson', thon: 'poisson', cabillaud: 'poisson', crevettes: 'fruits-mer', moules: 'fruits-mer',
};
// Halal : le boucher remplace jambon et lardons par de la dinde, le chorizo par du bœuf.
const HALAL_MEAT = { jambon: 'dinde', lardons: 'dinde', chorizo: 'boeuf' };
/** Viandes et poissons d'une recette (clés de MEATS). */
export function meatsOf(r, halal = false) {
  return new Set(r.ingredients.filter((i) => !i.pantry).map((i) => (halal && HALAL_MEAT[i.key]) || MEAT_OF[i.key]).filter(Boolean));
}

export function compatible(r, { kitchen = {}, diet = 'tout', allergies = [], maxTime = Infinity, avoid = [] } = {}) {
  if (r.minutes > maxTime) return false;
  // Viandes refusées (« Jamais »).
  if (avoid.length) { const m = meatsOf(r, DIETS[diet]?.halal); if (avoid.some((k) => m.has(k))) return false; }
  if (!r.tools.every((group) => group.some((t) => kitchen[t]))) return false;
  const banned = (DIETS[diet]?.not ?? '') + allergies.join('');
  if (DIETS[diet]?.halal && r.flags.has('p') && !r.flags.has('h')) return false;
  return ![...banned].some((f) => r.flags.has(f));
}

/** Quantité affichée : « 250 g », « 1,5 L », « 2 ». */
const FRACTIONS = { 0.125: '⅛', 0.25: '¼', 0.375: '⅜', 0.5: '½', 0.625: '⅝', 0.75: '¾', 0.875: '⅞' };
const spoon = (x) => { const whole = Math.floor(x); const f = FRACTIONS[Math.round((x - whole) * 8) / 8]; return `${whole || ''}${f ?? ''}` || '¼'; };

export function formatAmount(amount, unit) {
  const r = (x) => (x >= 10 ? Math.round(x / 5) * 5 : Math.round(x * 10) / 10).toLocaleString('fr-BE');
  if (unit === 'cc') return `${spoon(amount)} c. à café`;
  if (unit === 'cs') return `${spoon(amount)} c. à soupe`;
  if (unit === 'g') return amount >= 1000 ? `${(Math.round(amount / 100) / 10).toLocaleString('fr-BE')} kg` : `${r(amount)} g`;
  if (unit === 'ml') return amount >= 1000 ? `${(Math.round(amount / 100) / 10).toLocaleString('fr-BE')} L` : `${r(amount)} ml`;
  return r(amount);
}

/** Part d'un paquet nécessaire : ingrédient × personnes. */
export function packShare(ing, servings) {
  const def = ING[ing.key];
  return def ? (ing.amount * servings) / def.pack[0] : 0;
}

/**
 * Coût d'une recette pour `servings` personnes (hors placard).
 * packPrice(key) → prix d'un paquet de l'ingrédient.
 */
export function recipeCost(r, servings, packPrice) {
  return r.ingredients.filter((i) => !i.pantry).reduce((t, i) => t + packShare(i, servings) * packPrice(i.key), 0);
}

// Plat principal : protéine dominante, pour varier les menus.
function mainKind(r) {
  if (r.flags.has('f')) return 'poisson';
  if (r.flags.has('m')) return 'viande';
  return 'vege';
}

/**
 * Menus de la semaine : `n` plats compatibles, variés, les moins chers d'abord,
 * selon la place voulue pour la viande et le poisson.
 * prefs.meat / prefs.fish : 'souvent' | 'parfois' | 'rarement' | 'jamais'
 */
// Un vrai repas : un féculent, une protéine (viande, poisson, œufs) ou des légumineuses.
const MEAL = new Set(['pates', 'riz', 'pdt', 'semoule', 'quinoa', 'nouilles', 'gnocchi', 'lasagne', 'pain', 'baguette', 'tortillas', 'pate-pizza', 'pate-brisee', 'pate-feuil', 'pizza', 'frites', 'patate-douce', 'pain-burger', 'pain-mie', 'pain-pita', 'poulet', 'hache', 'boeuf', 'steak', 'boeuf-ragout', 'steak-burger', 'dinde', 'porc', 'merguez', 'jambon', 'lardons', 'chorizo', 'saumon', 'thon', 'cabillaud', 'crevettes', 'moules', 'oeufs', 'lentilles', 'pois-chiches', 'haricots-rouges', 'tofu', 'falafel']);
export const isMeal = (r) => r.ingredients.filter((i) => !i.pantry && MEAL.has(i.key)).length >= 1 && r.ingredients.filter((i) => !i.pantry).length >= 3;

export function pickDishes(n, filters, costOf, { meat = 'parfois', fish = 'parfois', exclude = [], perServing = null, loves = [], discovery = 'classique', recent = [] } = {}) {
  if (n <= 0) return [];
  // perServing : prix visé par portion (le budget le permet) ; sans lui, les moins chers.
  // Au-dessus du prix visé, un plat est trois fois plus pénalisé qu'en dessous.
  const gap = (c) => (perServing == null ? c : c <= perServing ? perServing - c : (c - perServing) * 3);
  const pool = RECIPES.filter((r) => r.type === 'plat' && isMeal(r) && !exclude.includes(r.id) && compatible(r, filters))
    .map((r) => ({ r, cost: costOf(r) }))
    // Classiques familiaux (bolognaise, carbonara, boulets…) d'abord, puis les recettes de l'app,
    // à 2 € et 1 € par portion près ; un plat proposé récemment recule (variété d'une fois à l'autre).
    .map((x) => ({ ...x, score: gap(x.cost) - ({ 3: 2, 2: 1 }[familiarity(x.r)] ?? 0) + (recent.includes(x.r.id) ? 1.5 : 0) }))
    .sort((a, b) => a.score - b.score);
  const share = { souvent: 0.5, parfois: 0.3, rarement: 0.15, jamais: 0 };
  const target = { viande: Math.round(n * share[meat]), poisson: Math.round(n * share[fish]) };
  target.vege = Math.max(0, n - target.viande - target.poisson);
  const picked = [];
  const used = new Set();
  // Viandes préférées (« J'adore ») : environ 2 plats sur 3 de viande ou de poisson les contiennent.
  const halal = DIETS[filters?.diet]?.halal;
  const loved = (r) => loves.length > 0 && loves.some((k) => meatsOf(r, halal).has(k));
  // Plats « découverte » (origine lointaine) : une petite part au plus, selon le réglage.
  const maxNew = Math.round(n * (DISCOVERY[discovery]?.share ?? 0));
  let newCount = 0;
  const take = (kind, count, only = null, any = false) => {
    for (const x of pool) {
      if (picked.length >= n || count <= 0) break;
      if (used.has(x.r.id) || (kind && mainKind(x.r) !== kind) || (only && !only(x.r))) continue;
      const isNew = familiarity(x.r) === 0;
      if (isNew && newCount >= maxNew && !any) continue;
      picked.push(x.r.id); used.add(x.r.id); count--;
      if (isNew) newCount++;
    }
    return count;
  };
  const takeLoved = (kind, count) => {
    const before = picked.length;
    take(kind, Math.ceil(count * 0.67), loved);
    take(kind, count - (picked.length - before));
  };
  takeLoved('viande', target.viande);
  takeLoved('poisson', target.poisson);
  take('vege', target.vege);
  take(null, n - picked.length); // compléter si une catégorie manque
  take(null, n - picked.length, null, true); // et s'il n'y a plus assez de classiques
  return picked;
}

// Étapes de la préparation : une phrase (ou deux très courtes) par étape.
export function splitSteps(text) {
  if (String(text ?? '').includes('\n')) return String(text).split('\n').map((x) => x.trim()).filter(Boolean); // étapes écrites ligne par ligne
  const parts = String(text ?? '').split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ0-9«(])/).map((x) => x.trim()).filter(Boolean);
  const out = [];
  for (const x of parts) {
    if (out.length && (x.length < 25 || out[out.length - 1].length < 25)) out[out.length - 1] += ` ${x}`;
    else out.push(x);
  }
  return out;
}
