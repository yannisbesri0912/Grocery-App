// Code-barres : caméra (ou photo) → code EAN → fiche Open Food Facts (nom,
// marque, contenance, Nutri-Score). Lecture par le détecteur du navigateur
// (BarcodeDetector, Android) ou par la bibliothèque ZXing (iPhone, ordinateur).
// On lit seulement la zone du cadre visé : c'est plus rapide, et le zoom
// (optique si le téléphone le permet, sinon numérique) agrandit cette zone.

const ZXING = 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm';
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

/** Clé de contrôle EAN-13 / EAN-8 / UPC-A correcte (écarte les lectures fausses). */
export function validEan(code) {
  if (!/^(\d{8}|\d{12}|\d{13})$/.test(code ?? '')) return false;
  const d = [...code].map(Number);
  const check = d.pop();
  const sum = d.reverse().reduce((t, x, i) => t + x * (i % 2 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === check;
}

// Décodeur d'une image (canvas) → code ou null.
let decoderPromise = null;
function getDecoder() {
  decoderPromise ??= (async () => {
    if ('BarcodeDetector' in window) {
      try {
        const supported = (await window.BarcodeDetector.getSupportedFormats?.()) ?? FORMATS;
        const formats = FORMATS.filter((f) => supported.includes(f));
        if (formats.length) {
          const det = new window.BarcodeDetector({ formats });
          return async (canvas) => (await det.detect(canvas))[0]?.rawValue ?? null;
        }
      } catch { /* détecteur inutilisable : ZXing */ }
    }
    const { BrowserMultiFormatOneDReader } = await import(ZXING);
    const reader = new BrowserMultiFormatOneDReader();
    return async (canvas) => { try { return reader.decodeFromCanvas(canvas).getText(); } catch { return null; } };
  })().catch((e) => { decoderPromise = null; throw e; });
  return decoderPromise;
}

const accept = (code) => (validEan(code) ? code : null);

/**
 * Caméra arrière dans `video`, lecture en continu de la zone du cadre.
 * onCode(ean) au premier code valide ; onSlow() si rien après quelques secondes.
 * Renvoie { stop, setZoom(z), maxZoom, hardZoom, torch(on) | null }.
 */
export async function startScanner(video, { onCode, onSlow }) {
  const decode = await getDecoder();
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: false,
  });
  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  video.muted = true;
  await video.play();
  const track = stream.getVideoTracks()[0];
  const caps = track.getCapabilities?.() ?? {};
  if (caps.focusMode?.includes('continuous')) track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
  const hw = caps.zoom && caps.zoom.max > caps.zoom.min ? caps.zoom : null;
  let zoom = 1;
  let stopped = false;
  const stop = () => { stopped = true; stream.getTracks().forEach((t) => t.stop()); };
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const started = Date.now();
  let slowSent = false;
  let n = 0;
  const tick = async () => {
    if (stopped) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw && vh) {
      // Zone lue : la bande du cadre (centre), réduite par le zoom numérique ;
      // une fois sur trois, l'image entière (code tenu de travers ou très près).
      const digital = hw ? 1 : zoom;
      const whole = n++ % 3 === 2;
      const cw = whole ? vw / digital : (vw * 0.85) / digital;
      const ch = whole ? vh / digital : Math.min(vh, vw * 0.5) / digital;
      canvas.width = Math.round(Math.min(cw, 1280));
      canvas.height = Math.round((canvas.width * ch) / cw);
      ctx.drawImage(video, (vw - cw) / 2, (vh - ch) / 2, cw, ch, 0, 0, canvas.width, canvas.height);
      const code = accept(await decode(canvas).catch(() => null));
      // Code lu : l'image reste figée dessus (la caméra s'arrête à la fermeture).
      if (code && !stopped) { stopped = true; video.pause(); onCode(code); return; }
      if (!slowSent && Date.now() - started > 8000) { slowSent = true; onSlow?.(); }
    }
    setTimeout(tick, 100);
  };
  tick();
  return {
    stop,
    hardZoom: Boolean(hw),
    maxZoom: hw ? Math.min(hw.max, 8) : 4,
    minZoom: hw ? hw.min : 1,
    setZoom(z) {
      zoom = z;
      if (hw) track.applyConstraints({ advanced: [{ zoom: Math.min(hw.max, Math.max(hw.min, z)) }] }).catch(() => {});
      else video.style.transform = `scale(${z})`;
    },
    torch: caps.torch ? (on) => track.applyConstraints({ advanced: [{ torch: on }] }).catch(() => {}) : null,
  };
}

/** Code-barres lu sur une photo (null si introuvable). */
export async function decodePhoto(file) {
  const decode = await getDecoder();
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    // Image entière réduite, puis centre en pleine définition, puis tournée d'un quart.
    const tries = [
      { sx: 0, sy: 0, sw: W, sh: H, max: 1600 },
      { sx: W * 0.2, sy: H * 0.25, sw: W * 0.6, sh: H * 0.5, max: 2000 },
      { sx: 0, sy: 0, sw: W, sh: H, max: 1600, rotate: true },
    ];
    for (const t of tries) {
      const k = Math.min(1, t.max / Math.max(t.sw, t.sh));
      const w = Math.round(t.sw * k);
      const h = Math.round(t.sh * k);
      canvas.width = t.rotate ? h : w;
      canvas.height = t.rotate ? w : h;
      ctx.save();
      if (t.rotate) { ctx.translate(h, 0); ctx.rotate(Math.PI / 2); }
      ctx.drawImage(img, t.sx, t.sy, t.sw, t.sh, 0, 0, w, h);
      ctx.restore();
      const code = accept(await decode(canvas).catch(() => null));
      if (code) return code;
    }
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Fiche produit Open Food Facts (null si inconnu ; lève une erreur si pas de connexion). */
export async function lookupBarcode(code) {
  const fields = 'product_name,product_name_fr,generic_name_fr,brands,quantity,nutriscore_grade,image_front_small_url';
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts : ${res.status}`);
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
