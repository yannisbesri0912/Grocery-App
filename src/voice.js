// Dictée : « ajoute 2 litres de lait, des œufs et du pain » → produits.

const NUMBERS = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, douze: 12, quinze: 15, vingt: 20, demi: 1 };
const NUM = /^(\d+(?:[.,]\d+)?|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|douze|quinze|vingt|demi)\s+/i;
// Unité de poids / volume : la quantité est un format, pas un nombre d'articles.
const MEASURE = /^(kilos?|kg|grammes?|litres?|l)\s+(?:d'|de\s+|des\s+)?/i;
// Contenant : la quantité est un nombre d'articles (« 3 paquets de pâtes »).
const PACK = /^(bouteilles?|packs?|paquets?|boîtes?|boites?|pots?|sachets?|barquettes?|bouquets?|pièces?|rouleaux?|douzaines?|briques?|canettes?|filets?|tranches?)\s+(?:d'|de\s+|des\s+)?/i;
const ARTICLE = /^(?:(?:du|de la|des|de|le|la|les|un|une)\s+|de l'|d'|l')/i;

/** Phrase dictée → [{ qty, name }]. */
export function parseVoice(text) {
  const t = text.toLowerCase()
    .replace(/^\s*(ok\s+)?(rajoute[rz]?|ajoute[rz]?|mets|mettre|achète[rz]?|acheter|il (me )?faut|j'ai besoin d[e'])\s*/i, '')
    .replace(/\s+(s'il te plaît|stp|merci)\s*$/i, '');
  return t.split(/\s*(?:,|;|\bet puis\b|\bpuis\b|\bet\b)\s*/).map((part) => {
    let p = part.trim();
    let qty = 1;
    const n = p.match(NUM);
    if (n) {
      const count = NUMBERS[n[1]] ?? Number(n[1].replace(',', '.'));
      p = p.slice(n[0].length);
      if (MEASURE.test(p)) p = p.replace(MEASURE, ''); // « 2 litres de lait » → lait, 1 article
      else { qty = Math.max(1, Math.round(count)); p = p.replace(PACK, ''); }
    } else {
      p = p.replace(ARTICLE, '').replace(PACK, '');
    }
    p = p.replace(ARTICLE, '').trim();
    return p ? { qty, name: p } : null;
  }).filter(Boolean);
}
