// Code-barres : caméra → code EAN → fiche Open Food Facts (nom, marque,
// contenance, Nutri-Score). Lecture par le détecteur du navigateur
// (BarcodeDetector, Android) ou par la bibliothèque ZXing (iPhone).

const ZXING = 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm';

/**
 * Lance la caméra dans `video` et appelle onCode(ean) au premier code lu.
 * Renvoie une fonction pour tout arrêter.
 */
export async function startScanner(video, onCode) {
  let stopped = false;
  let stream = null;
  let controls = null;
  const stop = () => {
    stopped = true;
    controls?.stop();
    stream?.getTracks().forEach((t) => t.stop());
  };
  const found = (code) => { if (!stopped) { stop(); onCode(code); } };
  if ('BarcodeDetector' in window) {
    const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    video.srcObject = stream;
    await video.play();
    const tick = async () => {
      if (stopped) return;
      try {
        const [hit] = await detector.detect(video);
        if (hit?.rawValue) return found(hit.rawValue);
      } catch { /* image pas prête */ }
      setTimeout(tick, 250);
    };
    tick();
  } else {
    const { BrowserMultiFormatReader } = await import(ZXING);
    const reader = new BrowserMultiFormatReader();
    controls = await reader.decodeFromConstraints({ video: { facingMode: 'environment' }, audio: false }, video, (result) => {
      if (result) found(result.getText());
    });
  }
  return stop;
}

/** Fiche produit Open Food Facts (null si inconnu). */
export async function lookupBarcode(code) {
  const fields = 'product_name,product_name_fr,generic_name_fr,brands,quantity,nutriscore_grade,image_front_small_url';
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`);
  if (!res.ok) return null;
  const j = await res.json();
  if (j.status !== 1 || !j.product) return null;
  const p = j.product;
  const name = (p.product_name_fr || p.product_name || p.generic_name_fr || '').trim();
  if (!name) return null;
  return {
    code,
    name,
    brand: (p.brands ?? '').split(',')[0].trim(),
    quantity: p.quantity ?? '',
    nutriscore: /^[a-e]$/.test(p.nutriscore_grade ?? '') ? p.nutriscore_grade.toUpperCase() : null,
    image: p.image_front_small_url ?? null,
  };
}
