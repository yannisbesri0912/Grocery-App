// Données de base : enseignes, options de livraison, catalogue.
// Aucune adresse ni aucun magasin écrits en dur : les magasins sont cherchés
// autour de l'adresse de l'utilisateur (src/places.js, OpenStreetMap).

// index : niveau de prix relatif (Colruyt = 100), utilisé quand on n'a pas le
// vrai prix. domain : site de l'enseigne (sert à afficher son logo).
export const CHAINS = {
  colruyt:    { name: 'Colruyt',           index: 100, color: '#e2001a', domain: 'colruyt.be' },
  aldi:       { name: 'Aldi',              index: 94,  color: '#00a0e2', domain: 'aldi.be' },
  lidl:       { name: 'Lidl',              index: 95,  color: '#0050aa', domain: 'lidl.be' },
  delhaize:   { name: 'Delhaize',          index: 113, color: '#d4202b', domain: 'delhaize.be' },
  carrefour:  { name: 'Carrefour',         index: 110, color: '#004e9f', domain: 'carrefour.be' },
  carrefourx: { name: 'Carrefour Express', index: 126, color: '#004e9f', domain: 'carrefour.be' },
  ah:         { name: 'Albert Heijn',      index: 105, color: '#00a0e2', domain: 'ah.be' },
};

// Retrait en magasin (« Collect ») : chaque magasin de ces enseignes peut servir
// de point de retrait. Valeurs par défaut, modifiables dans Réglages :
//  - Colruyt Collect&Go : frais de service « à partir de 5,95 € » (collectandgo.be)
//  - Delhaize Collect : retrait gratuit (communiqué Delhaize) ; un minimum de 30 €
//    figure encore sur une page du site, on le garde par prudence.
export const COLLECT = {
  colruyt: { name: 'Collect&Go', fee: 5.95, minOrder: 0, minutes: 5, url: 'https://www.collectandgo.be/fr/home' },
  delhaize: { name: 'Delhaize Collect', fee: 0, minOrder: 30, minutes: 5, url: 'https://www.delhaize.be/fr/collect' },
};

// Livraison à domicile (sans déplacement).
export const DELIVERY = [
  {
    id: 'delhaize-home', chain: 'delhaize', name: 'Delhaize livraison à domicile',
    fee: 6.95, minOrder: 50, url: 'https://www.delhaize.be/fr/shoponline',
  },
];

// Catalogue : ref = prix de référence chez Colruyt (€, estimation),
// notIn = enseignes où le produit (ou un équivalent) est souvent introuvable.
// every = fréquence de rachat suggérée en jours (pour les récurrents).
const DISC = ['aldi', 'lidl'];
const SMALL = ['carrefourx'];

export const CATEGORIES = [
  'Fruits & légumes', 'Boulangerie', 'Crèmerie', 'Viande & poisson', 'Épicerie',
  'Surgelés', 'Boissons', 'Hygiène', 'Entretien', 'Bébé & animaux',
];

export const PRODUCTS = [
  // Fruits & légumes
  { id: 'bananes', name: 'Bananes (1 kg)', cat: 0, ref: 1.79, every: 7 },
  { id: 'pommes', name: 'Pommes Jonagold (1 kg)', cat: 0, ref: 2.29, every: 10 },
  { id: 'oranges', name: 'Oranges à jus (2 kg)', cat: 0, ref: 3.49 },
  { id: 'citrons', name: 'Citrons (500 g)', cat: 0, ref: 1.69 },
  { id: 'tomates', name: 'Tomates (1 kg)', cat: 0, ref: 2.99, every: 7 },
  { id: 'concombre', name: 'Concombre', cat: 0, ref: 0.89 },
  { id: 'salade', name: 'Salade (laitue)', cat: 0, ref: 1.19 },
  { id: 'carottes', name: 'Carottes (1 kg)', cat: 0, ref: 1.29 },
  { id: 'oignons', name: 'Oignons (1 kg)', cat: 0, ref: 1.49, every: 21 },
  { id: 'ail', name: 'Ail (250 g)', cat: 0, ref: 1.39 },
  { id: 'pdt', name: 'Pommes de terre (2,5 kg)', cat: 0, ref: 3.29, every: 14 },
  { id: 'courgettes', name: 'Courgettes (1 kg)', cat: 0, ref: 2.49 },
  { id: 'poivrons', name: 'Poivrons (500 g)', cat: 0, ref: 2.39 },
  { id: 'brocoli', name: 'Brocoli (500 g)', cat: 0, ref: 1.59 },
  { id: 'champignons', name: 'Champignons (500 g)', cat: 0, ref: 2.19 },
  { id: 'avocats', name: 'Avocats (2 pièces)', cat: 0, ref: 2.49 },
  // Boulangerie
  { id: 'pain', name: 'Pain gris tranché (800 g)', cat: 1, ref: 2.39, every: 4 },
  { id: 'baguette', name: 'Baguette', cat: 1, ref: 1.09 },
  { id: 'pistolets', name: 'Pistolets (6)', cat: 1, ref: 1.99 },
  { id: 'cereales', name: 'Corn flakes (500 g)', cat: 1, ref: 3.29, every: 14 },
  // Crèmerie
  { id: 'lait', name: 'Lait demi-écrémé (1 L)', cat: 2, ref: 1.05, every: 5 },
  { id: 'oeufs', name: 'Œufs plein air (12)', cat: 2, ref: 3.69, every: 10 },
  { id: 'beurre', name: 'Beurre (250 g)', cat: 2, ref: 2.79, every: 14 },
  { id: 'yaourts', name: 'Yaourts nature (8×125 g)', cat: 2, ref: 2.19, every: 7 },
  { id: 'gouda', name: 'Gouda tranché (300 g)', cat: 2, ref: 3.49, every: 10 },
  { id: 'emmental', name: 'Emmental râpé (200 g)', cat: 2, ref: 2.29 },
  { id: 'mozzarella', name: 'Mozzarella (125 g)', cat: 2, ref: 1.09 },
  { id: 'creme', name: 'Crème fraîche (20 cl)', cat: 2, ref: 1.39 },
  { id: 'skyr', name: 'Skyr / fromage blanc (500 g)', cat: 2, ref: 2.29 },
  // Viande & poisson
  { id: 'poulet', name: 'Filet de poulet (1 kg)', cat: 3, ref: 10.99, every: 7 },
  { id: 'hache', name: 'Haché bœuf-porc (500 g)', cat: 3, ref: 4.49 },
  { id: 'jambon', name: 'Jambon cuit (200 g)', cat: 3, ref: 2.69, every: 7 },
  { id: 'saumon', name: 'Filet de saumon frais (250 g)', cat: 3, ref: 5.99 },
  { id: 'thon', name: 'Thon en boîte (3×80 g)', cat: 3, ref: 4.29 },
  { id: 'merguez', name: 'Saucisses / merguez (6)', cat: 3, ref: 4.79 },
  // Épicerie
  { id: 'pates', name: 'Spaghetti (1 kg)', cat: 4, ref: 1.79, every: 14 },
  { id: 'riz', name: 'Riz basmati (1 kg)', cat: 4, ref: 2.89, every: 21 },
  { id: 'farine', name: 'Farine (1 kg)', cat: 4, ref: 0.99 },
  { id: 'sucre', name: 'Sucre (1 kg)', cat: 4, ref: 1.39 },
  { id: 'huile', name: "Huile d'olive (1 L)", cat: 4, ref: 8.49, every: 30 },
  { id: 'tomates-conc', name: 'Sauce tomate / passata (700 g)', cat: 4, ref: 1.39, every: 10 },
  { id: 'cafe', name: 'Café moulu (500 g)', cat: 4, ref: 5.99, every: 21 },
  { id: 'the', name: 'Thé noir (20 sachets)', cat: 4, ref: 1.89 },
  { id: 'confiture', name: 'Confiture de fraises (450 g)', cat: 4, ref: 2.39 },
  { id: 'chocolat', name: 'Chocolat noir (200 g)', cat: 4, ref: 2.49 },
  { id: 'pois-chiches', name: 'Pois chiches (400 g)', cat: 4, ref: 0.99 },
  { id: 'mayonnaise', name: 'Mayonnaise (500 ml)', cat: 4, ref: 2.69 },
  { id: 'nutella', name: 'Nutella (750 g)', cat: 4, ref: 5.99, notIn: DISC },
  { id: 'biscuits', name: 'Biscuits (Lu / Délacre)', cat: 4, ref: 2.79, notIn: DISC },
  { id: 'sel-poivre', name: 'Épices / sel / poivre', cat: 4, ref: 1.99 },
  // Surgelés
  { id: 'legumes-surg', name: 'Légumes surgelés (1 kg)', cat: 5, ref: 2.49, notIn: SMALL },
  { id: 'frites', name: 'Frites surgelées (1 kg)', cat: 5, ref: 2.19, notIn: SMALL },
  { id: 'pizza', name: 'Pizza surgelée', cat: 5, ref: 3.29 },
  { id: 'glace', name: 'Glace vanille (1 L)', cat: 5, ref: 3.49 },
  // Boissons
  { id: 'eau', name: 'Eau plate (6×1,5 L)', cat: 6, ref: 2.69, every: 7 },
  { id: 'eau-gaz', name: 'Eau pétillante (6×1,5 L)', cat: 6, ref: 3.39 },
  { id: 'jus', name: "Jus d'orange (1 L)", cat: 6, ref: 2.19, every: 7 },
  { id: 'coca', name: 'Coca-Cola (6×33 cl)', cat: 6, ref: 4.99, notIn: DISC },
  { id: 'biere', name: 'Bière Jupiler (24×25 cl)', cat: 6, ref: 13.99, notIn: SMALL },
  { id: 'vin', name: 'Vin rouge (75 cl)', cat: 6, ref: 5.99 },
  // Hygiène
  { id: 'pq', name: 'Papier toilette (12 rouleaux)', cat: 7, ref: 5.49, every: 21 },
  { id: 'essuie-tout', name: 'Essuie-tout (4 rouleaux)', cat: 7, ref: 3.29, every: 21 },
  { id: 'dentifrice', name: 'Dentifrice', cat: 7, ref: 1.99, every: 45 },
  { id: 'gel-douche', name: 'Gel douche (250 ml)', cat: 7, ref: 2.49, every: 30 },
  { id: 'shampoing', name: 'Shampoing (300 ml)', cat: 7, ref: 3.49, every: 30 },
  { id: 'deodorant', name: 'Déodorant', cat: 7, ref: 2.99, every: 30 },
  { id: 'mouchoirs', name: 'Mouchoirs (boîte de 100)', cat: 7, ref: 1.49 },
  // Entretien
  { id: 'lessive', name: 'Lessive liquide (40 lavages)', cat: 8, ref: 9.99, every: 30 },
  { id: 'vaisselle', name: 'Liquide vaisselle (500 ml)', cat: 8, ref: 1.89, every: 30 },
  { id: 'tablettes-lv', name: 'Tablettes lave-vaisselle (40)', cat: 8, ref: 7.99, every: 30, notIn: SMALL },
  { id: 'sacs-poubelle', name: 'Sacs poubelle blancs (20)', cat: 8, ref: 4.99, every: 30 },
  { id: 'eponges', name: 'Éponges (3)', cat: 8, ref: 1.49 },
  // Bébé & animaux
  { id: 'croquettes', name: 'Croquettes chat adulte (2 kg)', cat: 9, ref: 7.99, notIn: SMALL },
  { id: 'litiere', name: 'Litière (10 L)', cat: 9, ref: 4.49, notIn: SMALL },
];
