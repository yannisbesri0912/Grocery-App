// « Signaler un problème » : rapport technique à envoyer (WhatsApp, SMS…).
// Jamais d'adresse, de position, de montants ni de contenu de ticket sans accord.

const ERR_KEY = 'courses-opti:errors';

/** Garde les dernières erreurs de l'app (sans données personnelles). */
export function captureErrors() {
  const push = (msg, where = '') => {
    try {
      const list = JSON.parse(localStorage.getItem(ERR_KEY) ?? '[]');
      list.push({ t: new Date().toISOString().slice(0, 16), msg: String(msg).slice(0, 200), where: String(where).replace(/^https?:\/\/[^/]+/, '').slice(0, 80) });
      localStorage.setItem(ERR_KEY, JSON.stringify(list.slice(-15)));
    } catch { /* stockage plein ou bloqué */ }
  };
  window.addEventListener('error', (e) => push(e.message, `${e.filename}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => push(e.reason?.message ?? e.reason));
  return push;
}

export function lastErrors() {
  try { return JSON.parse(localStorage.getItem(ERR_KEY) ?? '[]'); } catch { return []; }
}

/**
 * Texte du rapport. info : { version, state, prices, catalogs, extra } fournis par l'app.
 * L'état est réduit à des compteurs et des réglages non personnels.
 */
export function buildReport({ what, version, state, prices, catalogs, receiptText }) {
  const nav = typeof navigator === 'undefined' ? {} : navigator;
  const has = (x) => (x ? 'oui' : 'non');
  const s = state ?? {};
  const settings = { ...(s.settings ?? {}) };
  for (const k of ['monthBudget', 'linkTemplates']) delete settings[k];
  const lines = [
    '🛒 Rapport Grocery Opti',
    `Problème : ${what?.trim() || '(non décrit)'}`,
    '',
    `Version : ${version ?? '?'} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    `Appareil : ${nav.userAgent ?? '?'}`,
    `Écran : ${typeof screen === 'undefined' ? '?' : `${screen.width}×${screen.height}`} · installée : ${has(typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches)} · langue : ${nav.language ?? '?'}`,
    `Possible : micro ${has(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition))} · caméra ${has(nav.mediaDevices?.getUserMedia)} · lecteur codes ${has(typeof window !== 'undefined' && 'BarcodeDetector' in window)} · partage ${has(nav.share)} · en ligne ${has(nav.onLine)}`,
    `Liste : ${s.list?.length ?? 0} produits · magasins : ${s.stores?.length ?? 0} (${[...new Set((s.stores ?? []).map((x) => x.chain))].join(', ')}) · adresse choisie : ${has(s.home)}`,
    `Onglet : ${s.tab ?? '?'} · réglages : ${JSON.stringify(settings).slice(0, 400)}`,
    `Prix : ${Object.entries(prices?.sources ?? {}).map(([c, v]) => `${c} ${v.date ?? '?'}${v.ok === false ? ' (échec)' : ''}`).join(', ') || 'non chargés'}`,
    `Catalogues chargés : ${catalogs?.join(', ') || 'aucun'}`,
    `Erreurs récentes : ${lastErrors().map((e) => `[${e.t}] ${e.msg} ${e.where}`).join(' | ') || 'aucune'}`,
  ];
  if (receiptText) lines.push('', 'Dernier ticket lu (texte) :', receiptText.slice(0, 2500));
  return lines.join('\n');
}
