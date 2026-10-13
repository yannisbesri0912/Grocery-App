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
// flags : m viande, p porc, f poisson, d lait, e œuf, g gluten, n fruits à coque.
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
  biere: P('biere', 24, 'pc'),
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
  ['Spaghetti bolognaise', 'plat', 30, 'plaques', 'pates:100g boeuf:125g tomates-conc:150g oignons:60g ail:5g emmental:20g ~huile ~epices', "Faire revenir l'oignon et l'ail émincés dans un peu d'huile, ajouter le haché et le faire dorer. Verser la sauce tomate, saler, poivrer et laisser mijoter 15 min. Cuire les pâtes et servir avec la sauce et le fromage."],
  ['Pâtes carbonara', 'plat', 20, 'plaques', 'pates:100g lardons:60g oeufs:1pc parmesan:20g ~epices', "Cuire les pâtes. Dorer les lardons à sec. Battre l'œuf avec le parmesan et beaucoup de poivre. Hors du feu, mélanger pâtes chaudes, lardons et œuf : la chaleur des pâtes lie la sauce."],
  ['Pâtes au thon et à la tomate', 'plat', 20, 'plaques', 'pates:100g thon:80g tomates-conc:120g oignons:40g ~huile ~epices', "Faire revenir l'oignon, ajouter la sauce tomate et le thon égoutté, laisser chauffer 10 min. Mélanger aux pâtes cuites."],
  ['Pâtes au pesto et tomates', 'plat', 15, 'plaques', 'pates:100g pesto:40g parmesan:15g tomates:80g', "Cuire les pâtes, les mélanger au pesto, ajouter les tomates en dés et le parmesan."],
  ['Pâtes crème et champignons', 'plat', 20, 'plaques', 'pates:100g champignons:125g creme:50ml oignons:30g emmental:20g ~huile ~epices', "Faire dorer oignon et champignons émincés, ajouter la crème, saler, poivrer. Mélanger aux pâtes cuites, parsemer de fromage."],
  ['Lasagnes à la bolognaise', 'plat', 75, 'four plaques', 'lasagne:80g boeuf:120g tomates-conc:180g oignons:50g lait:150ml beurre:15g farine:15g emmental:30g ~epices', "Préparer une bolognaise (oignon, haché, sauce tomate). Béchamel : fondre le beurre, ajouter la farine puis le lait en fouettant jusqu'à épaississement. Alterner feuilles, bolognaise et béchamel, finir par le fromage. Four 180 °C, 40 min."],
  ['Gratin de pâtes au jambon', 'plat', 35, 'four|airfryer plaques', 'pates:90g jambon:50g creme:50ml emmental:40g ~epices', "Cuire les pâtes un peu fermes, les mélanger avec le jambon en dés et la crème, couvrir de fromage. Gratiner 15 min à 200 °C (four ou air fryer)."],
  ['Pâtes poulet brocoli', 'plat', 25, 'plaques', 'pates:90g poulet:110g brocoli:150g creme:40ml ail:5g ~huile ~epices', "Cuire pâtes et brocoli ensemble (brocoli les 5 dernières minutes). Dorer le poulet en morceaux avec l'ail, ajouter la crème, puis pâtes et brocoli."],
  ['One pot pasta tomate mozzarella', 'plat', 20, 'plaques', 'pates:100g tomates-conc:150g mozzarella:60g ail:5g ~huile ~epices', "Mettre pâtes, sauce tomate, ail et 250 ml d'eau par personne dans une casserole. Cuire en remuant jusqu'à absorption. Ajouter la mozzarella en morceaux."],
  ['Gnocchi poêlés sauce tomate', 'plat', 15, 'plaques', 'gnocchi:200g tomates-conc:120g mozzarella:50g ~huile', "Dorer les gnocchi à la poêle dans un peu d'huile, ajouter la sauce tomate, puis la mozzarella et couvrir 2 min."],
  ['Pâtes aux courgettes et feta', 'plat', 20, 'plaques', 'pates:100g courgettes:150g feta:50g ail:5g citrons:0.25pc ~huile ~epices', "Faire revenir les courgettes en dés avec l'ail. Mélanger aux pâtes, ajouter la feta émiettée et un filet de citron."],
  ['Spaghetti ail et huile', 'plat', 15, 'plaques', 'pates:110g ail:8g parmesan:15g ~huile ~epices', "Faire dorer doucement l'ail émincé dans l'huile, mélanger aux spaghetti cuits, poivrer, ajouter le parmesan."],
  // Riz, céréales
  ['Poulet curry coco et riz', 'plat', 30, 'plaques', 'riz:80g poulet:130g lait-coco:100ml oignons:50g ~huile ~epices', "Faire revenir l'oignon et le poulet en morceaux, ajouter le curry puis le lait de coco, laisser mijoter 15 min. Servir avec le riz."],
  ['Riz cantonais', 'plat', 25, 'plaques', 'riz:80g oeufs:1pc jambon:40g legumes-surg:100g soja:10ml ~huile', "Cuire le riz (idéalement la veille). Faire une omelette fine, la couper en lanières. Sauter riz, légumes et jambon à feu vif, ajouter l'œuf et la sauce soja."],
  ['Chili con carne', 'plat', 40, 'plaques', 'boeuf:110g haricots-rouges:100g tomates-conc:150g oignons:50g mais:40g riz:70g ~huile ~epices', "Dorer oignon et haché, ajouter épices (cumin, paprika, piment), sauce tomate, haricots et maïs. Mijoter 20 min. Servir avec le riz."],
  ['Chili sin carne', 'plat', 40, 'plaques', 'lentilles:60g haricots-rouges:120g tomates-conc:150g oignons:50g mais:50g riz:70g ~huile ~epices', "Faire revenir l'oignon, ajouter lentilles, sauce tomate, épices et un verre d'eau. Mijoter 25 min, ajouter haricots et maïs. Servir avec le riz."],
  ['Risotto aux champignons', 'plat', 35, 'plaques', 'riz:80g champignons:120g oignons:40g parmesan:20g beurre:10g ~bouillon', "Faire revenir oignon et riz, mouiller avec le bouillon chaud louche par louche en remuant (18 min). Ajouter les champignons poêlés, le beurre et le parmesan."],
  ['Saumon, riz et brocoli', 'plat', 25, 'plaques|four', 'saumon:125g riz:75g brocoli:150g citrons:0.25pc ~huile ~epices', "Cuire le riz et le brocoli. Cuire le saumon à la poêle (4 min par face) ou au four (15 min à 200 °C). Arroser de citron."],
  ['Riz sauté aux crevettes', 'plat', 20, 'plaques', 'riz:80g crevettes:100g legumes-surg:120g oeufs:1pc soja:10ml ~huile', "Sauter les légumes et les crevettes, ajouter le riz cuit, l'œuf battu et la sauce soja en remuant."],
  ['Poulet teriyaki et riz', 'plat', 25, 'plaques', 'poulet:130g riz:80g soja:20ml miel:10g brocoli:100g ~huile', "Dorer le poulet en morceaux, ajouter sauce soja et miel, laisser caraméliser. Servir avec riz et brocoli."],
  ['Curry de pois chiches', 'plat', 30, 'plaques', 'pois-chiches:200g lait-coco:100ml tomates-conc:100g oignons:50g riz:70g epinards:60g ~huile ~epices', "Faire revenir l'oignon avec le curry, ajouter sauce tomate, lait de coco et pois chiches. Mijoter 15 min, ajouter les épinards. Servir avec le riz."],
  ['Dahl de lentilles corail', 'plat', 35, 'plaques', 'lentilles:80g lait-coco:100ml tomates-conc:80g oignons:40g gingembre:5g riz:60g ~huile ~epices', "Faire revenir oignon et gingembre, ajouter épices, lentilles, sauce tomate, lait de coco et 200 ml d'eau. Cuire 20 min. Servir avec le riz."],
  ['Paëlla express', 'plat', 40, 'plaques', 'riz:80g poulet:80g chorizo:30g crevettes:60g poivrons:80g oignons:40g legumes-surg:60g ~huile ~epices ~bouillon', "Dorer poulet, chorizo, oignon et poivron. Ajouter le riz, le bouillon et le paprika, cuire 18 min sans remuer. Ajouter crevettes et petits pois 5 min avant la fin."],
  ['Poulet basquaise', 'plat', 45, 'plaques', 'poulet:150g poivrons:150g tomates-conc:120g oignons:50g riz:70g ~huile ~epices', "Dorer le poulet, ajouter oignons et poivrons en lanières, puis la sauce tomate. Mijoter 25 min. Servir avec le riz."],
  ['Escalope de dinde aux champignons', 'plat', 25, 'plaques', 'dinde:150g champignons:100g creme:40ml riz:70g ~huile ~epices', "Dorer la dinde, réserver. Faire revenir les champignons, ajouter la crème, remettre la dinde 5 min. Servir avec le riz."],
  ['Tofu sauté aux légumes', 'plat', 25, 'plaques', 'tofu:120g legumes-surg:150g riz:70g soja:15ml ~huile', "Dorer le tofu en cubes, ajouter les légumes et la sauce soja, sauter 8 min. Servir avec le riz."],
  ['Poke bowl au saumon', 'plat', 25, 'plaques', 'riz:80g saumon:100g avocats:0.5pc concombre:0.25pc soja:15ml', "Cuire le riz et le laisser tiédir. Disposer dessus le saumon en dés, l'avocat et le concombre, arroser de sauce soja."],
  ['Buddha bowl quinoa', 'plat', 25, 'plaques', 'quinoa:70g pois-chiches:100g avocats:0.5pc carottes:80g houmous:40g', "Cuire le quinoa. Ajouter pois chiches, carottes râpées, avocat et une cuillère de houmous."],
  // Viandes, poissons, plats belges
  ['Poulet rôti et pommes de terre', 'plat', 60, 'four|airfryer', 'poulet:180g pdt:250g oignons:40g ~huile ~epices', "Couper les pommes de terre en quartiers, mélanger avec huile et épices. Ajouter le poulet et l'oignon. Cuire 40 min à 200 °C (25 min en air fryer en remuant)."],
  ['Poulet pané croustillant et frites', 'plat', 30, 'airfryer|four', 'poulet:150g farine:15g oeufs:0.5pc chapelure:25g frites:200g', "Passer le poulet en lanières dans la farine, l'œuf battu puis la chapelure. Cuire 12 min à 200 °C en air fryer (ou 20 min au four) avec les frites."],
  ['Steak, frites et salade', 'plat', 25, 'plaques airfryer|four', 'steak:150g frites:200g salade:0.25pc ~huile ~epices', "Cuire les frites (air fryer 18 min ou four). Saisir le steak 2 à 3 min par face à feu vif. Servir avec la salade."],
  ['Boulettes sauce tomate et purée', 'plat', 45, 'plaques', 'hache:150g tomates-conc:150g oignons:40g pdt:250g lait:60ml beurre:10g ~epices', "Former des boulettes, les dorer, ajouter l'oignon et la sauce tomate, mijoter 20 min. Purée : cuire les pommes de terre, écraser avec lait et beurre."],
  ['Boulets à la liégeoise et frites', 'plat', 60, 'plaques airfryer|four', 'hache:160g oignons:60g sirop:30g frites:200g ~bouillon ~epices', "Former de grosses boulettes, les dorer. Ajouter les oignons, le sirop de Liège et le bouillon, mijoter 30 min. Servir avec les frites."],
  ['Hachis parmentier', 'plat', 60, 'four|airfryer plaques', 'boeuf:120g pdt:250g lait:60ml beurre:10g oignons:40g emmental:25g ~epices', "Faire une purée. Dorer oignon et haché. Mettre la viande dans un plat, couvrir de purée et de fromage. Gratiner 20 min à 200 °C."],
  ['Saucisses et purée', 'plat', 30, 'plaques', 'merguez:2pc pdt:250g lait:60ml beurre:10g ~epices', "Cuire les saucisses à la poêle 15 min. Cuire les pommes de terre, les écraser avec le lait et le beurre."],
  ['Stoemp aux carottes et saucisse', 'plat', 35, 'plaques', 'merguez:2pc pdt:250g carottes:150g beurre:10g ~epices', "Cuire ensemble pommes de terre et carottes, écraser avec le beurre, saler, poivrer. Servir avec les saucisses poêlées."],
  ['Merguez et semoule aux légumes', 'plat', 40, 'plaques bouilloire|plaques', 'merguez:2pc semoule:80g carottes:100g courgettes:100g pois-chiches:80g oignons:40g ~huile ~epices', "Mijoter les légumes en morceaux avec les épices et un peu d'eau 25 min, ajouter les pois chiches. Cuire les merguez. Semoule : verser son volume d'eau bouillante, couvrir 5 min."],
  ['Chicons au gratin', 'plat', 60, 'four plaques', 'chicons:250g jambon:50g lait:120ml beurre:15g farine:15g emmental:30g pdt:200g ~epices', "Cuire les chicons 20 min, bien les égoutter, les rouler dans le jambon. Couvrir de béchamel (beurre, farine, lait) et de fromage. Four 200 °C, 25 min. Servir avec des pommes de terre."],
  ['Carbonnade flamande', 'plat', 150, 'plaques airfryer|four', 'boeuf-ragout:180g biere:1pc oignons:80g pain:30g frites:200g ~moutarde ~epices', "Dorer la viande en cubes, ajouter les oignons, la bière, et une tranche de pain tartinée de moutarde. Mijoter 2 h à feu doux. Servir avec des frites."],
  ['Vol-au-vent', 'plat', 45, 'plaques four|airfryer', 'poulet:120g champignons:80g creme:50ml bouchees:1pc frites:200g ~bouillon', "Pocher le poulet 15 min dans le bouillon. Faire revenir les champignons, ajouter la crème et un peu de bouillon, puis le poulet en morceaux. Remplir les bouchées chaudes. Servir avec des frites."],
  ['Waterzooi de poulet', 'plat', 45, 'plaques', 'poulet:150g carottes:80g poireaux:80g pdt:200g creme:40ml ~bouillon', "Cuire le poulet avec les légumes en julienne et les pommes de terre dans le bouillon 30 min. Ajouter la crème en fin de cuisson."],
  ['Moules frites', 'plat', 30, 'plaques airfryer|four', 'moules:500g oignons:40g frites:200g ~epices', "Faire revenir l'oignon, ajouter les moules nettoyées, couvrir et cuire 6 à 8 min en secouant. Servir avec les frites."],
  ['Fajitas au poulet', 'plat', 25, 'plaques', 'tortillas:2pc poulet:120g poivrons:100g oignons:40g creme:30ml ~huile ~epices', "Sauter le poulet en lanières avec poivrons, oignon et épices. Garnir les tortillas chaudes, ajouter un peu de crème."],
  ['Tacos au bœuf', 'plat', 25, 'plaques', 'tortillas:2pc boeuf:110g tomates:80g salade:0.15pc cheddar:30g ~epices', "Dorer le haché avec les épices. Garnir les tortillas avec la viande, la salade, les tomates et le fromage."],
  ['Burger maison et frites', 'plat', 25, 'plaques airfryer|four', 'pain-burger:1pc steak-burger:1pc cheddar:20g tomates:50g salade:0.1pc frites:180g', "Cuire les frites. Saisir le steak, poser le cheddar dessus en fin de cuisson. Monter le burger avec tomate et salade."],
  ['Quiche lorraine', 'plat', 55, 'four', 'pate-brisee:0.25pc lardons:50g oeufs:1pc creme:50ml emmental:25g salade:0.2pc ~epices', "Étaler la pâte, ajouter les lardons dorés. Battre œufs, crème et fromage, verser. Four 180 °C, 35 min. Servir avec une salade."],
  ['Quiche saumon et poireaux', 'plat', 55, 'four plaques', 'pate-brisee:0.25pc poireaux:100g saumon:60g oeufs:1pc creme:50ml ~epices', "Faire fondre les poireaux émincés. Les répartir sur la pâte avec le saumon en morceaux, couvrir d'œufs battus avec la crème. Four 180 °C, 35 min."],
  ['Croque-monsieur et salade', 'plat', 15, 'four|airfryer|plaques', 'pain-mie:4pc jambon:40g gouda:40g beurre:10g salade:0.2pc', "Beurrer le pain, garnir de jambon et de fromage. Cuire 8 min à 200 °C (air fryer ou four) ou à la poêle."],
  ['Pizza maison', 'plat', 35, 'four', 'pate-pizza:0.5pc tomates-conc:80g mozzarella:80g jambon:40g champignons:50g', "Étaler la pâte, couvrir de sauce tomate, jambon, champignons et mozzarella. Four 230 °C, 12 à 15 min."],
  ['Tarte fine tomate mozzarella', 'plat', 35, 'four|airfryer', 'pate-feuil:0.25pc tomates:150g mozzarella:60g pesto:15g', "Étaler le pesto sur la pâte, couvrir de rondelles de tomates et de mozzarella. Cuire 20 min à 200 °C."],
  ['Gratin dauphinois au jambon', 'plat', 70, 'four', 'pdt:300g creme:80ml lait:80ml ail:3g jambon:50g emmental:30g ~epices', "Couper les pommes de terre en fines rondelles, les disposer dans un plat frotté à l'ail avec le jambon. Couvrir de lait et crème, puis de fromage. Four 180 °C, 1 h."],
  ['Gratin de courgettes', 'plat', 45, 'four|airfryer plaques', 'courgettes:250g oeufs:1pc creme:40ml emmental:40g ~epices', "Faire revenir les courgettes en rondelles, les mettre dans un plat. Couvrir d'œuf battu avec la crème et de fromage. Gratiner 25 min à 200 °C."],
  ['Poulet tikka et riz', 'plat', 30, 'airfryer|four plaques', 'poulet:150g yaourts:1pc riz:70g ~epices', "Mariner le poulet en morceaux dans le yaourt et les épices (curry, paprika). Cuire 15 min à 200 °C en air fryer (20 min au four). Servir avec le riz."],
  ['Saumon au four et légumes', 'plat', 30, 'four|airfryer', 'saumon:125g courgettes:120g poivrons:80g citrons:0.25pc ~huile ~epices', "Disposer les légumes en morceaux avec un peu d'huile, poser le saumon dessus, arroser de citron. Cuire 20 min à 200 °C."],
  ['Cabillaud pané et purée', 'plat', 30, 'plaques|airfryer', 'cabillaud:150g chapelure:20g oeufs:0.5pc pdt:250g lait:50ml beurre:10g ~epices', "Paner le poisson (œuf battu puis chapelure), le cuire à la poêle ou 10 min en air fryer. Purée : pommes de terre écrasées avec lait et beurre."],
  ['Poisson en papillote au micro-ondes', 'plat', 15, 'micro', 'cabillaud:150g courgettes:100g tomates:80g citrons:0.25pc riz:70g ~epices', "Mettre le poisson sur les légumes en rondelles dans un plat couvert, citron et épices. Micro-ondes 5 à 6 min à pleine puissance. Riz : 12 min au micro-ondes avec deux fois son volume d'eau."],
  ['Wok de bœuf aux légumes', 'plat', 20, 'plaques', 'steak:120g legumes-surg:150g nouilles:80g soja:15ml gingembre:5g ~huile', "Saisir le bœuf en lanières à feu vif, ajouter légumes et gingembre, puis les nouilles cuites et la sauce soja."],
  ['Nouilles sautées au poulet', 'plat', 20, 'plaques', 'nouilles:90g poulet:110g legumes-surg:120g soja:15ml ~huile', "Cuire les nouilles. Sauter le poulet puis les légumes, ajouter nouilles et sauce soja."],
  ['Ramen express', 'plat', 10, 'bouilloire|plaques', 'nouilles:90g oeufs:1pc epinards:50g champignons:50g soja:15ml ~bouillon', "Verser le bouillon bouillant sur nouilles, champignons et épinards, laisser 4 min. Ajouter un œuf mollet (6 min dans l'eau bouillante) et la sauce soja."],
  ['Gyros de poulet maison', 'plat', 30, 'plaques', 'poulet:130g pain-pita:1pc tomates:60g oignons:30g yaourts:0.5pc salade:0.1pc ~huile ~epices', "Dorer le poulet en lanières avec les épices (paprika, cumin, origan). Garnir les pitas chaudes avec salade, tomate, oignon et yaourt."],
  ['Pain de viande et purée', 'plat', 70, 'four plaques', 'hache:150g oeufs:0.5pc chapelure:20g pdt:250g tomates-conc:80g ~epices', "Mélanger haché, œuf, chapelure et épices, former un pain. Cuire 50 min à 180 °C, napper de sauce tomate. Servir avec une purée."],
  ['Poêlée pommes de terre et lardons', 'plat', 30, 'plaques', 'pdt:300g lardons:60g oignons:40g creme:40ml ~huile', "Faire dorer les pommes de terre en cubes 20 min, ajouter oignon et lardons, puis la crème."],
  ['Tartiflette', 'plat', 50, 'four plaques', 'pdt:300g lardons:60g oignons:40g reblochon:0.25pc creme:30ml', "Cuire les pommes de terre, les couper. Mélanger avec lardons et oignons dorés et la crème, couvrir de reblochon. Four 200 °C, 25 min."],
  // Végétarien
  ['Omelette aux champignons', 'plat', 15, 'plaques', 'oeufs:3pc champignons:80g emmental:20g salade:0.25pc ~huile ~epices', "Faire revenir les champignons, verser les œufs battus, ajouter le fromage et plier l'omelette. Servir avec la salade."],
  ['Shakshuka', 'plat', 25, 'plaques', 'oeufs:2pc tomates-conc:200g poivrons:100g oignons:40g pain:60g ~huile ~epices', "Faire revenir oignon et poivron, ajouter la sauce tomate et les épices, mijoter 10 min. Casser les œufs dessus, couvrir jusqu'à ce que le blanc soit pris. Servir avec du pain."],
  ['Tortilla espagnole', 'plat', 40, 'plaques', 'oeufs:2pc pdt:200g oignons:50g salade:0.2pc ~huile ~epices', "Cuire doucement pommes de terre et oignon en fines tranches dans l'huile 20 min. Mélanger aux œufs battus, cuire à la poêle des deux côtés."],
  ['Frittata aux légumes', 'plat', 25, 'plaques|four', 'oeufs:2pc courgettes:100g poivrons:60g feta:30g ~huile ~epices', "Faire revenir les légumes, verser les œufs battus, ajouter la feta. Cuire à couvert à feu doux 10 min (ou finir au four)."],
  ['Pommes de terre farcies', 'plat', 35, 'airfryer|four|micro', 'pdt:300g jambon:40g emmental:30g creme:30ml', "Cuire les pommes de terre entières (micro-ondes 8 min, ou four). Les évider, mélanger la chair avec crème, jambon et fromage, remplir et gratiner."],
  ['Patate douce rôtie et pois chiches', 'plat', 35, 'four|airfryer', 'patate-douce:250g pois-chiches:120g feta:40g epinards:40g ~huile ~epices', "Couper la patate douce en cubes, mélanger avec les pois chiches, l'huile et les épices. Rôtir 25 min à 200 °C. Servir sur les épinards avec la feta."],
  ['Wraps aux falafels', 'plat', 15, 'airfryer|four|plaques', 'falafel:120g tortillas:2pc salade:0.15pc tomates:80g houmous:40g', "Réchauffer les falafels (air fryer 8 min). Tartiner les wraps de houmous, garnir de salade, tomates et falafels."],
  ['Ratatouille et riz', 'plat', 50, 'plaques', 'courgettes:150g aubergine:0.5pc poivrons:100g tomates:150g oignons:50g riz:60g ~huile ~epices', "Faire revenir chaque légume en dés, puis tout mijoter ensemble 30 min avec les tomates. Servir avec le riz."],
  ['Gratin de chou-fleur', 'plat', 45, 'four|airfryer plaques', 'chou-fleur:0.4pc lait:120ml beurre:12g farine:12g emmental:40g ~epices', "Cuire le chou-fleur 10 min. Béchamel : beurre, farine puis lait. Napper le chou-fleur, couvrir de fromage, gratiner 20 min à 200 °C."],
  ['Couscous aux légumes', 'plat', 40, 'plaques bouilloire|plaques', 'semoule:80g pois-chiches:100g carottes:100g courgettes:120g oignons:40g ~huile ~epices', "Mijoter les légumes en morceaux avec les épices (ras el hanout) dans de l'eau 25 min, ajouter les pois chiches. Semoule : son volume d'eau bouillante, couvrir 5 min."],
  ['Soupe de légumes et pain', 'plat', 40, 'plaques mixeur', 'carottes:120g pdt:100g poireaux:80g oignons:40g pain:60g ~bouillon', "Cuire les légumes en morceaux dans le bouillon 25 min, mixer. Servir avec du pain."],
  ['Soupe à la tomate', 'plat', 30, 'plaques mixeur', 'tomates:250g oignons:40g creme:20ml pain:60g ~bouillon ~epices', "Faire revenir l'oignon, ajouter les tomates et le bouillon, cuire 20 min, mixer, ajouter la crème."],
  ['Velouté de potiron', 'plat', 35, 'plaques mixeur', 'courge:250g pdt:80g oignons:30g creme:20ml pain:50g ~bouillon', "Cuire potiron, pomme de terre et oignon dans le bouillon 20 min, mixer avec la crème."],
  ['Soupe de lentilles corail', 'plat', 30, 'plaques', 'lentilles:60g carottes:100g lait-coco:60ml oignons:40g ~bouillon ~epices', "Faire revenir l'oignon, ajouter carottes, lentilles et bouillon, cuire 20 min. Ajouter le lait de coco (mixer si on veut)."],
  ['Salade de lentilles et feta', 'plat', 25, 'plaques', 'lentilles:70g carottes:60g oignons:20g feta:40g ~huile ~vinaigre', "Cuire les lentilles 20 min, égoutter. Mélanger avec carottes râpées, oignon, feta et une vinaigrette."],
  ['Pizza surgelée et salade', 'plat', 20, 'four|airfryer', 'pizza:0.5pc salade:0.2pc tomates:60g ~huile ~vinaigre', "Cuire la pizza selon l'emballage. Servir avec une salade et des tomates."],
  // Midi, salades, sandwichs
  ['Salade niçoise', 'midi', 20, 'plaques|bouilloire', 'thon:80g oeufs:1pc tomates:100g salade:0.25pc pdt:120g olives:20g haricots-verts:80g ~huile ~vinaigre', "Cuire œufs durs (10 min), pommes de terre et haricots. Assembler avec salade, tomates, thon et olives, ajouter une vinaigrette."],
  ['Salade César au poulet', 'midi', 20, 'plaques|airfryer', 'poulet:110g salade:0.4pc parmesan:15g pain:40g mayonnaise:20ml', "Cuire le poulet, griller des croûtons de pain. Mélanger salade, poulet, croûtons, parmesan et une sauce (mayonnaise allongée de citron)."],
  ['Salade de pâtes', 'midi', 20, 'plaques', 'pates:80g tomates:80g mozzarella:50g pesto:20g', "Cuire les pâtes, les refroidir. Mélanger avec tomates, mozzarella et pesto."],
  ['Taboulé', 'midi', 15, 'bouilloire|plaques', 'semoule:70g tomates:100g concombre:0.3pc citrons:0.3pc persil:0.2pc ~huile ~epices', "Verser son volume d'eau bouillante sur la semoule, couvrir 5 min. Ajouter tomates et concombre en dés, persil, citron et huile. Servir frais."],
  ['Salade grecque', 'midi', 10, '', 'tomates:150g concombre:0.4pc feta:60g olives:25g oignons:20g pain:60g ~huile', "Couper tomates, concombre et oignon, ajouter la feta et les olives, arroser d'huile."],
  ['Wrap poulet crudités', 'midi', 15, 'plaques|airfryer', 'tortillas:2pc poulet:100g salade:0.15pc tomates:60g mayonnaise:20ml ~epices', "Cuire le poulet en lanières. Garnir les wraps de mayonnaise, salade, tomate et poulet, rouler."],
  ['Sandwich jambon fromage', 'midi', 5, '', 'baguette:0.5pc jambon:50g gouda:30g beurre:10g salade:0.1pc', "Beurrer la baguette, garnir de jambon, fromage et salade."],
  ['Sandwich thon mayo', 'midi', 5, '', 'pain:100g thon:60g mayonnaise:20ml tomates:50g', "Mélanger le thon et la mayonnaise, tartiner sur le pain avec des rondelles de tomate."],
  ['Club sandwich au poulet', 'midi', 15, 'plaques', 'pain-mie:3pc poulet:80g tomates:50g salade:0.1pc mayonnaise:15ml', "Cuire le poulet. Monter trois tranches de pain grillé avec mayonnaise, poulet, tomate et salade."],
  ['Pommes de terre au micro-ondes', 'midi', 15, 'micro|four', 'pdt:300g skyr:80g jambon:40g ~epices', "Piquer les pommes de terre, cuire 8 à 10 min au micro-ondes. Ouvrir, garnir de fromage blanc assaisonné et de jambon."],
  // Petit-déjeuner
  ['Pancakes', 'petitdej', 20, 'plaques', 'farine:60g lait:80ml oeufs:0.5pc sucre:10g beurre:5g', "Mélanger farine, sucre, œuf et lait. Cuire des petites crêpes épaisses à la poêle beurrée, 2 min par face."],
  ['Porridge à la banane', 'petitdej', 5, 'micro|plaques', 'flocons:50g lait:150ml bananes:60g miel:10g', "Mélanger flocons et lait, cuire 2 min au micro-ondes (ou à la casserole). Ajouter la banane et le miel."],
  ['Overnight oats', 'petitdej', 5, '', 'flocons:50g skyr:100g bananes:60g lait:50ml', "La veille, mélanger flocons, skyr et lait dans un pot. Le matin, ajouter la banane."],
  ['Pain perdu', 'petitdej', 15, 'plaques', 'pain:80g oeufs:1pc lait:80ml sucre:10g beurre:10g', "Tremper le pain dans l'œuf battu avec le lait et le sucre, le dorer à la poêle beurrée."],
  ['Œufs brouillés et tartines', 'petitdej', 10, 'plaques', 'oeufs:2pc pain:80g beurre:10g ~epices', "Cuire les œufs battus à feu doux en remuant, avec une noisette de beurre. Servir sur des tartines."],
  ['Smoothie banane', 'petitdej', 5, 'mixeur', 'bananes:120g lait:200ml yaourts:0.5pc', "Mixer la banane, le lait et le yaourt."],
  // Desserts
  ['Crêpes', 'dessert', 30, 'plaques', 'farine:50g lait:100ml oeufs:0.5pc sucre:8g beurre:5g', "Mélanger farine, sucre, œufs, puis le lait petit à petit. Laisser reposer si possible. Cuire de fines crêpes à la poêle beurrée."],
  ['Mousse au chocolat', 'dessert', 20, 'micro|plaques', 'chocolat:50g oeufs:1.5pc sucre:5g', "Fondre le chocolat. Mélanger aux jaunes. Monter les blancs en neige avec le sucre, les incorporer délicatement. Au frigo 3 h."],
  ['Crumble aux pommes', 'dessert', 45, 'four|airfryer', 'pommes:150g farine:30g beurre:20g sucre:25g', "Couper les pommes en dés dans un plat. Sabler farine, sucre et beurre du bout des doigts, couvrir les pommes. Cuire 30 min à 180 °C."],
  ['Gâteau au yaourt', 'dessert', 45, 'four', 'yaourts:0.5pc farine:60g sucre:40g oeufs:0.75pc ~huile', "Mélanger yaourt, sucre, œufs, farine (avec un sachet de levure) et un peu d'huile. Cuire 35 min à 180 °C."],
  ['Mug cake au chocolat', 'dessert', 5, 'micro', 'chocolat:30g farine:25g sucre:15g oeufs:1pc beurre:15g', "Fondre chocolat et beurre dans une tasse (30 s), ajouter sucre, œuf et farine. Micro-ondes 1 min à 1 min 30."],
  ['Salade de fruits', 'dessert', 10, '', 'bananes:80g pommes:80g oranges:120g', "Couper les fruits, presser une orange par-dessus."],
  ['Riz au lait', 'dessert', 40, 'plaques', 'riz:40g lait:250ml sucre:20g', "Cuire le riz dans le lait à feu très doux 35 min en remuant souvent, sucrer en fin de cuisson."],
  ['Banana bread', 'dessert', 60, 'four', 'bananes:120g farine:50g sucre:25g oeufs:0.5pc beurre:20g', "Écraser les bananes bien mûres, ajouter beurre fondu, sucre, œuf, farine et levure. Cuire 50 min à 180 °C."],
  ['Cookies au chocolat', 'dessert', 25, 'four|airfryer', 'farine:45g beurre:25g sucre:25g chocolat:25g oeufs:0.25pc', "Mélanger beurre mou et sucre, ajouter l'œuf, la farine et le chocolat en morceaux. Former des boules, cuire 10 à 12 min à 180 °C."],
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

/** [nom, type, minutes, ustensiles, ingrédients, étapes, source?] → recette. */
export function makeRecipe([name, type, minutes, tools, ingredients, steps, src], prefix = '') {
  const ings = parseIngredients(ingredients);
  const flags = new Set(ings.filter((i) => !i.pantry).flatMap((i) => [...(ING[i.key]?.flags ?? '')]));
  return {
    id: prefix + slug(name), name, type, minutes, steps,
    tools: tools ? tools.split(/\s+/).map((g) => g.split('|')) : [],
    ingredients: ings,
    flags,
    ...(src ? { src } : {}),
  };
}

export const RECIPES = R.map((r) => makeRecipe(r));

/**
 * Ajoute des recettes importées (Wikibooks Cookbook, CC BY-SA 4.0) :
 * ingrédients inconnus écartés, identifiants uniques.
 */
export function addRecipes(rows, prefix = 'wb-') {
  const ids = new Set(RECIPES.map((r) => r.id));
  let added = 0;
  for (const row of rows) {
    const r = makeRecipe(row, prefix);
    if (ids.has(r.id) || r.ingredients.some((i) => !ING[i.key] && !(i.pantry && PANTRY_LABELS[i.key]))) continue;
    ids.add(r.id);
    RECIPES.push(r);
    added++;
  }
  return added;
}

// ---------- Filtres ----------
export const DIETS = {
  tout: { label: 'Je mange de tout', not: '' },
  'sans-porc': { label: 'Sans porc / halal', not: 'p' },
  vegetarien: { label: 'Végétarien', not: 'mpf' },
  vegan: { label: 'Vegan', not: 'mpfde' },
};
export const ALLERGIES = { d: 'Sans lactose', g: 'Sans gluten', e: 'Sans œufs', n: 'Sans fruits à coque' };

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
export function compatible(r, { kitchen = {}, diet = 'tout', allergies = [], maxTime = Infinity } = {}) {
  if (r.minutes > maxTime) return false;
  if (!r.tools.every((group) => group.some((t) => kitchen[t]))) return false;
  const banned = (DIETS[diet]?.not ?? '') + allergies.join('');
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

export function pickDishes(n, filters, costOf, { meat = 'parfois', fish = 'parfois', exclude = [] } = {}) {
  if (n <= 0) return [];
  const pool = RECIPES.filter((r) => r.type === 'plat' && isMeal(r) && !exclude.includes(r.id) && compatible(r, filters))
    .map((r) => ({ r, cost: costOf(r) }))
    .sort((a, b) => a.cost - b.cost);
  const share = { souvent: 0.5, parfois: 0.3, rarement: 0.15, jamais: 0 };
  const target = { viande: Math.round(n * share[meat]), poisson: Math.round(n * share[fish]) };
  target.vege = Math.max(0, n - target.viande - target.poisson);
  const picked = [];
  const used = new Set();
  const take = (kind, count) => {
    for (const x of pool) {
      if (picked.length >= n || count <= 0) break;
      if (used.has(x.r.id) || (kind && mainKind(x.r) !== kind)) continue;
      picked.push(x.r.id); used.add(x.r.id); count--;
    }
  };
  take('viande', target.viande);
  take('poisson', target.poisson);
  take('vege', target.vege);
  take(null, n - picked.length); // compléter si une catégorie manque
  return picked;
}
