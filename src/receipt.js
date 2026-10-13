// Ticket de caisse : texte lu par la photo (OCR) → enseigne, articles, total.

const SKIP = /\b(tva|btw|sous[- ]?total|subtotal|total|totaal|te betalen|à payer|a payer|bancontact|maestro|visa|mastercard|payconiq|cash|esp[eè]ces|contant|rendu|terug|wisselgeld|carte|kaart|ticket|kassa|caisse|caissi|vendeur|merci|dank|tel|tél|www|bon\b|n°|nr\.?\s*\d|klant|client|points?|punten|epargn|spaar|réduction totale|totale korting|date|datum|heure|uur|\bbe\d{2}|iban|vat|ondernemings|entreprise)\b/i;

/** Enseigne d'après le texte du ticket. */
export function detectChain(text) {
  const t = text.toLowerCase();
  if (/colruyt|collect.?&?.?go|okay|bio-?planet/.test(t)) return 'colruyt';
  if (/delhaize|ad delhaize|proxy|shop.?n.?go/.test(t)) return 'delhaize';
  if (/\baldi\b/.test(t)) return 'aldi';
  if (/\blidl\b/.test(t)) return 'lidl';
  if (/carrefour/.test(t)) return /express/.test(t) ? 'carrefourx' : 'carrefour';
  if (/albert ?heijn/.test(t)) return 'ah';
  return null;
}

const money = (s) => Number(s.replace(/\s/g, '').replace(',', '.'));

/**
 * Lignes du ticket → { items: [{ name, qty, price, total }], total }.
 * Formats courants : « LAIT DEMI-ECREME 1L   1,05 A »,
 * « 2 x 1,29 » (ligne de quantité au-dessus ou en dessous), « -0,50 » (réduction).
 */
export function parseReceipt(text) {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const items = [];
  let total = null;
  let pendingQty = null;
  for (const line of lines) {
    const tot = line.match(/\b(total|totaal|à payer|a payer|te betalen)\b.*?(-?\d+[.,]\d{2})\s*(eur|€)?\s*$/i);
    if (tot && !/sous|sub/i.test(line)) { const v = money(tot[2]); if (v > 0 && (total == null || v > total)) total = v; continue; }
    // « 2 x 1,29 » ou « 2 X 1,29 = 2,58 »
    const q = line.match(/^(\d+)\s*[xX×*]\s*(\d+[.,]\d{2})(?:\s*=?\s*(\d+[.,]\d{2}))?\s*[A-Z]?$/);
    if (q) {
      const qty = Number(q[1]);
      const last = items.at(-1);
      if (last && last.qty === 1 && Math.abs(last.total - qty * money(q[2])) < 0.02) { last.qty = qty; last.price = money(q[2]); } else pendingQty = { qty, price: money(q[2]) };
      continue;
    }
    if (SKIP.test(line)) continue;
    const m = line.match(/^(.*?[a-zà-ÿ].*?)\s+(-?\d+[.,]\d{2})\s*(?:€|eur)?\s*[A-D]?\s*$/i);
    if (!m) continue;
    const name = m[1].replace(/^\d+\s+/, '').replace(/\s+\d+\s*[xX]\s*$/, '').trim();
    const value = money(m[2]);
    if (!name || name.length < 2 || value === 0) continue;
    if (value < 0) { // réduction : retirée de l'article précédent
      const last = items.at(-1);
      if (last) { last.total = Math.round((last.total + value) * 100) / 100; last.price = Math.round((last.total / last.qty) * 100) / 100; }
      continue;
    }
    const qty = pendingQty && Math.abs(pendingQty.qty * pendingQty.price - value) < 0.02 ? pendingQty.qty : 1;
    pendingQty = null;
    items.push({ name, qty, price: Math.round((value / qty) * 100) / 100, total: value });
  }
  return { items, total };
}
