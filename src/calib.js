// Calibrage par les tickets : pour un produit dont l'app n'avait qu'un prix
// estimé, le ticket donne le vrai prix. L'écart (prix payé / estimation),
// répété sur plusieurs articles, corrige le niveau de prix de l'enseigne.

const KEEP = 40; // derniers écarts gardés par enseigne
const MIN = 3; // écarts nécessaires avant de corriger

/** Ajoute un écart { r, d } (r = payé / estimé) ; écarts aberrants ignorés. */
export function addRatio(list = [], ratio, date) {
  if (!(ratio > 0.4 && ratio < 2.5)) return list;
  return [...list, { r: Math.round(ratio * 1000) / 1000, d: date }].slice(-KEEP);
}

/** Facteur de correction (médiane des écarts, bornée à ±25 %), 1 s'il y a trop peu de tickets. */
export function calibFactor(list = []) {
  if (list.length < MIN) return 1;
  const rs = list.map((x) => x.r).sort((a, b) => a - b);
  const mid = rs.length % 2 ? rs[(rs.length - 1) / 2] : (rs[rs.length / 2 - 1] + rs[rs.length / 2]) / 2;
  return Math.round(Math.min(1.25, Math.max(0.8, mid)) * 1000) / 1000;
}
