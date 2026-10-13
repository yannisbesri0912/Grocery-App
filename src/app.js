import { CHAINS, COLLECT, DELIVERY, CATEGORIES, PRODUCTS } from './data.js';
import {
  MODES, DEFAULT_SETTINGS, optimize, priceInfo, mapsUrl, dueRecurring, learnFrequency, isOpen, haversineKm,
} from './optimizer.js';
import { geocodeAddress, reverseGeocode, currentPosition, findStores, todayHours } from './places.js';
import { SHOPS, orderLink } from './order.js';
import { searchCatalog, ROW, rowName } from './catalog.js';
import { tierOf, tierLabel, candidatesFromRows, productOptions, buildBasket } from './smart.js';
import { RECIPES, ING, TOOLS, TYPES, DIETS, compatible, formatAmount, pickDishes, addRecipes } from './recipes.js';
import { QUESTIONS, questionsFor, DEFAULT_PROFILE, staplesFor, servingsFor } from './questions.js';
import { parseSizes } from './matcher.js';
import { parseVoice } from './voice.js';
import { startScanner, lookupBarcode, decodePhoto, validEan } from './scan.js';
import { parseReceipt, detectChain } from './receipt.js';
import { openTuto } from './tuto.js';
import { RULES, PET_BABY } from './match-rules.js';
import { nameMatches } from './matcher.js';

// ---------- État (gardé sur le téléphone, jamais envoyé ailleurs) ----------
const KEY = 'courses-opti:v1';
const DAY = 86400000;

function defaults() {
  return {
    tab: 'list',
    list: [], // { id, qty, checked }
    recurring: [], // { id, every, last }
    overrides: {}, // { productId: { chain: prix } } prix saisis à la main
    custom: [], // produits ajoutés par l'utilisateur
    chainIndex: {}, // indices de prix modifiés
    settings: {
      ...DEFAULT_SETTINGS, autoAdd: true, radiusKm: 3, reminderDay: 6, reminderTime: '10:00',
      planMode: 'collect', // retrait Collect en priorité
      collect: { colruyt: { fee: COLLECT.colruyt.fee, minOrder: COLLECT.colruyt.minOrder }, delhaize: { fee: COLLECT.delhaize.fee, minOrder: COLLECT.delhaize.minOrder } },
    },
    home: null, // { address, lat, lng } : choisi par l'utilisateur
    stores: [], // supermarchés trouvés autour du domicile
    history: [],
  };
}

// Anciennes versions : une adresse et des magasins étaient pré-remplis.
// On les efface pour repartir de l'adresse choisie par l'utilisateur.
function migrate(saved) {
  const d = defaults();
  const s = { ...d, ...saved, settings: { ...d.settings, ...saved.settings } };
  s.settings.collect = { ...d.settings.collect, ...(saved.settings?.collect ?? {}) };
  const legacy = !Array.isArray(saved.stores); // les anciennes versions n'avaient pas de magasins trouvés
  if (legacy) { s.home = null; s.stores = []; }
  delete s.coords; delete s.geocoded; delete s.geocodeTried;
  s.settings.excluded = (s.settings.excluded ?? []).filter((id) => !/^(colruyt-|carrefourx-|aldi-|delhaize-|lidl-)/.test(id));
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch { /* stockage indisponible */ }
  return defaults();
}

let state = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

// ---------- Vrais prix (data/prices.json, mis à jour chaque nuit) ----------
let PRICES = { items: {}, sources: {} };
async function loadPrices() {
  try {
    const res = await fetch('data/prices.json', { cache: 'no-cache' });
    if (res.ok) PRICES = await res.json();
  } catch { /* hors ligne : estimations */ }
  render();
}

// ---------- Catalogues complets (data/catalog-<enseigne>.json) ----------
// Chargés à la première recherche, ou au démarrage si la liste contient déjà
// des articles du catalogue (pour mettre leur prix à jour).
// Colruyt sert aussi au panier malin et aux plats ; Delhaize et Aldi à la recherche.
const CATALOG_CHAINS = ['colruyt', 'delhaize', 'aldi'];
const CATALOGS = {}; // enseigne → { date, rows }
let CATALOG = null; // Colruyt
let catalogLoading = null;
const otherLoading = {};
// Même article chez Colruyt et Delhaize (data/same.json, calculé chaque nuit).
let SAME = null; // { colruyt: Map(id → id Delhaize), delhaize: Map(id → id Colruyt) }
let sameLoading = null;
function twinOf(chain, id) {
  const other = chain === 'colruyt' ? 'delhaize' : chain === 'delhaize' ? 'colruyt' : null;
  const tid = other && SAME?.[chain].get(id);
  const r = tid != null ? rowById(other, tid) : null;
  return r ? { chain: other, r } : null;
}
const rowUrl = (chain, r) => (r[ROW.url] ? new URL(r[ROW.url], `https://www.${CHAINS[chain].domain}`).href : undefined);
function loadOtherCatalogs() {
  sameLoading ??= fetch('data/same.json', { cache: 'no-cache' }).then((res) => (res.ok ? res.json() : null)).then((data) => {
    if (!data?.pairs) return;
    SAME = { colruyt: new Map(data.pairs.map(([c, d]) => [c, d])), delhaize: new Map(data.pairs.map(([c, d]) => [d, c])) };
    rerenderArticles();
  }).catch(() => { sameLoading = null; });
  for (const chain of CATALOG_CHAINS.slice(1)) {
    otherLoading[chain] ??= fetch(`data/catalog-${chain}.json`, { cache: 'no-cache' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.rows) return;
        CATALOGS[chain] = data;
        refreshCatalogPrices();
        rerenderArticles();
        if (search.trim()) { const r = document.getElementById('results'); if (r) r.innerHTML = searchResults(); }
      })
      .catch(() => { otherLoading[chain] = null; });
  }
  return Promise.all(Object.values(otherLoading));
}
// Nouvelles données de comparaison : on redessine si la liste contient des articles précis
// (pas pendant une saisie dans la recherche).
function rerenderArticles() {
  if (state.custom.some(isArticle) && !search.trim()) render();
}
function rowById(chain, id) {
  const cat = CATALOGS[chain];
  if (!cat) return null;
  cat.byId ??= new Map(cat.rows.map((r) => [r[ROW.id], r]));
  return cat.byId.get(id) ?? null;
}
// Recherche dans tous les catalogues : les meilleurs de chaque enseigne, en alternance.
function searchAll(query, perChain = 6) {
  const lists = CATALOG_CHAINS.filter((c) => CATALOGS[c]).map((c) => searchCatalog(CATALOGS[c].rows, query, perChain).map((r) => ({ chain: c, r })));
  const out = [];
  for (let i = 0; i < perChain; i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
}
function loadCatalog() {
  loadOtherCatalogs();
  catalogLoading ??= fetch('data/catalog-colruyt.json', { cache: 'no-cache' })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data?.rows) return;
      CATALOG = data;
      CATALOGS.colruyt = data;
      ingCache.clear();
      refreshCatalogPrices();
      rerenderArticles();
      if (search.trim()) { const r = document.getElementById('results'); if (r) r.innerHTML = searchResults(); }
    })
    .catch(() => { catalogLoading = null; });
  return catalogLoading;
}

// Prix du jour pour les articles ajoutés depuis le catalogue.
function refreshCatalogPrices() {
  let changed = false;
  for (const p of state.custom) {
    const key = p.colruyt ? 'colruyt' : p.shop ? 'shop' : null;
    const chain = p.colruyt ? 'colruyt' : p.shop?.chain;
    if (!key || !CATALOGS[chain]) continue;
    const r = rowById(chain, p[key].id);
    const next = r ? { ...p[key], price: r[ROW.price], promo: r[ROW.promo], date: CATALOGS[chain].date, gone: false } : { ...p[key], gone: true };
    if (JSON.stringify(next) !== JSON.stringify(p[key])) { p[key] = next; changed = true; }
  }
  if (changed) { save(); render(); }
}

// Article précis d'un catalogue → produit de la liste.
function catalogProduct(r, chain = 'colruyt') {
  const nutri = r[ROW.nutri] || undefined;
  if (chain !== 'colruyt') {
    const content = r[ROW.content] && !norm(r[ROW.name]).includes(norm(r[ROW.content])) ? ` ${r[ROW.content]}` : '';
    return {
      id: `${chain}-${r[ROW.id]}`, name: `${r[ROW.name]}${content}`, cat: r[ROW.cat], custom: true, nutri,
      // Prix de référence (indice 100) : les autres enseignes sont estimées à partir de lui.
      ref: Math.round((r[ROW.price] * 100 / (CHAINS[chain]?.index ?? 100)) * 100) / 100,
      shop: { chain, id: r[ROW.id], price: r[ROW.price], promo: r[ROW.promo], url: rowUrl(chain, r), date: CATALOGS[chain]?.date },
    };
  }
  const weight = r[ROW.weight] === 1;
  const name = `${rowName(r)}${r[ROW.content] ? ` ${r[ROW.content]}` : ''}${weight ? ' (1 kg)' : ''}`;
  return {
    id: `col-${r[ROW.id]}`, name, cat: r[ROW.cat], ref: r[ROW.price], custom: true, nutri,
    colruyt: { id: r[ROW.id], price: r[ROW.price], promo: r[ROW.promo], date: CATALOG?.date },
  };
}
const isArticle = (p) => Boolean(p.colruyt || p.shop);

// Vrais prix : relevés de la nuit + articles des catalogues ajoutés à la liste.
function realPrices() {
  const real = { ...(PRICES.items ?? {}) };
  for (const p of state.custom) {
    const entry = {};
    if (p.colruyt && !p.colruyt.gone) entry.colruyt = { price: p.colruyt.price, ...(p.colruyt.promo ? { promo: true } : {}) };
    if (p.shop && !p.shop.gone) entry[p.shop.chain] = { price: p.shop.price, article: p.name, url: p.shop.url, ...(p.shop.promo ? { promo: true } : {}) };
    // Comparaison automatique : le même article dans l'autre enseigne, à son vrai prix.
    const tw = p.colruyt ? twinOf('colruyt', p.colruyt.id) : p.shop ? twinOf(p.shop.chain, p.shop.id) : null;
    if (tw && !entry[tw.chain]) entry[tw.chain] = { price: tw.r[ROW.price], article: rowName(tw.r), url: rowUrl(tw.chain, tw.r), ...(tw.r[ROW.promo] ? { promo: true } : {}) };
    if (Object.keys(entry).length) real[p.id] = entry;
  }
  return real;
}

// ---------- Ajout à la voix et par code-barres ----------
// Meilleur produit pour un nom dicté ou lu : produit général, sinon article Colruyt.
function bestMatch(name) {
  // Mot entier (« lait » ne doit pas trouver « laitue »), pluriel accepté.
  const q = norm(name).replace(/[sx]\b/g, '').replace(/[^a-z0-9 ]/g, '').trim();
  const re = new RegExp(`(^|[^a-z])${q}[sx]?([^a-z]|$)`);
  const generic = q && allProducts().find((p) => !isArticle(p) && re.test(norm(p.name)));
  if (generic) return { product: generic };
  const [r] = CATALOG ? searchCatalog(CATALOG.rows, name, 1) : [];
  return r ? { row: r } : null;
}

function addItem(match, qty = 1) {
  let p = match.product;
  if (match.row) {
    p = catalogProduct(match.row, match.chain);
    if (!state.custom.some((c) => c.id === p.id)) state.custom.push(p);
  }
  const it = state.list.find((l) => l.id === p.id);
  if (it) it.qty += qty; else state.list.push({ id: p.id, qty, checked: false });
  return p;
}

// Dictée : reconnaissance vocale du navigateur quand elle marche ; sinon la
// phrase se tape, ou se dicte avec le micro du clavier. On montre toujours ce
// qui va être ajouté avant d'ajouter.
function dictate() {
  if (!CATALOG) loadCatalog();
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const KEYBOARD = 'Touche la zone de texte, puis le micro 🎤 de ton clavier pour dicter.';
  const wrap = document.createElement('div');
  wrap.className = 'modal';
  wrap.innerHTML = `<div class="modal-box voice-box" role="dialog" aria-modal="true" aria-label="Dicter des produits">
    <div class="row"><b class="grow">Dicter des produits</b><button class="btn ghost small" data-v="close" aria-label="Fermer">${icon('x')}</button></div>
    <button class="voice-orb" data-v="listen" aria-label="Parler">${icon('mic')}</button>
    <p class="voice-state" aria-live="polite"></p>
    <textarea id="voice-text" rows="2" placeholder="Ex. : 2 litres de lait, des œufs et du pain" aria-label="Ce que tu veux ajouter"></textarea>
    <ul class="items voice-preview"></ul>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-v="close">Annuler</button><button class="btn primary" data-v="add" disabled>Ajouter</button></div>
  </div>`;
  document.body.append(wrap);
  const $ = (s) => wrap.querySelector(s);
  const ta = $('#voice-text');
  const orb = $('.voice-orb');
  const setState = (t, warn = false) => { $('.voice-state').textContent = t; $('.voice-state').classList.toggle('warn', warn); };
  let items = [];
  const preview = () => {
    items = parseVoice(ta.value).map((x) => ({ ...x, m: bestMatch(x.name) }));
    $('.voice-preview').innerHTML = items.map((x) => `<li><span class="name">${x.m
      ? `${x.qty > 1 ? `${x.qty} × ` : ''}${esc((x.m.product?.name ?? rowName(x.m.row)).replace(/\s*\(.*\)$/, ''))}`
      : `<span class="muted">« ${esc(x.name)} » : pas trouvé</span>`}</span>${x.m ? icon('check') : ''}</li>`).join('');
    $('[data-v=add]').disabled = !items.some((x) => x.m);
  };
  loadCatalog().then(() => { if (ta.value.trim()) preview(); });
  ta.addEventListener('input', preview);

  let rec = null;
  let listening = false;
  const ERRORS = {
    'not-allowed': 'Micro refusé. Autorise-le dans les réglages du téléphone (Safari › Micro), ou dicte avec le clavier :',
    'no-speech': 'Je n\'ai rien entendu. Touche le micro pour réessayer, ou dicte avec le micro 🎤 du clavier dans la zone de texte.',
    'audio-capture': 'Aucun micro trouvé.',
  };
  const listen = () => {
    if (listening) { rec.stop(); return; }
    if (!SR) { setState(KEYBOARD); ta.focus(); return; }
    let error = null;
    const before = ta.value.trim();
    rec = new SR();
    rec.lang = 'fr-BE';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => { rec.started = true; listening = true; orb.classList.add('on'); setState('Je t\'écoute… parle maintenant'); };
    rec.onresult = (e) => {
      const said = [...e.results].map((r) => r[0].transcript).join(' ').trim();
      ta.value = [before, said].filter(Boolean).join(', ');
      preview();
    };
    rec.onerror = (e) => { error = e.error; };
    rec.onend = () => {
      rec.ended = true;
      listening = false;
      orb.classList.remove('on');
      if (error === 'aborted') return;
      if (error && error !== 'no-speech') {
        setState(`${ERRORS[error] ?? 'La dictée de l\'app ne marche pas sur ce téléphone.'} ${error === 'not-allowed' ? '' : KEYBOARD}`, true);
        ta.focus();
      } else if (ta.value.trim() !== before) setState('Vérifie la liste puis touche « Ajouter ». Touche le micro pour en dire plus.');
      else setState(ERRORS['no-speech'], true);
    };
    try { rec.start(); setState('Démarrage du micro…'); } catch { setState(KEYBOARD, true); ta.focus(); return; }
    // Certains téléphones acceptent la dictée mais le micro ne démarre jamais.
    setTimeout(() => {
      if (listening || error || rec.started || rec.ended) return;
      try { rec.abort(); } catch { /* déjà arrêté */ }
      setState(`Le micro de l'app ne répond pas. ${KEYBOARD}`, true);
      ta.focus();
    }, 4000);
  };
  const close = () => { try { rec?.abort(); } catch { /* déjà arrêté */ } wrap.remove(); };
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap) return close();
    const v = e.target.closest('[data-v]')?.dataset.v;
    if (v === 'close') close();
    else if (v === 'listen') listen();
    else if (v === 'add') {
      const added = items.filter((x) => x.m).map((x) => `${x.qty > 1 ? `${x.qty} × ` : ''}${addItem(x.m, x.qty).name.replace(/\s*\(.*\)$/, '')}`);
      save();
      render();
      toast(`Ajouté : ${added.join(', ')}`);
      close();
    }
  });
  if (SR) listen(); else { setState(KEYBOARD); orb.classList.add('off'); }
}

// Petit bip et vibration quand un code est lu.
function beep() {
  navigator.vibrate?.(80);
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)();
    const o = a.createOscillator();
    const g = a.createGain();
    o.frequency.value = 1300;
    g.gain.value = 0.06;
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + 0.12);
    o.onended = () => a.close();
  } catch { /* pas de son */ }
}

function scan() {
  if (!CATALOG) loadCatalog();
  loadOtherCatalogs();
  const HELP = 'Mets les barres dans le cadre, à 10–20 cm. Le cadre devient vert quand le code est lu.';
  const wrap = document.createElement('div');
  wrap.className = 'modal';
  wrap.innerHTML = `<div class="modal-box scan-box" role="dialog" aria-modal="true" aria-label="Scanner un code-barres">
    <div class="row"><b class="grow scan-title">Scanner un code-barres</b><button class="btn ghost small" data-s="close" aria-label="Fermer">${icon('x')}</button></div>
    <div class="scan-view"><video playsinline muted></video><div class="scan-frame"><i class="scan-line"></i></div><span class="scan-chip">Démarrage de la caméra…</span></div>
    <div class="scan-tools"><span class="small muted">Zoom</span><input type="range" class="scan-zoom" min="1" max="4" step="0.1" value="1" aria-label="Zoom"><b class="scan-zval num">1×</b>
      <button class="btn soft small scan-torch" data-s="torch" hidden aria-pressed="false">Lampe</button></div>
    <p class="scan-help small muted">${HELP}</p>
    <div class="scan-result" aria-live="polite"></div>
    <div class="row scan-alt"><label class="btn soft small">${icon('scan')} Prendre une photo<input type="file" accept="image/*" capture="environment" hidden class="scan-photo"></label>
      <button class="btn ghost small" data-s="type">Taper le code</button></div>
    <form class="scan-type row" hidden><input inputmode="numeric" autocomplete="off" maxlength="13" placeholder="Les 13 chiffres sous les barres" aria-label="Code-barres"><button class="btn primary small">OK</button></form>
  </div>`;
  document.body.append(wrap);
  const $ = (s) => wrap.querySelector(s);
  const box = $('.scan-box');
  const video = $('video');
  const chip = (t) => { $('.scan-chip').textContent = t; };
  let scanner = null;
  let done = false;
  let info = null;
  const close = () => { done = true; scanner?.stop(); wrap.remove(); };
  const setMode = (m) => { box.dataset.mode = m; };

  async function startCam() {
    scanner?.stop();
    done = false;
    $('.scan-type').hidden = true;
    info = null;
    setMode('scan');
    $('.scan-result').innerHTML = '';
    $('.scan-help').textContent = HELP;
    $('.scan-help').classList.remove('warn');
    chip('Démarrage de la caméra…');
    if (!navigator.mediaDevices?.getUserMedia) { noCamera('Caméra indisponible sur ce navigateur.'); return; }
    try {
      scanner = await startScanner(video, {
        onCode: (code) => found(code),
        onSlow: () => {
          $('.scan-help').textContent = 'Toujours rien ? Éloigne un peu le téléphone pour que l\'image soit nette, monte le zoom, allume la lampe… ou prends une photo.';
          $('.scan-help').classList.add('warn');
        },
      });
      if (done) { scanner.stop(); return; }
      chip('Recherche d\'un code…');
      const z = $('.scan-zoom');
      z.min = scanner.minZoom;
      z.max = scanner.maxZoom;
      z.value = scanner.minZoom;
      $('.scan-zval').textContent = `${Number(z.value).toFixed(1).replace('.0', '')}×`;
      $('.scan-torch').hidden = !scanner.torch;
    } catch (e) {
      noCamera(e?.name === 'NotAllowedError'
        ? 'Accès à la caméra refusé. Autorise-le dans les réglages du téléphone, ou prends une photo du code.'
        : e?.name === 'NotFoundError' ? 'Aucune caméra trouvée.' : 'Le lecteur de codes n\'a pas pu démarrer (connexion ?). Prends une photo ou tape le code.');
    }
  }
  function noCamera(msg) {
    setMode('nocam');
    $('.scan-help').textContent = msg;
    $('.scan-help').classList.add('warn');
  }
  const setZoom = (z) => {
    const r = $('.scan-zoom');
    const v = Math.min(Number(r.max), Math.max(Number(r.min), z));
    r.value = v;
    $('.scan-zval').textContent = `${v.toFixed(1).replace('.0', '')}×`;
    scanner?.setZoom(v);
  };

  async function found(code) {
    beep();
    setMode('found');
    chip(`✓ Code lu : ${code}`);
    $('.scan-help').classList.remove('warn');
    $('.scan-help').textContent = '';
    $('.scan-result').innerHTML = '<p class="small"><span class="spinner"></span> Je cherche ce produit…</p>';
    try {
      info = await lookupBarcode(code);
    } catch {
      $('.scan-result').innerHTML = `<p class="small warn">Code ${esc(code)} bien lu, mais pas de connexion à la base produits.</p>
        <div class="row"><button class="btn primary small" data-s="retry" data-code="${esc(code)}">Réessayer</button><button class="btn ghost small" data-s="again">Scanner un autre</button></div>`;
      return;
    }
    await loadCatalog();
    if (!info) {
      $('.scan-result').innerHTML = `<p class="small">Code <b>${esc(code)}</b> bien lu ✓, mais ce produit n'est pas encore dans la base libre Open Food Facts.</p>
        <div class="row"><button class="btn primary small" data-s="byname">Chercher par son nom</button><button class="btn ghost small" data-s="again">Scanner un autre</button></div>`;
      return;
    }
    await loadOtherCatalogs();
    const brand = norm(info.brand);
    const rows = searchAll(info.name, 4);
    const hasBrand = (x) => Boolean(brand) && norm(rowName(x.r)).includes(brand);
    rows.sort((a, b) => hasBrand(b) - hasBrand(a));
    const generic = bestMatch(info.name)?.product;
    const choices = [
      ...(generic ? [`<button class="btn soft block" data-pick='${esc(JSON.stringify({ id: generic.id }))}'>${esc(generic.name)} · produit général</button>`] : []),
      ...rows.slice(0, 4).map(({ chain, r }) => `<button class="btn block row" style="gap:8px" data-pick='${esc(JSON.stringify({ row: r[ROW.id], chain, nutri: info.nutriscore ?? undefined }))}'>${logo(chain, 'sm')}<span class="grow" style="text-align:left">${esc(rowName(r))}</span><b class="num">${eur(r[ROW.price])}</b></button>`),
    ];
    scanner?.stop();
    setMode('result');
    $('.scan-title').textContent = 'Produit trouvé';
    $('.scan-result').innerHTML = `<div class="row" style="gap:10px">${info.image ? `<img src="${esc(info.image)}" alt="" style="width:56px;height:56px;object-fit:contain;border-radius:8px;background:#fff">` : ''}
        <div class="grow"><b>${esc(info.name)}</b><br><span class="muted small">${esc([info.brand, info.quantity].filter(Boolean).join(' · '))}</span></div>
        ${info.nutriscore ? `<span class="nutri n${info.nutriscore}" title="Nutri-Score">${info.nutriscore}</span>` : ''}</div>
      <p class="small">${choices.length ? 'Choisis ce que tu ajoutes à ta liste :' : 'Pas trouvé dans les catalogues des magasins.'}</p><div class="stack" style="gap:6px">${choices.join('')}</div>
      <div class="row">${choices.length ? '' : '<button class="btn primary small" data-s="byname">Chercher par son nom</button>'}<button class="btn ghost small" data-s="again">Scanner un autre</button></div>
      <p class="tiny muted">Données <a href="https://world.openfoodfacts.org/product/${esc(code)}" target="_blank" rel="noopener">Open Food Facts</a> (ODbL).</p>`;
  }

  wrap.addEventListener('click', (e) => {
    if (e.target === wrap) return close();
    const pickBtn = e.target.closest('[data-pick]');
    if (pickBtn) {
      const pick = JSON.parse(pickBtn.dataset.pick);
      const m = pick.id ? { product: productById(pick.id) } : { row: rowById(pick.chain, pick.row), chain: pick.chain };
      const p = addItem(m, 1);
      if (pick.nutri && !p.nutri) p.nutri = pick.nutri;
      save();
      render();
      toast(`${p.name} ajouté`);
      close();
      return;
    }
    const b = e.target.closest('[data-s]');
    if (!b) return;
    const s = b.dataset.s;
    if (s === 'close') close();
    else if (s === 'again') { $('.scan-title').textContent = 'Scanner un code-barres'; startCam(); }
    else if (s === 'retry') found(b.dataset.code);
    else if (s === 'type') { $('.scan-type').hidden = false; $('.scan-type input').focus(); }
    else if (s === 'torch') { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); scanner?.torch?.(on); }
    else if (s === 'byname') {
      const name = info?.name ?? '';
      close();
      search = name;
      setTab('list');
      const input = document.getElementById('search');
      if (input) { input.focus(); if (name) { const r = document.getElementById('results'); if (r) r.innerHTML = searchResults(); } }
    }
  });
  $('.scan-zoom').addEventListener('input', (e) => setZoom(Number(e.target.value)));
  // Pincer avec deux doigts sur l'image pour zoomer.
  let pinch = null;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  $('.scan-view').addEventListener('touchstart', (e) => { if (e.touches.length === 2) pinch = { d: dist(e.touches), z: Number($('.scan-zoom').value) }; }, { passive: true });
  $('.scan-view').addEventListener('touchmove', (e) => { if (pinch && e.touches.length === 2) { e.preventDefault(); setZoom(pinch.z * (dist(e.touches) / pinch.d)); } }, { passive: false });
  $('.scan-view').addEventListener('touchend', () => { pinch = null; });
  $('.scan-photo').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    scanner?.stop();
    setMode('nocam');
    $('.scan-help').classList.remove('warn');
    $('.scan-help').innerHTML = '<span class="spinner"></span> Lecture de la photo…';
    const code = await decodePhoto(file).catch(() => null);
    if (code) found(code);
    else {
      $('.scan-help').textContent = 'Pas de code-barres trouvé sur la photo. Reprends-la de plus près, bien nette, le code droit et en entier.';
      $('.scan-help').classList.add('warn');
    }
  });
  $('.scan-type').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = $('.scan-type input').value.replace(/\D/g, '');
    if (validEan(code)) { $('.scan-type').hidden = true; found(code); }
    else { $('.scan-help').textContent = 'Code incomplet ou erroné : tape les 13 chiffres écrits sous les barres.'; $('.scan-help').classList.add('warn'); }
  });
  startCam();
}

// ---------- Ticket de caisse ----------
const TESSERACT = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some((x) => x.src === src)) return resolve();
    const el = document.createElement('script');
    el.src = src; el.onload = resolve; el.onerror = reject;
    document.head.append(el);
  });
}

// Ligne du ticket → produit de l'app (règles FR/NL), sinon article du catalogue.
function receiptMatch(name, chain) {
  const p = PRODUCTS.find((x) => RULES[x.id] && nameMatches(RULES[x.id], name, PET_BABY));
  if (p) return { id: p.id, label: p.name };
  // Catalogue du magasin du ticket s'il est connu, sinon Colruyt.
  const c = CATALOGS[chain] ? chain : 'colruyt';
  const [r] = CATALOGS[c] ? searchCatalog(CATALOGS[c].rows, name, 1) : [];
  return r ? { row: r[ROW.id], chain: c, label: rowName(r) } : null;
}

let receipt = null; // { chain, items: [{ name, qty, price, total, match, use }], total }

async function readReceipt(file) {
  const box = document.createElement('div');
  box.className = 'modal';
  box.innerHTML = '<div class="modal-box"><p><b>Lecture du ticket…</b></p><div class="progress" style="background:var(--surface-2)"><span style="width:2%"></span></div><p class="small muted">Tout se passe sur ton téléphone. La première fois, le module de lecture (~10 Mo) se télécharge.</p></div>';
  document.body.append(box);
  const bar = box.querySelector('.progress span');
  try {
    await Promise.all([loadScript(TESSERACT), loadCatalog(), loadOtherCatalogs()]);
    const { data } = await window.Tesseract.recognize(file, 'fra+nld', {
      logger: (m) => { if (m.status === 'recognizing text') bar.style.width = `${Math.round(m.progress * 100)}%`; },
    });
    const parsed = parseReceipt(data.text);
    if (!parsed.items.length) { toast('Ticket illisible : reprends la photo bien à plat, avec de la lumière'); return; }
    const chain = detectChain(data.text) ?? state.stores[0]?.chain ?? 'colruyt';
    receipt = { chain, total: parsed.total, items: parsed.items.map((it) => ({ ...it, match: receiptMatch(it.name, chain), use: true })) };
    receiptView();
  } catch {
    toast('Lecture impossible (connexion ?) : réessaie');
  } finally {
    box.remove();
  }
}

function receiptView() {
  const wrap = document.createElement('div');
  wrap.className = 'modal';
  const sum = receipt.items.reduce((t, i) => t + i.total, 0);
  wrap.innerHTML = `<div class="modal-box receipt-box" role="dialog" aria-modal="true">
    <p><b>Vérifie ton ticket</b></p>
    <label class="field"><span>Magasin</span><select id="receipt-chain">${Object.entries(CHAINS).map(([k, c]) => `<option value="${k}" ${k === receipt.chain ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    <ul class="items">${receipt.items.map((it, i) => `<li>
      <input type="checkbox" class="check" data-ri="${i}" ${it.use ? 'checked' : ''} aria-label="Garder">
      <span class="name">${it.qty > 1 ? `${it.qty} × ` : ''}${esc(it.name)}<span class="sub">${it.match ? `→ ${esc(it.match.label)}` : 'pas reconnu (compté dans le total seulement)'}</span></span>
      <span class="num">${eur(it.total)}</span></li>`).join('')}</ul>
    <p class="small">Total lu : <b>${eur(receipt.total ?? sum)}</b>${receipt.total && Math.abs(receipt.total - sum) > 0.05 ? ` (articles : ${eur(sum)})` : ''}</p>
    <p class="tiny muted">« Appliquer » : le montant va dans ton budget, les articles reconnus sortent de ta liste, leurs prix sont corrigés pour ce magasin et tes achats réguliers deviennent des habitudes.</p>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-r="0">Annuler</button><button class="btn primary" data-r="1">Appliquer</button></div></div>`;
  document.body.append(wrap);
  wrap.addEventListener('change', (e) => {
    if (e.target.dataset.ri != null) receipt.items[Number(e.target.dataset.ri)].use = e.target.checked;
    if (e.target.id === 'receipt-chain') receipt.chain = e.target.value;
  });
  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('[data-r]');
    if (!b) return;
    if (b.dataset.r === '1') applyReceipt();
    wrap.remove();
  });
}

function applyReceipt() {
  const today = new Date().toISOString().slice(0, 10);
  const { chain } = receipt;
  const used = receipt.items.filter((i) => i.use);
  let corrected = 0;
  state.purchases ??= {};
  for (const it of used) {
    if (!it.match) continue;
    let pid = it.match.id;
    if (!pid && it.match.row) {
      const r = rowById(it.match.chain, it.match.row);
      if (!r) continue;
      const p = catalogProduct(r, it.match.chain);
      if (!state.custom.some((c) => c.id === p.id)) state.custom.push(p);
      pid = p.id;
    }
    // Prix corrigé pour ce magasin, ramené au format du produit de l'app.
    const rule = RULES[pid];
    if (rule) {
      const size = parseSizes(it.name).find((x) => x.unit === rule.size[1]);
      const factor = size ? rule.size[0] / size.amount : (rule.size[1] === 'pc' && rule.size[0] === 1 ? 1 : null);
      if (factor && factor > 0.2 && factor < 5) {
        state.overrides[pid] = { ...(state.overrides[pid] ?? {}), [chain]: Math.round(it.price * factor * 100) / 100 };
        corrected++;
      }
    }
    // Retiré de la liste.
    const li = state.list.find((l) => l.id === pid);
    if (li) li.qty -= it.qty;
    // Habitudes : rachat régulier → produit habituel.
    const dates = [...(state.purchases[pid] ?? []), today].slice(-6);
    state.purchases[pid] = dates;
    const rec = state.recurring.find((r) => r.id === pid);
    if (rec) Object.assign(rec, learnFrequency(rec, today));
    else if (dates.length >= 2) {
      const gaps = dates.slice(1).map((d, i) => (new Date(d) - new Date(dates[i])) / DAY).filter((g) => g >= 2);
      if (gaps.length) state.recurring.push({ id: pid, every: Math.round(gaps.reduce((a, g) => a + g, 0) / gaps.length), last: today });
    }
  }
  state.list = state.list.filter((l) => l.qty > 0);
  const sum = Math.round(used.reduce((t, i) => t + i.total, 0) * 100) / 100;
  state.history.unshift({ date: today, label: `Ticket ${CHAINS[chain]?.name ?? ''}`.trim(), total: sum, paid: receipt.total ?? sum, saving: 0, items: used.length });
  receipt = null;
  save();
  render();
  toast(`Ticket enregistré · ${corrected} prix corrigé${corrected > 1 ? 's' : ''}`);
}

// ---------- Utilitaires ----------
const eur = (x) => x.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => s.replace(/œ/gi, 'oe').replace(/æ/gi, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const dateFr = (iso) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' }) : '');
const allProducts = () => [...PRODUCTS, ...state.custom];
const productById = (id) => allProducts().find((p) => p.id === id);
const chains = () => Object.fromEntries(Object.entries(CHAINS).map(([k, c]) => [k, { ...c, index: state.chainIndex[k] ?? c.index }]));
const kmFromHome = (s) => (state.home ? haversineKm(state.home, s) * state.settings.detour : null);

const ICONS = {
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  pin: '<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  gps: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 3v12M7 8l5-5 5 5"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  cart: '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20.5" r="1.2"/><circle cx="17" cy="20.5" r="1.2"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  scan: '<path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M8 8v8M11 8v8M14 8v8M17 8v8"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h12v4"/><path d="M3 7v11a2 2 0 0 0 2 2h14V9H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="14.5" r="1.2"/>',
  chef: '<path d="M6 13h12v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M6 13a4 4 0 0 1 1-7.9A5 5 0 0 1 17 5.1 4 4 0 0 1 18 13"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
};
const icon = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

// Logo de l'enseigne (icône officielle de son site ; initiale colorée en secours).
function logo(chain, size = '') {
  const c = CHAINS[chain] ?? { name: '?', color: '#888' };
  const img = c.domain ? `<img src="https://www.google.com/s2/favicons?domain=${c.domain}&sz=64" alt="" loading="lazy" onerror="this.remove()">` : '';
  return `<span class="logo ${size}" style="--c:${c.color}" title="${esc(c.name)}">${esc(c.name[0])}${img}</span>`;
}

const KIND = {
  promo: '<span class="pill promo">promo</span>',
  estimate: '<span class="pill warn">approx.</span>',
  user: '<span class="pill">ton prix</span>',
  real: '',
};

// Points de retrait : chaque Colruyt / Delhaize trouvé peut servir de retrait Collect.
function collectPoints() {
  const ex = new Set(state.settings.excluded);
  return state.stores.filter((st) => COLLECT[st.chain] && !ex.has(st.id)).map((st) => {
    const c = { ...COLLECT[st.chain], ...(state.settings.collect?.[st.chain] ?? {}) };
    return { ...st, id: `${st.id}#collect`, storeId: st.id, placeName: st.name, name: `${c.name} · ${st.name}`, collect: c };
  });
}

function computePlans() {
  return optimize({
    items: state.list,
    products: allProducts(),
    stores: [...state.stores, ...collectPoints()],
    delivery: DELIVERY,
    chains: chains(),
    overrides: state.overrides,
    real: realPrices(),
    home: state.home,
    settings: state.settings,
  });
}

function autoAddDue({ silent } = {}) {
  const due = dueRecurring(state.recurring).filter((r) => !state.list.some((l) => l.id === r.id));
  if (!due.length) return 0;
  for (const r of due) state.list.push({ id: r.id, qty: 1, checked: false });
  save();
  if (!silent) toast(`${due.length} produit${due.length > 1 ? 's' : ''} habituel${due.length > 1 ? 's' : ''} ajouté${due.length > 1 ? 's' : ''}`);
  return due.length;
}

// ---------- Interface ----------
const view = document.getElementById('view');
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function setTab(tab) {
  state.tab = tab;
  save();
  render();
  window.scrollTo(0, 0);
}

function ask(message, { input = null, text = null, ok = 'OK', cancel = 'Annuler' } = {}) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true">
      <p>${esc(message)}</p>
      ${input != null ? `<input type="text" id="ask-input" inputmode="decimal" value="${esc(input)}">` : ''}
      ${text != null ? `<textarea id="ask-text" readonly rows="8">${esc(text)}</textarea>` : ''}
      <div class="row" style="justify-content:flex-end">
        ${cancel ? `<button class="btn ghost" data-r="0">${esc(cancel)}</button>` : ''}
        <button class="btn primary" data-r="1">${esc(ok)}</button>
      </div></div>`;
    const close = (val) => { wrap.remove(); resolve(val); };
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (b) close(b.dataset.r === '1' ? (input != null ? wrap.querySelector('#ask-input').value : true) : null);
      else if (e.target === wrap) close(null);
    });
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close(null);
      if (e.key === 'Enter' && e.target.id === 'ask-input') close(e.target.value);
    });
    document.body.append(wrap);
    (wrap.querySelector('#ask-input') ?? wrap.querySelector('[data-r="1"]')).focus();
    wrap.querySelector('#ask-text')?.select();
  });
}

const TABS = [
  ['list', 'list', 'Liste'],
  ['plats', 'chef', 'Plats'],
  ['plan', 'route', 'Plan'],
  ['recurring', 'wallet', 'Budget'],
  ['prices', 'tag', 'Prix'],
  ['settings', 'gear', 'Réglages'],
];

let search = '';
let priceSearch = '';
let busy = null; // action en cours (recherche d'adresse…)

function render() {
  const n = state.list.reduce((a, l) => a + l.qty, 0);
  document.getElementById('tabs').innerHTML = TABS.map(([id, ic, label]) => `
    <button data-tab="${id}" aria-selected="${state.tab === id}">${icon(ic)}${id === 'list' && n ? `<span class="badge">${n}</span>` : ''}${label}</button>`).join('');
  const loc = document.getElementById('loc');
  loc.innerHTML = `${icon('pin')}<span>${esc(state.home?.address ?? 'Choisir mon adresse')}</span>`;
  const showSetup = !state.home && !['prices', 'recurring', 'plats'].includes(state.tab);
  const views = { list: viewList, plats: viewPlats, plan: viewPlan, recurring: viewRecurring, prices: viewPrices, settings: viewSettings };
  if (smartOpen && state.tab === 'list') views.list = quiz ? viewQuiz : viewSmart;
  view.innerHTML = showSetup && (state.tab === 'plan' || state.tab === 'settings' || !state.skipSetup) ? viewSetup() : (views[state.tab] ?? viewList)();
  const cta = document.getElementById('cta');
  const showCta = state.tab === 'list' && !smartOpen && state.list.length && !(showSetup && !state.skipSetup);
  cta.innerHTML = showCta ? `<button class="btn primary lg block" data-tab="plan">${icon('route')} Où acheter au meilleur prix ? ${icon('arrow')}</button>` : '';
  document.body.classList.toggle('has-cta', Boolean(showCta));
}

// ---------- Accueil : choisir son adresse ----------
function storesBlock() {
  if (!state.stores.length) return '';
  return `<div class="card">
    <div class="section-head"><h2>Magasins trouvés</h2><span class="pill">${state.stores.length}</span></div>
    <div class="store-list">${state.stores.map(storeRow).join('')}</div>
  </div>`;
}

function storeRow(s) {
  const km = kmFromHome(s);
  const off = state.settings.excluded.includes(s.id);
  const h = todayHours(s.hours);
  return `<div class="store">
    ${logo(s.chain)}
    <div class="grow"><b>${esc(s.name)}</b><div class="small muted">${esc(s.address || CHAINS[s.chain]?.name)}${h ? ` · ${esc(h)}` : ''}</div></div>
    ${km != null ? `<span class="small muted num">${km.toFixed(1)} km</span>` : ''}
    <input type="checkbox" class="switch" data-action="toggle-store" data-id="${s.id}" ${off ? '' : 'checked'} aria-label="Utiliser ${esc(s.name)}">
  </div>`;
}

function addressForm() {
  return `<div class="stack">
    <div class="searchbox">${icon('pin')}<input type="text" id="home-input" placeholder="Rue, numéro, commune" value="${esc(state.home?.address ?? '')}" autocomplete="street-address" enterkeyhint="search"></div>
    <div class="grid2">
      <button class="btn primary" data-action="set-address" ${busy ? 'disabled' : ''}>${busy === 'address' ? '<span class="spin"></span>' : icon('search')} Chercher</button>
      <button class="btn soft" data-action="use-gps" ${busy ? 'disabled' : ''}>${busy === 'gps' ? '<span class="spin"></span>' : icon('gps')} Ma position</button>
    </div>
    <p class="tiny muted">Ton adresse reste sur ce téléphone. Elle sert seulement à trouver les supermarchés proches (OpenStreetMap).</p>
  </div>`;
}

function viewSetup() {
  return `<section class="welcome">
    <div class="row">${['colruyt', 'aldi', 'lidl', 'delhaize', 'carrefour'].map((c) => logo(c, 'lg')).join('')}</div>
    <h1>Tes courses au meilleur prix, près de chez toi</h1>
    <p>Dis-moi d'où tu pars : je trouve les supermarchés autour et je calcule où acheter chaque produit, avec les vrais prix.</p>
    <div class="card">${addressForm()}</div>
    <button class="banner tuto-entry" data-action="tuto">${icon('spark')}<span class="grow"><b>Comment ça marche ?</b><br><span class="small muted">Le guide en images, en 1 minute</span></span>${icon('arrow')}</button>
    ${state.tab === 'list' ? '<button class="btn ghost" data-action="skip-setup">Plus tard, voir ma liste</button>' : ''}
  </section>`;
}

// ---------- Liste ----------
const NUTRI_RANK = { A: 0, B: 1, C: 2, D: 4, E: 5 };
const nutriRank = (n) => NUTRI_RANK[n] ?? 3;
const nutriBadge = (n, size = '') => (/^[A-E]$/.test(n ?? '') ? ` <span class="nutri ${size} n${n}" title="Nutri-Score ${n}">${n}</span>` : '');

// Article de la liste vendu dans les deux enseignes : les deux vrais prix, le moins cher en vert.
function compareLine(p) {
  const own = p.colruyt ? { chain: 'colruyt', price: p.colruyt.price, id: p.colruyt.id } : p.shop ? { chain: p.shop.chain, price: p.shop.price, id: p.shop.id } : null;
  const tw = own && twinOf(own.chain, own.id);
  if (!tw) return '';
  const both = [own, { chain: tw.chain, price: tw.r[ROW.price] }].sort((a, b) => a.price - b.price);
  return `<span class="sub compare">${both.map((x, i) => `<span class="${i === 0 && x.price < both[1].price ? 'cheaper' : ''}">${esc(CHAINS[x.chain].name)} ${eur(x.price)}</span>`).join(' · ')}</span>`;
}

// « Même article chez Delhaize : 5,09 € » sous un article du catalogue.
function twinLine(chain, r) {
  const tw = twinOf(chain, r[ROW.id]);
  if (!tw) return '';
  const d = tw.r[ROW.price] - r[ROW.price];
  const where = CHAINS[tw.chain].name;
  return ` · <span class="twin ${d < -0.005 ? 'cheaper' : ''}">${d < -0.005 ? `${eur(-d)} moins cher chez ${where}` : d > 0.005 ? `${where} : ${eur(tw.r[ROW.price])} (+${eur(d)})` : `même prix chez ${where}`}</span>`;
}

function searchResults() {
  if (!search.trim()) return '';
  const q = norm(search.trim());
  const rank = (n) => (n.startsWith(q) ? 0 : new RegExp(`(^|[^a-z])${q.replace(/[^a-z0-9 ]/g, '')}`).test(n) ? 1 : 2);
  // Produits généraux d'abord (comparés dans tous les magasins), puis articles précis Colruyt.
  const hits = allProducts().filter((p) => !isArticle(p) && norm(p.name).includes(q))
    .sort((a, b) => rank(norm(a.name)) - rank(norm(b.name))).slice(0, 7);
  const exact = hits.some((p) => norm(p.name) === q);
  if (!CATALOG) loadCatalog();
  let cat = searchAll(search, 6);
  // Santé d'abord : Nutri-Score A et B en tête, D et E à la fin.
  const healthy = state.settings.healthy;
  if (healthy) cat = cat.map((x, i) => ({ ...x, i })).sort((a, b) => nutriRank(a.r[ROW.nutri]) - nutriRank(b.r[ROW.nutri]) || a.i - b.i);
  const unit = (r) => (r[ROW.unitPrice] && r[ROW.unit] && r[ROW.weight] !== 1 ? `${eur(r[ROW.unitPrice])}/${r[ROW.unit] === 'pc' ? 'pièce' : r[ROW.unit]}` : '');
  const shops = CATALOG_CHAINS.filter((c) => CATALOGS[c]).map((c) => CHAINS[c].name).join(', ');
  return (hits.length && cat.length ? '<div class="results-head">Produit général · meilleur prix tous magasins</div>' : '') +
    hits.map((p) => `<button data-action="add" data-id="${p.id}"><span>${esc(p.name)}</span><span class="plus">${icon('plus')}</span></button>`).join('') +
    (cat.length ? `<div class="results-head"><span class="grow">Article précis · vrais prix ${esc(shops)}</span>
      <button class="chip ${healthy ? 'on' : ''}" data-action="healthy" aria-pressed="${Boolean(healthy)}">Santé d'abord</button></div>` : '') +
    cat.map(({ chain, r }) => `<button data-action="add-cat" data-chain="${chain}" data-id="${esc(r[ROW.id])}">${logo(chain, 'sm')}<span class="grow">${esc(rowName(r))}${r[ROW.content] && !rowName(r).includes(r[ROW.content]) ? ` <span class="muted">${esc(r[ROW.content])}</span>` : ''}${r[ROW.promo] ? ' <span class="pill promo">promo</span>' : ''}${nutriBadge(r[ROW.nutri], 'sm')}
        <span class="sub">${unit(r)}${twinLine(chain, r)}</span></span>
        <span class="price num">${eur(r[ROW.price])}${r[ROW.weight] === 1 ? '/kg' : ''}</span><span class="plus">${icon('plus')}</span></button>`).join('') +
    (!CATALOG && catalogLoading ? '<div class="results-head muted">Recherche dans tous les catalogues…</div>' : '') +
    (exact ? '' : `<button data-action="add-custom"><span>Ajouter « ${esc(search.trim())} » avec mon prix</span><span class="small muted">autre</span></button>`);
}

function quickChips() {
  const inList = new Set(state.list.map((l) => l.id));
  const fav = [...new Set([...state.recurring.map((r) => r.id), ...PRODUCTS.filter((p) => p.every).map((p) => p.id)])]
    .filter((id) => !inList.has(id)).slice(0, 14);
  if (!fav.length) return '';
  return `<div class="stack"><span class="eyebrow">Ajout rapide</span><div class="chips">
    ${fav.map((id) => `<button class="chip" data-action="add" data-id="${id}"><span class="plus">+</span>${esc(productById(id)?.name.replace(/\s*\(.*\)$/, ''))}</button>`).join('')}
  </div></div>`;
}

function viewList() {
  const due = dueRecurring(state.recurring).filter((r) => !state.list.some((l) => l.id === r.id));
  const groups = new Map();
  for (const l of state.list) {
    const p = productById(l.id);
    if (!p) continue;
    const cat = CATEGORIES[p.cat] ?? 'Divers';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push({ ...l, p });
  }
  const listHtml = [...groups.entries()]
    .sort((a, b) => CATEGORIES.indexOf(a[0]) - CATEGORIES.indexOf(b[0]))
    .map(([cat, ls]) => `<div class="stack"><span class="eyebrow cat">${esc(cat)}</span><ul class="items">${ls.map((l) => `
      <li><span class="name">${l.p.shop ? `${logo(l.p.shop.chain, 'sm')} ` : ''}${esc(l.p.name)}${nutriBadge(l.p.nutri, 'sm')}${compareLine(l.p)}</span>
        <span class="stepper">
          <button data-action="qty" data-id="${l.id}" data-d="-1" aria-label="Moins">${icon(l.qty > 1 ? 'minus' : 'x')}</button>
          <b class="num">${l.qty}</b>
          <button data-action="qty" data-id="${l.id}" data-d="1" aria-label="Plus">${icon('plus')}</button>
        </span></li>`).join('')}</ul></div>`).join('');
  return `
    <div class="section-head"><h1>Ma liste</h1>${state.list.length ? '<button class="btn ghost danger small" data-action="clear">Vider</button>' : ''}</div>
    ${state.list.length ? `<button class="banner smart-entry" data-action="smart-open">${icon('spark')}<span class="grow"><b>Panier malin</b><br><span class="small muted">Donne un budget : je compose le meilleur panier</span></span>${icon('arrow')}</button>` : ''}
    ${due.length ? `<div class="banner">${icon('repeat')}<span class="grow">${due.length} produit${due.length > 1 ? 's' : ''} habituel${due.length > 1 ? 's' : ''} à racheter</span><button class="btn primary" data-action="add-due">Ajouter</button></div>` : ''}
    <div><div class="searchbox">${icon('search')}<input type="search" id="search" placeholder="Ajouter un produit…" value="${esc(search)}" autocomplete="off" enterkeyhint="done">
      <button class="sb-btn" data-action="voice" aria-label="Dicter">${icon('mic')}</button><button class="sb-btn" data-action="scan" aria-label="Scanner un code-barres">${icon('scan')}</button></div>
      <div class="results" id="results">${searchResults()}</div></div>
    ${quickChips()}
    ${state.list.length ? `<div class="card">${listHtml}</div>` : `<div class="empty">${icon('cart')}<b>Ta liste est vide</b><span>Cherche un produit ou touche un ajout rapide.</span></div>`}`;
}

// ---------- Recettes importées (Wikibooks Cookbook, CC BY-SA 4.0) ----------
let moreRecipes = null;
function loadMoreRecipes() {
  moreRecipes ??= fetch('data/recipes-wikibooks.json', { cache: 'no-cache' })
    .then((res) => (res.ok ? res.json() : []))
    .then((rows) => { addRecipes(rows); render(); })
    .catch(() => { moreRecipes = null; });
  return moreRecipes;
}

// ---------- Recettes : ingrédients, prix et ajout à la liste ----------
const ingCache = new Map();
const UNIT_BASE = { g: ['kg', 1000], ml: ['l', 1000], pc: ['pc', 1] };

/**
 * Ingrédient → produit à acheter, contenance d'un paquet (dans l'unité de la
 * recette) et prix par unité. Produit de l'app : le moins cher chez Colruyt ;
 * sinon l'article trouvé dans le catalogue Colruyt.
 */
function resolveIng(key, chain = smartShop()) {
  const ck = `${chain}|${key}`;
  if (ingCache.has(ck)) return ingCache.get(ck);
  const cat = CATALOGS[chain] ?? CATALOG;
  const def = ING[key];
  const [packAmount, unit] = def.pack;
  let out;
  if (def.p) {
    const product = productById(def.p);
    const price = cat ? optionsFor(product, chain)[0]?.price : priceInfo(product, chain, chains(), state.overrides, realPrices())?.price;
    out = { product, pack: packAmount, perUnit: (price ?? product.ref) / packAmount };
  } else {
    const row = cat ? searchCatalog(cat.rows, def.q, 1)[0] : null;
    out = { product: null, row, pack: packAmount, perUnit: def.ref / packAmount, name: def.name };
    if (row) {
      const [base, factor] = UNIT_BASE[unit];
      const size = row[ROW.weight] === 1 ? { amount: 1, unit: base } : parseSizes(`${row[ROW.name]} ${row[ROW.content]}`).find((x) => x.unit === base);
      if (size) out = { ...out, pack: size.amount * factor, perUnit: row[ROW.price] / (size.amount * factor) };
      else if (row[ROW.unitPrice] && row[ROW.unit] === base) out = { ...out, perUnit: row[ROW.unitPrice] / factor };
    }
  }
  if (CATALOGS[chain]) ingCache.set(ck, out);
  return out;
}

const ingName = (key) => ING[key].name ?? productById(ING[key].p)?.name.replace(/\s*\(.*\)$/, '') ?? key;
const dishCost = (r, servings = 1, chain = smartShop()) => r.ingredients.filter((i) => !i.pantry).reduce((t, i) => t + i.amount * servings * resolveIng(i.key, chain).perUnit, 0);
const recipeById = (id) => RECIPES.find((r) => r.id === id);

function kitchen() {
  state.settings.kitchen ??= Object.fromEntries(Object.keys(TOOLS).map((t) => [t, DEFAULT_PROFILE.kitchen.includes(t)]));
  return state.settings.kitchen;
}
const recipeFilters = (extra = {}) => ({ kitchen: kitchen(), diet: state.settings.diet ?? 'tout', allergies: state.settings.allergies ?? [], ...extra });

// Ajoute une part de paquet à la liste : on n'ajoute un paquet que quand
// le précédent est entamé (deux recettes à 250 g de pâtes = un paquet de 1 kg).
function addNeed(id, fraction) {
  state.dishNeed ??= {};
  const before = Math.ceil((state.dishNeed[id] ?? 0) - 1e-6);
  state.dishNeed[id] = (state.dishNeed[id] ?? 0) + fraction;
  const delta = Math.ceil(state.dishNeed[id] - 1e-6) - before;
  if (delta <= 0) return;
  const it = state.list.find((l) => l.id === id);
  if (it) it.qty += delta; else state.list.push({ id, qty: delta, checked: false });
}

/** Ingrédients d'une recette dans la liste (sans le placard). */
function addDish(r, servings) {
  for (const i of r.ingredients.filter((x) => !x.pantry)) {
    const res = resolveIng(i.key);
    let id = res.product?.id;
    if (!id && res.row) {
      const p = catalogProduct(res.row);
      if (!state.custom.some((c) => c.id === p.id)) state.custom.push(p);
      id = p.id;
    }
    if (!id) { // catalogue indisponible : produit à ton prix
      id = `perso-${i.key}`;
      if (!state.custom.some((c) => c.id === id)) state.custom.push({ id, name: ING[i.key].name, cat: 4, ref: ING[i.key].ref, custom: true });
    }
    addNeed(id, (i.amount * servings) / res.pack);
  }
  state.menu = [...(state.menu ?? []), { id: r.id, servings }].slice(-30);
}

// ---------- Panier malin ----------
let smartOpen = false;
let quiz = null; // { mode, i, answers } : questions en cours
const smartCands = {}; // enseigne → candidats du catalogue (calculés une fois)
const optionCache = new Map();

function smartSettings() {
  state.smart ??= { budget: 50, goal: 'best', pins: {}, optional: {}, removed: {} };
  state.smart.dishes ??= [];
  return state.smart;
}
// Magasin du panier malin : Colruyt ou Delhaize.
const SMART_SHOPS = ['colruyt', 'delhaize'];
const smartShop = () => (SMART_SHOPS.includes(state.smart?.shop) ? state.smart.shop : 'colruyt');

// Choix proposés pour un produit dans un magasin : ses gammes (premier prix,
// marque du magasin, grande marque), ou l'article choisi (ou son équivalent
// exact dans l'autre enseigne), ou un prix unique.
function optionsFor(p, chain = smartShop()) {
  const fixed = (id, article, price, name = article) => {
    const tier = tierOf(name, chain);
    return [{ tier, label: tierLabel(tier, chain), id, article, price, fixed: true }];
  };
  const own = p.colruyt ? { chain: 'colruyt', id: p.colruyt.id, price: p.colruyt.price } : p.shop ? { chain: p.shop.chain, id: p.shop.id, price: p.shop.price } : null;
  if (own) {
    if (own.chain === chain) return fixed(own.id, p.name, own.price);
    const tw = twinOf(own.chain, own.id);
    if (tw?.chain === chain) return fixed(tw.r[ROW.id], rowName(tw.r), tw.r[ROW.price], tw.r[ROW.name]);
    const est = priceInfo(p, chain, chains(), state.overrides, realPrices());
    return [{ tier: 'house', label: 'Prix estimé', article: p.name, price: est?.price ?? p.ref, fixed: true }];
  }
  const key = `${chain}|${p.id}`;
  const cat = CATALOGS[chain];
  if (!optionCache.has(key) && cat) {
    smartCands[chain] ??= candidatesFromRows(cat.rows);
    optionCache.set(key, productOptions(p.id, smartCands[chain], chain));
  }
  const opts = optionCache.get(key) ?? [];
  if (opts.length) return opts;
  const info = priceInfo(p, chain, chains(), state.overrides, realPrices());
  return [{ tier: 'house', label: info?.kind === 'user' ? 'Ton prix' : 'Prix estimé', price: info?.price ?? p.ref, fixed: true }];
}

// Produits proposés en plus : habitudes à racheter, puis produits courants.
function smartSuggestions() {
  const sm = smartSettings();
  const inList = new Set(state.list.map((l) => l.id));
  const ids = [...dueRecurring(state.recurring).map((r) => r.id), ...state.recurring.map((r) => r.id), ...PRODUCTS.filter((p) => p.every && p.every <= 7).map((p) => p.id)];
  return [...new Set(ids)].filter((id) => !inList.has(id) && !sm.removed[id] && productById(id)).slice(0, 6);
}

function smartItems(chain = smartShop()) {
  const sm = smartSettings();
  const fromList = state.list.map((l) => ({ id: l.id, qty: l.qty, must: !sm.optional[l.id], inList: true }));
  const inList = new Set(state.list.map((l) => l.id));
  const extras = sm.profile
    ? staplesFor(sm.profile).filter((x) => !inList.has(x.id) && !sm.removed[x.id]).map((x) => ({ ...x, must: false, inList: false }))
    : smartSuggestions().map((id) => ({ id, qty: 1, must: false, inList: false }));
  return [...fromList.filter((i) => i.must), ...fromList.filter((i) => !i.must), ...extras]
    .map((i) => ({ ...i, p: productById(i.id) })).filter((i) => i.p)
    .map((i) => {
      const options = optionsFor(i.p, chain);
      const pin = sm.pins[i.id];
      return { ...i, options, pin: pin != null && pin < options.length ? pin : undefined };
    });
}

// Plats proposés, au prix des paquets entiers qu'ils font acheter : un plat
// paie les paquets qu'il entame, les plats suivants profitent des restes.
function dishItems(chain = smartShop()) {
  const need = {};
  return smartSettings().dishes.map((d) => ({ d, r: recipeById(d.id) })).filter((x) => x.r).map(({ d, r }) => {
    let price = 0;
    for (const i of r.ingredients.filter((x) => !x.pantry)) {
      const res = resolveIng(i.key, chain);
      const before = Math.ceil((need[i.key] ?? 0) - 1e-6);
      need[i.key] = (need[i.key] ?? 0) + (i.amount * d.servings) / res.pack;
      price += (Math.ceil(need[i.key] - 1e-6) - before) * res.pack * res.perUnit;
    }
    return {
      id: `dish:${r.id}`, qty: 1, must: false, dish: r, servings: d.servings, used: dishCost(r, d.servings, chain),
      options: [{ tier: 'house', label: 'Plat', price: Math.round(price * 100) / 100 }],
    };
  });
}

// Plats proposés d'après les réponses (ou remplacement d'un plat).
function proposeDishes(profile, exclude = []) {
  const pr = { ...DEFAULT_PROFILE, ...profile };
  const filters = recipeFilters({ maxTime: pr.time });
  const ids = pickDishes(pr.dinners, filters, (r) => dishCost(r), { meat: pr.meat, fish: pr.fish, exclude });
  const desserts = RECIPES.filter((r) => r.type === 'dessert' && !exclude.includes(r.id) && compatible(r, filters))
    .sort((a, b) => dishCost(a) - dishCost(b)).slice(0, Number(pr.dessert) || 0).map((r) => r.id);
  return [...ids, ...desserts].map((id) => ({ id, servings: recipeById(id).type === 'dessert' ? pr.people : servingsFor(pr) }));
}

// Produits et plats du panier malin pour un magasin, dans l'ordre de remplissage :
// liste (indispensables), plats, puis propositions.
function basketItems(chain = smartShop()) {
  const items = [...smartItems(chain), ...dishItems(chain)];
  items.sort((a, b) => (b.must - a.must) || ((b.inList ? 1 : 0) - (a.inList ? 1 : 0)) || ((b.dish ? 1 : 0) - (a.dish ? 1 : 0)));
  return items;
}

// Ta liste et tes plats au moins cher dans chaque magasin.
function shopComparison() {
  const rows = SMART_SHOPS.filter((c) => CATALOGS[c]).map((c) => {
    const items = basketItems(c).filter((i) => i.inList || i.dish).map((i) => ({ ...i, must: true, pin: undefined }));
    return { c, total: buildBasket(items, Infinity, 'cheap').total, n: items.length };
  });
  if (rows.length < 2 || !rows[0].n) return '';
  rows.sort((a, b) => a.total - b.total);
  const gap = rows[1].total - rows[0].total;
  return `<div class="shop-compare"><span class="small muted">Ta liste${smartSettings().dishes.length ? ' et tes plats' : ''} au moins cher :</span>
    <div class="row" style="gap:8px">${rows.map((r, i) => `<button class="chip ${i === 0 && gap > 0.005 ? 'on' : ''}" data-action="smart-shop" data-val="${r.c}">${logo(r.c, 'sm')} ${esc(CHAINS[r.c].name)} <b class="num">${eur(r.total)}</b></button>`).join('')}</div>
    ${gap > 0.005 ? `<span class="small"><b>${esc(CHAINS[rows[0].c].name)}</b> est moins cher de <b>${eur(gap)}</b>.</span>` : ''}</div>`;
}

function viewSmart() {
  const sm = smartSettings();
  const shop = smartShop();
  if (!CATALOG || !CATALOGS[shop]) {
    loadCatalog().then(() => loadOtherCatalogs()).then(() => { if (smartOpen) render(); });
    return `<button class="btn ghost small" data-action="smart-close">← Ma liste</button><div class="empty"><span class="spin"></span><b>Je charge les prix ${esc(CHAINS[shop].name)}…</b></div>`;
  }
  if (!CATALOGS.delhaize) loadOtherCatalogs();
  const items = basketItems(shop);
  const res = buildBasket(items, sm.budget, sm.goal);
  const picked = new Map(res.lines.map((l) => [l.id, l]));
  const pct = Math.min(100, (res.total / Math.max(sm.budget, 1)) * 100);
  const row = (it) => {
    const line = picked.get(it.id);
    const opt = line ? it.options[line.option] : it.options[0];
    return `<li class="smart-item ${line ? '' : 'out'}">
      <div class="row" style="justify-content:space-between;align-items:flex-start;gap:10px">
        <span class="name">${it.qty > 1 ? `<b>${it.qty} ×</b> ` : ''}${esc(it.p.name)}<span class="sub">${esc(opt.article ?? opt.label)}${opt.promo ? ' · promo' : ''}</span></span>
        <b class="num">${line ? eur(line.price) : '—'}</b>
      </div>
      ${it.options.length > 1 ? `<div class="tiers" role="group" aria-label="Gamme">${it.options.map((o, i) => `
        <button data-action="smart-pin" data-id="${it.id}" data-i="${i}" aria-pressed="${line?.option === i}" class="${it.pin === i ? 'pinned' : ''}">${esc(o.label)}<span class="num">${eur(o.price * it.qty)}</span></button>`).join('')}</div>` : ''}
      <div class="row" style="justify-content:space-between">
        ${it.inList
          ? `<label class="tiny row" style="gap:6px"><input type="checkbox" class="switch sm" data-action="smart-must" data-id="${it.id}" ${it.must ? 'checked' : ''}> Indispensable</label>`
          : `<span class="tiny muted">Proposé${line ? ' · rentre dans le budget' : ' · pas assez de budget'}</span><button class="icon-btn" data-action="smart-remove" data-id="${it.id}" aria-label="Ne pas proposer">${icon('x')}</button>`}
        ${it.pin != null ? '<span class="tiny muted">ton choix</span>' : ''}
      </div></li>`;
  };
  const mine = items.filter((i) => i.inList);
  const extras = items.filter((i) => !i.inList && !i.dish);
  const dishes = items.filter((i) => i.dish);
  const dishRow = (it) => {
    const line = picked.get(it.id);
    return `<li class="smart-item ${line ? '' : 'out'}">
      <div class="row" style="justify-content:space-between;align-items:flex-start;gap:10px">
        <span class="name">${esc(it.dish.name)}<span class="sub">${it.servings} portion${it.servings > 1 ? 's' : ''} · ${it.dish.minutes} min · ${eur(it.used)} consommés, le reste des paquets sert ensuite${line ? '' : ' · pas assez de budget'}</span></span>
        <b class="num">${eur(it.options[0].price)}</b></div>
      <div class="row" style="gap:6px;justify-content:flex-end">
        <button class="btn soft small" data-action="dish-swap" data-id="${it.dish.id}">Changer</button>
        <button class="btn ghost small" data-action="recipe-open" data-id="${it.dish.id}">Recette</button>
        <button class="icon-btn" data-action="dish-remove" data-id="${it.dish.id}" aria-label="Retirer">${icon('x')}</button></div></li>`;
  };
  const prof = sm.profile;
  const quizCard = `<div class="card">
      ${prof
        ? `<div class="row" style="justify-content:space-between"><span class="small"><b>Tes réponses :</b> ${prof.people} pers. · ${prof.days} j · ${prof.dinners} repas · ${esc(DIETS[prof.diet]?.label ?? '')}</span></div>`
        : '<span class="small">Réponds à quelques questions : je compose un panier avec des plats adaptés à ta cuisine.</span>'}
      <div class="row" style="gap:8px"><button class="btn soft grow" data-action="quiz" data-val="simple">${prof ? 'Refaire · ' : ''}Simple · 5 questions</button>
        <button class="btn soft grow" data-action="quiz" data-val="complet">Complet · 20 questions</button></div></div>`;
  return `
    <button class="btn ghost small" data-action="smart-close">← Ma liste</button>
    <h1>Panier malin</h1>
    <div class="seg" role="group" aria-label="Magasin">${SMART_SHOPS.map((c) => `<button data-action="smart-shop" data-val="${c}" aria-pressed="${shop === c}">${esc(CHAINS[c].name)}</button>`).join('')}</div>
    ${shopComparison()}
    ${quizCard}
    <div class="card">
      <label class="field"><span>Mon budget pour les courses</span>
        <div class="row"><input type="number" id="smart-budget" min="1" step="1" inputmode="decimal" value="${sm.budget}" style="max-width:120px"> <b>€</b>
          <div class="chips">${[30, 50, 80, 120].map((b) => `<button class="chip" data-action="smart-budget" data-val="${b}">${b} €</button>`).join('')}</div></div></label>
      <div class="seg" role="group" aria-label="Objectif">
        <button data-action="smart-goal" data-val="best" aria-pressed="${sm.goal === 'best'}">Le meilleur dans mon budget</button>
        <button data-action="smart-goal" data-val="cheap" aria-pressed="${sm.goal === 'cheap'}">Le moins cher</button>
      </div>
    </div>
    <section class="hero">
      <span class="eyebrow">${res.over ? 'Budget dépassé' : 'Ton panier'} · vrais prix Colruyt</span>
      <div class="row" style="align-items:baseline;gap:8px"><span class="total num">${eur(res.total)}</span><span>/ ${eur(sm.budget)}</span></div>
      <div class="progress"><span style="width:${pct}%${res.over ? ';background:var(--danger)' : ''}"></span></div>
      <span class="small">${res.over
        ? `Il manque ${eur(-res.left)} même au premier prix : décoche « Indispensable » sur un produit ou augmente le budget.`
        : `Il reste ${eur(res.left)}${res.skipped.length ? ` · ${res.skipped.length} proposition${res.skipped.length > 1 ? 's' : ''} hors budget` : ''}`}</span>
    </section>
    <p class="small muted">Touche une gamme pour l'imposer (retouche pour laisser l'app choisir). Les frais de retrait ne sont pas comptés.</p>
    <div><div class="searchbox">${icon('search')}<input type="search" id="search" placeholder="Ajouter un produit au panier…" value="${esc(search)}" autocomplete="off" enterkeyhint="done">
      <button class="sb-btn" data-action="voice" aria-label="Dicter">${icon('mic')}</button><button class="sb-btn" data-action="scan" aria-label="Scanner un code-barres">${icon('scan')}</button></div>
      <div class="results" id="results">${searchResults()}</div></div>
    ${mine.length ? `<span class="eyebrow">Ta liste</span><ul class="items smart">${mine.map(row).join('')}</ul>` : ''}
    <div class="section-head"><span class="eyebrow">Plats proposés</span><button class="btn ghost small" data-tab="plats">+ Choisir un plat</button></div>
    ${dishes.length ? `<ul class="items smart">${dishes.map(dishRow).join('')}</ul>` : '<p class="small muted">Aucun plat : réponds aux questions, ou choisis-en dans l\'onglet Plats.</p>'}
    ${extras.length ? `<span class="eyebrow">Je te propose aussi</span><ul class="items smart">${extras.map(row).join('')}</ul>` : ''}
    <button class="btn primary lg block" data-action="smart-apply" ${res.lines.length ? '' : 'disabled'}>${icon('check')} Mettre ce panier dans ma liste</button>`;
}

// Le panier choisi remplace la liste : gamme choisie = article précis du catalogue.
function applySmart() {
  const sm = smartSettings();
  const shop = smartShop();
  const items = basketItems(shop);
  const res = buildBasket(items, sm.budget, sm.goal);
  const byId = new Map(items.map((i) => [i.id, i]));
  const list = [];
  const dishes = [];
  for (const l of res.lines) {
    const it = byId.get(l.id);
    if (it.dish) { dishes.push(it); continue; }
    const o = it.options[l.option];
    let id = l.id;
    // Produit du catalogue de l'app au premier choix : on garde le produit
    // générique (l'app cherche le moins cher dans chaque magasin).
    const row = !o.fixed && l.option > 0 ? rowById(shop, o.id) : null;
    if (row) {
      const p = catalogProduct(row, shop);
      if (!state.custom.some((c) => c.id === p.id)) state.custom.push(p);
      id = p.id;
    }
    const prev = state.list.find((x) => x.id === l.id);
    list.push({ id, qty: l.qty, checked: prev?.checked ?? false });
  }
  const dropped = state.list.filter((x) => !res.lines.some((l) => l.id === x.id)).length;
  state.list = list;
  state.dishNeed = {};
  for (const it of dishes) addDish(it.dish, it.servings);
  sm.dishes = [];
  smartOpen = false;
  save();
  toast(`Panier de ${eur(res.total)} dans ta liste${dropped ? ` · ${dropped} produit${dropped > 1 ? 's' : ''} hors budget retiré${dropped > 1 ? 's' : ''}` : ''}`);
  setTab('plan');
}

// ---------- Questions du panier malin ----------
function startQuiz(mode) {
  loadMoreRecipes();
  const sm = smartSettings();
  const answers = { ...DEFAULT_PROFILE, ...(sm.profile ?? {}), kitchen: Object.keys(kitchen()).filter((k) => kitchen()[k]), diet: state.settings.diet ?? 'tout', allergies: state.settings.allergies ?? [] };
  quiz = { mode, i: 0, answers };
}

function viewQuiz() {
  const qs = questionsFor(quiz.mode);
  const q = qs[quiz.i];
  const val = quiz.answers[q.id];
  const on = (o) => (q.type === 'many' ? (val ?? []).map(String).includes(String(o.value)) : String(val) === String(o.value));
  return `
    <button class="btn ghost small" data-action="quiz-back">← ${quiz.i ? 'Question précédente' : 'Panier malin'}</button>
    <section class="hero">
      <span class="eyebrow">${quiz.mode === 'simple' ? 'Simple' : 'Complet'} · question ${quiz.i + 1} / ${qs.length}</span>
      <div class="progress"><span style="width:${((quiz.i + 1) / qs.length) * 100}%"></span></div>
      <span class="plan-name" style="font-size:1.25rem">${esc(q.text)}</span>
    </section>
    <div class="quiz-options">${q.options.map((o) => `<button class="quiz-opt" data-action="quiz-pick" data-val="${esc(o.value)}" aria-pressed="${on(o)}">${esc(o.label)}</button>`).join('')}</div>
    ${q.type === 'many' ? '<p class="small muted">Plusieurs réponses possibles (ou aucune).</p>' : ''}
    <button class="btn primary lg block" data-action="quiz-next">${quiz.i + 1 < qs.length ? 'Suivant' : 'Composer mon panier'} ${icon('arrow')}</button>`;
}

function finishQuiz() {
  const sm = smartSettings();
  const a = { ...quiz.answers };
  const mode = quiz.mode;
  quiz = null;
  sm.profile = a;
  sm.budget = Number(a.budget) || sm.budget;
  if (mode === 'complet') {
    sm.goal = a.gamme;
    state.settings.kitchen = Object.fromEntries(Object.keys(TOOLS).map((t) => [t, a.kitchen.includes(t)]));
    state.settings.allergies = a.allergies;
  }
  state.settings.diet = a.diet;
  sm.removed = {};
  sm.dishes = proposeDishes(a);
  save();
  render();
  window.scrollTo({ top: 0 });
}

// ---------- Plats ----------
let recipeOpen = null;
let recipeType = 'plat';
let recipeSearch = '';
let recipeQuick = false;

function recipeCard(r) {
  const cost = dishCost(r);
  return `<button class="recipe" data-action="recipe-open" data-id="${r.id}">
    <span class="grow"><b>${esc(r.name)}</b><span class="sub">${r.minutes} min · ${r.tools.map((g) => g.map((t) => TOOLS[t]).join(' ou ')).join(' + ') || 'sans cuisson'}${r.flags.has('m') || r.flags.has('f') ? '' : ' · végé'}</span></span>
    <span class="num price">≈ ${eur(cost)}<span class="sub">/ pers.</span></span></button>`;
}

function viewPlats() {
  if (!CATALOG) loadCatalog().then(() => { if (state.tab === 'plats') render(); });
  loadMoreRecipes();
  if (recipeOpen) return viewRecipe(recipeById(recipeOpen));
  const k = kitchen();
  const q = norm(recipeSearch.trim());
  const filters = recipeFilters({ maxTime: recipeQuick ? 20 : Infinity });
  const all = RECIPES.filter((r) => r.type === recipeType && (!q || norm(r.name).includes(q) || r.ingredients.some((i) => norm(ingName(i.key)).includes(q))));
  const ok = all.filter((r) => compatible(r, filters)).sort((a, b) => dishCost(a) - dishCost(b));
  const menu = (state.menu ?? []).map((m) => recipeById(m.id)).filter(Boolean);
  return `
    <h1>Plats</h1>
    ${menu.length ? `<div class="card"><div class="section-head"><span class="eyebrow">Ajoutés à ta liste</span><button class="btn ghost small" data-action="menu-clear">Effacer</button></div>
      <div class="chips">${menu.map((r) => `<button class="chip" data-action="recipe-open" data-id="${r.id}">${esc(r.name)}</button>`).join('')}</div></div>` : ''}
    <div class="card">
      <span class="eyebrow">Ma cuisine</span>
      <div class="chips wrap">${Object.entries(TOOLS).map(([t, label]) => `<button class="chip" data-action="kitchen" data-val="${t}" aria-pressed="${Boolean(k[t])}">${k[t] ? '✓ ' : ''}${esc(label)}</button>`).join('')}</div>
      <span class="eyebrow">Alimentation</span>
      <div class="chips wrap">${Object.entries(DIETS).map(([d, x]) => `<button class="chip" data-action="diet" data-val="${d}" aria-pressed="${(state.settings.diet ?? 'tout') === d}">${esc(x.label)}</button>`).join('')}</div>
    </div>
    <div class="seg" role="group" aria-label="Type">${Object.entries(TYPES).map(([t, l]) => `<button data-action="recipe-type" data-val="${t}" aria-pressed="${recipeType === t}">${l}</button>`).join('')}</div>
    <div class="row" style="gap:8px"><div class="searchbox grow">${icon('search')}<input type="search" id="recipe-search" placeholder="Plat ou ingrédient…" value="${esc(recipeSearch)}" autocomplete="off"></div>
      <button class="chip" data-action="recipe-quick" aria-pressed="${recipeQuick}">≤ 20 min</button></div>
    <p class="small muted">${ok.length} recette${ok.length > 1 ? 's' : ''} faisable${ok.length > 1 ? 's' : ''} avec ta cuisine${all.length > ok.length ? ` (${all.length - ok.length} autre${all.length - ok.length > 1 ? 's' : ''} demandent un autre appareil ou un autre régime)` : ''} · prix par personne, vrais prix Colruyt.</p>
    <div class="recipes">${ok.map(recipeCard).join('') || '<div class="empty"><b>Aucune recette</b><span>Coche d\'autres appareils ou change de filtre.</span></div>'}</div>`;
}

// Prix du plat dans chaque magasin (catalogues chargés).
function dishShops(r, n) {
  if (!CATALOGS.delhaize) { loadOtherCatalogs(); return ''; }
  const rows = SMART_SHOPS.filter((c) => CATALOGS[c]).map((c) => ({ c, cost: dishCost(r, n, c) })).sort((a, b) => a.cost - b.cost);
  if (rows.length < 2) return '';
  return `<div class="row shop-compare" style="gap:8px">${rows.map((x, i) => `<span class="chip ${i === 0 && rows[1].cost - x.cost > 0.005 ? 'on' : ''}">${logo(x.c, 'sm')} ${esc(CHAINS[x.c].name)} <b class="num">≈ ${eur(x.cost)}</b></span>`).join('')}</div>`;
}

function viewRecipe(r) {
  if (!r) { recipeOpen = null; return viewPlats(); }
  const n = state.settings.servings ?? smartSettings().profile?.people ?? 1;
  const bought = r.ingredients.filter((i) => !i.pantry);
  const pantry = r.ingredients.filter((i) => i.pantry);
  const k = kitchen();
  const missing = r.tools.filter((g) => !g.some((t) => k[t])).map((g) => g.map((t) => TOOLS[t]).join(' ou '));
  return `
    <button class="btn ghost small" data-action="recipe-back">← Plats</button>
    <h1>${esc(r.name)}</h1>
    <p class="small muted">${r.minutes} min · ${r.tools.map((g) => g.map((t) => TOOLS[t]).join(' ou ')).join(' + ') || 'sans cuisson'}</p>
    ${missing.length ? `<div class="banner warn-banner">⚠️<span class="small">Il te faut : ${esc(missing.join(', '))}.</span></div>` : ''}
    <div class="card">
      <div class="row" style="justify-content:space-between"><b>Personnes</b>
        <span class="stepper"><button data-action="servings" data-d="-1" aria-label="Moins">${icon('minus')}</button><b class="num">${n}</b><button data-action="servings" data-d="1" aria-label="Plus">${icon('plus')}</button></span></div>
      <ul class="items">${bought.map((i) => `<li><span class="name">${esc(ingName(i.key))}</span><span class="num">${formatAmount(i.amount * n, i.unit)}${i.unit === 'pc' ? '' : ''}</span><span class="num muted small" style="min-width:56px;text-align:right">${eur(i.amount * n * resolveIng(i.key).perUnit)}</span></li>`).join('')}</ul>
      ${pantry.length ? `<p class="small muted">Dans ton placard : ${esc(pantry.map((i) => ingName(i.key)).join(', '))}.</p>` : ''}
    </div>
    <div class="card"><span class="eyebrow">Préparation</span><p>${esc(r.steps)}</p>
      ${r.src ? `<p class="tiny muted">Recette adaptée et traduite du <a href="${esc(r.src)}" target="_blank" rel="noopener">Wikibooks Cookbook</a> (licence <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noopener">CC BY-SA 4.0</a>), quantités par personne calculées par l'app.</p>` : ''}</div>
    ${dishShops(r, n)}
    <button class="btn primary lg block" data-action="recipe-add" data-id="${r.id}">${icon('cart')} Ajouter à ma liste · ≈ ${eur(dishCost(r, n))}</button>
    <p class="foot">Prix estimé avec la quantité utilisée ; en magasin on achète des paquets entiers (le reste servira pour d'autres plats).</p>`;
}

// ---------- Plan ----------
let lastPlans = [];
let shownPlan = null;

function routeLogos(plan) {
  return `<div class="route">${plan.stops.map((s, i) => `${i ? `<span class="arrow">${icon('arrow')}</span>` : ''}${logo(s.store.chain)}`).join('')}</div>`;
}

const PLAN_MODES = [['collect', 'Retrait Collect'], ['store', 'En magasin'], ['all', 'Tout']];
const modeOk = (p, m) => m === 'all' || p.mode === m;

function prefsBar() {
  const s = state.settings;
  return `<div class="stack">
    <div class="seg" role="group" aria-label="Façon de faire les courses">${PLAN_MODES.map(([k, l]) => `<button data-action="set" data-key="planMode" data-val="${k}" aria-pressed="${s.planMode === k}">${l}</button>`).join('')}</div>
    <div class="seg" role="group" aria-label="Déplacement">${Object.entries(MODES).map(([k, m]) => `<button data-action="set" data-key="mode" data-val="${k}" aria-pressed="${s.mode === k}">${m.label}</button>`).join('')}</div>
    <div class="seg" role="group" aria-label="Nombre de magasins au maximum">${[1, 2, 3].map((n) => `<button data-action="set" data-key="maxStores" data-val="${n}" data-num aria-pressed="${s.maxStores === n}">${n} magasin${n > 1 ? 's' : ''}</button>`).join('')}</div>
  </div>`;
}

function viewPlan() {
  if (!state.list.length) return `<h1>Meilleur plan</h1><div class="empty">${icon('route')}<b>Ajoute d'abord des produits à ta liste</b><button class="btn primary" data-tab="list">Ouvrir ma liste</button></div>`;
  if (!state.stores.length) return `<h1>Meilleur plan</h1><div class="card">${icon('pin')}<b>Aucun supermarché trouvé autour de ton adresse.</b><p class="small muted">Vérifie l'adresse ou élargis le rayon dans Réglages.</p><button class="btn primary" data-tab="settings">Réglages</button></div>`;
  const allPlans = computePlans();
  lastPlans = allPlans.filter((p) => modeOk(p, state.settings.planMode));
  if (!lastPlans.length) {
    const why = state.settings.planMode === 'collect'
      ? 'Pas de Colruyt ni de Delhaize dans ton rayon : élargis-le dans Réglages.'
      : 'Magasins exclus, ou produits introuvables avec ces réglages.';
    return `<h1>Meilleur plan</h1>${prefsBar()}<div class="empty">${icon('route')}<b>Aucun plan possible</b><span>${why}</span>${allPlans.length ? '<button class="btn soft" data-action="set" data-key="planMode" data-val="all">Voir toutes les options</button>' : ''}</div>`;
  }
  const singles = allPlans.filter((p) => p.mode === 'store' && p.stops.length === 1);
  const nearest = [...singles].sort((a, b) => a.travel.km - b.travel.km)[0];
  const plan = lastPlans.find((p) => p.id === shownPlan) ?? lastPlans[0];
  const ordering = orderStop && plan.stops.find((s) => s.store.id === orderStop);
  if (ordering) return viewOrder(plan, ordering);
  orderStop = null;
  const isBest = plan === lastPlans[0];
  const saving = nearest ? nearest.total - plan.total : 0;

  const stops = plan.stops.map((s, i) => {
    const st = s.store;
    const sub = s.lines.reduce((a, l) => a + l.total, 0);
    const km = st.lat != null ? kmFromHome(st) : null;
    const status = st.hours ? (isOpen(st, new Date()) ? `<span class="pill good">ouvert · ${esc(todayHours(st.hours))}</span>` : `<span class="pill warn">fermé maintenant</span>`) : '';
    return `<div class="card">
      <div class="stop-head">
        ${plan.kind === 'trip' && plan.stops.length > 1 ? `<span class="step-num">${i + 1}</span>` : ''}${logo(st.chain, 'lg')}
        <div class="grow"><h3>${esc(st.name)}</h3><div class="small muted">${esc(st.address ?? '')}${km != null ? ` · ${km.toFixed(1)} km` : ''}</div></div>
        <b class="num">${eur(sub)}</b>
      </div>
      ${st.collect ? `<div class="row wrap"><span class="pill good">retrait${st.collect.fee ? ` · ${eur(st.collect.fee)} de frais` : ' gratuit'}${st.collect.minOrder ? ` · min. ${eur(st.collect.minOrder)}` : ''}</span></div>
        <button class="btn primary block" data-action="order" data-id="${esc(st.id)}">${icon('cart')} Préparer ma commande ${icon('arrow')}</button>` : ''}
      ${status ? `<div>${status}</div>` : ''}
      <ul class="items">${s.lines.map((l) => {
        const item = state.list.find((x) => x.id === l.product.id);
        return `<li class="${item?.checked ? 'done' : ''}">
          <input type="checkbox" class="check" data-action="check" data-id="${l.product.id}" ${item?.checked ? 'checked' : ''} aria-label="Pris">
          <span class="name">${l.qty > 1 ? `${l.qty} × ` : ''}${esc(l.product.name)}${l.info?.article ? `<span class="sub">${esc(l.info.article)}</span>` : ''}</span>
          <span style="text-align:right"><span class="num">${eur(l.total)}</span><br>${KIND[l.info?.kind] ?? ''}</span></li>`;
      }).join('')}</ul>
    </div>`;
  }).join('');

  const others = lastPlans.filter((p) => p !== plan).slice(0, 5);
  return `
    <h1>Meilleur plan</h1>
    ${prefsBar()}
    <section class="hero">
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <div class="stack" style="gap:6px"><span class="eyebrow">${isBest ? 'Le moins cher au total' : 'Autre option'}${plan.mode === 'collect' ? ' · retrait' : plan.mode === 'mixed' ? ' · retrait + magasin' : plan.kind === 'delivery' ? ' · livraison' : ''}</span>
          <span class="plan-name">${esc(plan.label)}</span>
          <div class="total num">${eur(plan.total)}</div>
          ${isBest && saving > 0.01 ? `<span class="saving">−${eur(saving)} vs le magasin le plus proche</span>` : ''}
          ${isBest && allPlans[0] && allPlans[0].total < plan.total - 0.01 && state.settings.planMode !== 'all' ? `<span class="tiny">Toutes options confondues : ${eur(allPlans[0].total)} (${esc(allPlans[0].label)})</span>` : ''}
        </div>
        ${routeLogos(plan)}
      </div>
      <div class="stats">
        <div><b class="num">${eur(plan.goods)}</b><span>courses</span></div>
        <div><b class="num">${plan.travel.minutes} min</b><span>${plan.travel.km.toFixed(1)} km</span></div>
        <div><b class="num">${eur(plan.travel.cost + plan.fees)}</b><span>${plan.fees ? `dont ${eur(plan.fees)} de frais` : 'ton temps'}</span></div>
      </div>
    </section>
    ${planWarnings(plan)}
    <div class="actions">
      ${plan.kind === 'trip' || plan.stops[0]?.store.lat != null
        ? `<a class="btn" target="_blank" rel="noopener" href="${esc(mapsUrl(state.home, plan, state.settings.mode))}">${icon('map')}Itinéraire</a>`
        : `<a class="btn" target="_blank" rel="noopener" href="${esc(plan.delivery?.url ?? '#')}">${icon('cart')}Commander</a>`}
      <a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(planText(plan))}">${icon('share')}WhatsApp</a>
      <button class="btn" data-action="copy" data-plan="${plan.id}">${icon('copy')}Copier</button>
    </div>
    ${stops}
    <button class="btn primary lg block" data-action="done" data-plan="${plan.id}">${icon('check')} Courses faites</button>
    ${others.length ? `<div class="card"><span class="eyebrow">Autres options</span>${others.map((p) => `
      <button class="alt" data-action="show-plan" data-plan="${p.id}">
        ${routeLogos(p)}
        <span class="grow small">${esc(p.label)}${p.short ? `<br><span class="warn-text tiny">minimum ${eur(p.short[0].min)} : il manque ${eur(p.short[0].missing)}</span>` : ''}</span>
        <span style="text-align:right"><b class="num">${eur(p.total)}</b><br><span class="diff num">${p.total >= lastPlans[0].total ? '+' : '−'}${eur(Math.abs(p.total - lastPlans[0].total))}</span></span>
      </button>`).join('')}</div>` : ''}
    <p class="foot">${priceSourcesNote()} <a href="#" data-tab="prices">Fiabilité des prix</a><br>Coût total = courses + frais + ton temps (${eur(state.settings.valueOfTime)}/h, modifiable dans Réglages).</p>`;
}

// ---------- Panier assisté (commande Collect) ----------
let orderStop = null; // magasin dont on prépare la commande

// Format attendu d'un produit (« 1 L », « 500 g ») : dans son nom, entre parenthèses.
const packOf = (p) => p.name.match(/\(([^)]*\d[^)]*)\)\s*$/)?.[1] ?? '';

function viewOrder(plan, stop) {
  const st = stop.store;
  const shop = SHOPS[st.chain];
  const lines = stop.lines.map((l) => ({ ...l, link: orderLink(st.chain, l), item: state.list.find((x) => x.id === l.product.id) }));
  const done = lines.filter((l) => l.item?.checked).length;
  const next = lines.find((l) => !l.item?.checked);
  const sub = stop.lines.reduce((a, l) => a + l.total, 0);
  const min = st.collect.minOrder;
  return `
    <button class="btn ghost small" data-action="order-back">← Retour au plan</button>
    <section class="hero">
      <div class="row" style="gap:12px">${logo(st.chain, 'lg')}
        <div class="grow stack" style="gap:2px"><span class="eyebrow">Commande ${esc(st.collect.name)}</span><span class="plan-name">${esc(st.placeName ?? st.name)}</span></div>
        <b class="num">${eur(sub)}</b></div>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${lines.length}" aria-valuenow="${done}"><span style="width:${lines.length ? (done / lines.length) * 100 : 0}%"></span></div>
      <span class="small">${done === lines.length ? 'Tout est dans ton panier 🎉' : `${done} sur ${lines.length} dans le panier`}</span>
    </section>
    <div class="card">
      <ol class="how">
        <li>Sur le site, connecte-toi et choisis <b>${esc(st.placeName ?? st.name)}</b> comme point de retrait (une seule fois). Tous les magasins ne font pas le retrait : sinon, prends le point de retrait le plus proche proposé par le site.</li>
        ${shop?.copy
          ? '<li>Touche <b>Copier et ouvrir</b> : le nom du produit est copié et le site s\'ouvre. Colle-le dans la barre de recherche, ajoute l\'article au panier, puis reviens ici. La case se coche toute seule.</li>'
          : '<li>Touche <b>Ouvrir</b> : le produit s\'ouvre sur le site, ajoute-le au panier, puis reviens ici. La case se coche toute seule.</li>'}
        <li>« Estimé » : l'app n'a pas encore le vrai article. Prends le format visé (pas un pack de 12 ni une salade préparée) : le prix réel peut différer.</li>
        <li>À la fin, ouvre ton panier pour choisir le créneau et payer sur le site.</li>
      </ol>
      ${min && sub < min ? `<p class="small warn-text">Minimum de commande : ${eur(min)} (il manque ${eur(min - sub)}).</p>` : ''}
    </div>
    <ul class="items order">${lines.map((l) => `<li class="${l.item?.checked ? 'done' : ''}${l === next ? ' next' : ''}">
        <input type="checkbox" class="check" data-action="check" data-id="${l.product.id}" ${l.item?.checked ? 'checked' : ''} aria-label="Dans le panier">
        <span class="name">${l.qty > 1 ? `<b>${l.qty} ×</b> ` : ''}${esc(l.product.name)}<span class="sub">${l.info?.article && l.info.kind !== 'estimate'
          ? `${esc(l.info.article)} · ${eur(l.total)}`
          : `Cherche « ${esc(l.link.query)} »${packOf(l.product) ? ` · format visé : <b>${esc(packOf(l.product))}</b>` : ''} · ≈ ${eur(l.total)} (estimé)`}</span></span>
        <a class="btn ${l === next ? 'primary' : 'soft'} small" target="_blank" rel="noopener" href="${esc(l.link.url)}" data-open="${l.product.id}"${shop?.copy ? ` data-copy="${esc(l.link.query)}"` : ''}>${shop?.copy ? 'Copier et ouvrir' : 'Ouvrir'}</a>
      </li>`).join('')}</ul>
    <a class="btn primary lg block" target="_blank" rel="noopener" href="${esc(shop?.cart ?? st.collect.url)}">${icon('cart')} ${esc(shop?.cartLabel ?? `Commander chez ${CHAINS[st.chain].name}`)}</a>
    <p class="foot">Les quantités (« 2 × ») sont à régler sur le site. L'app ne voit pas ton compte : elle coche l'article quand tu l'ouvres, décoche-le s'il n'était pas disponible.</p>`;
}

function priceSourcesNote() {
  const src = PRICES.sources ?? {};
  const real = ['colruyt', 'delhaize', 'aldi'].filter((c) => src[c]?.date).map((c) => `${CHAINS[c].name} ${dateFr(src[c].date)}`);
  const promos = src.promos?.date ? ' · Promos via <a href="https://www.prijsprofeet.be" target="_blank" rel="noopener">PrijsProfeet</a>' : '';
  return `${real.length ? `Prix réels : ${real.join(', ')}. Autres enseignes : estimés.` : 'Prix estimés.'}${promos} · Magasins © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>`;
}

// ---------- Fiabilité et fraîcheur des prix ----------
const REAL_CHAINS = ['colruyt', 'delhaize', 'aldi'];
const ageDays = (iso) => (iso ? Math.floor((Date.now() - new Date(`${iso.slice(0, 10)}T12:00:00`).getTime()) / DAY) : null);
const STALE_DAYS = 2;

function chainStatus(chain) {
  const src = PRICES.sources?.[chain];
  if (REAL_CHAINS.includes(chain) && src?.date) {
    const age = ageDays(src.date);
    const stale = src.ok === false || age > STALE_DAYS;
    return { kind: 'real', date: src.date, age, stale, error: src.ok === false ? src.error : null };
  }
  return { kind: 'approx', promos: PRICES.sources?.promos?.date && ['lidl', 'colruyt', 'delhaize', 'aldi'].includes(chain) ? PRICES.sources.promos.date : null };
}

function ago(age) {
  return age <= 0 ? "aujourd'hui" : age === 1 ? 'hier' : `il y a ${age} jours`;
}

function freshnessCard() {
  const chainsShown = state.stores.length ? [...new Set(state.stores.map((st) => st.chain))] : Object.keys(CHAINS);
  const robot = PRICES.updatedAt ? new Date(PRICES.updatedAt) : null;
  return `<div class="card">
    <div class="section-head"><h2>Fiabilité des prix</h2>${robot ? `<span class="tiny muted">robot : ${robot.toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })} ${robot.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}</span>` : ''}</div>
    <div class="store-list">${chainsShown.map((c) => {
      const st = chainStatus(c);
      const line = st.kind === 'real'
        ? `${st.stale ? '⚠️ ' : ''}Vrais prix relevés le ${dateFr(st.date)} (${ago(st.age)})${st.stale ? ' — pas mis à jour, le robot a peut-être été bloqué' : ''}`
        : `Prix approximatifs, estimés d'après Colruyt${st.promos ? ` · promos du ${dateFr(st.promos)}` : ''}`;
      return `<div class="store">${logo(c)}<div class="grow"><b>${esc(CHAINS[c].name)}</b><div class="small ${st.kind === 'real' && !st.stale ? 'muted' : 'warn-text'}">${esc(line)}</div></div>
        <span class="pill ${st.kind === 'real' && !st.stale ? 'good' : 'warn'}">${st.kind === 'real' ? (st.stale ? 'ancien' : 'réel') : 'approx.'}</span></div>`;
    }).join('')}</div>
  </div>`;
}

// Alertes pour un plan : prix approximatifs ou périmés utilisés.
function planWarnings(plan) {
  const lines = plan.stops.flatMap((st) => st.lines.map((l) => ({ chain: st.store.chain, kind: l.info?.kind })));
  const approx = [...new Set(lines.filter((l) => l.kind === 'estimate').map((l) => CHAINS[l.chain].name))];
  const stale = [...new Set(plan.stops.map((st) => st.store.chain).filter((c) => chainStatus(c).stale))];
  const out = [];
  for (const sh of plan.short ?? []) out.push(`${sh.store.collect.name} : commande minimum ${eur(sh.min)}, il manque ${eur(sh.missing)}. Ajoute des produits (ou corrige le minimum dans Réglages si le site en affiche un autre).`);
  if (approx.length) out.push(`Prix approximatifs pour ${approx.join(', ')} : vérifie en magasin.`);
  for (const c of stale) out.push(`Prix ${CHAINS[c].name} du ${dateFr(chainStatus(c).date)} : pas mis à jour depuis ${ageDays(chainStatus(c).date)} jours.`);
  return out.length ? `<div class="banner warn-banner">⚠️<span class="grow small">${out.map(esc).join('<br>')}</span></div>` : '';
}

function planText(plan) {
  const lines = [`🛒 ${plan.label} — ${eur(plan.total)} (courses ${eur(plan.goods)})`];
  for (const s of plan.stops) {
    lines.push('', `📍 ${s.store.name}`);
    for (const l of s.lines) lines.push(`☐ ${l.qty > 1 ? `${l.qty} × ` : ''}${l.product.name} (${eur(l.total)})`);
  }
  if (plan.kind === 'trip') lines.push('', `🗺️ ${mapsUrl(state.home, plan, state.settings.mode)}`);
  return lines.join('\n');
}

// Lignes du plan achetées : celles cochées, ou toutes si rien n'est coché.
function boughtLines(plan) {
  const lines = plan.stops.flatMap((s) => s.lines.map((l) => ({ ...l, chain: s.store.chain })));
  const checked = lines.filter((l) => state.list.find((x) => x.id === l.product.id)?.checked);
  return checked.length ? checked : lines;
}

// Économie : les mêmes articles au magasin le plus proche, moins le prix du plan.
function savingOf(lines) {
  const near = [...state.stores].filter((st) => st.lat != null).sort((a, b) => haversineKm(state.home, a) - haversineKm(state.home, b))[0];
  if (!near) return 0;
  const total = lines.reduce((t, l) => {
    const pr = priceInfo(l.product, near.chain, chains(), state.overrides, realPrices())?.price;
    return pr == null ? t : t + pr * l.qty - l.total;
  }, 0);
  return Math.max(0, Math.round(total * 100) / 100);
}

function finishShopping(plan, paid = null) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = boughtLines(plan);
  const estimate = Math.round((lines.reduce((t, l) => t + l.total, 0) + (plan.fees ?? 0)) * 100) / 100;
  const saving = state.home ? savingOf(lines) : 0;
  const inPlan = plan.stops.flatMap((s) => s.lines.map((l) => l.product.id));
  const checked = inPlan.filter((id) => state.list.find((l) => l.id === id)?.checked);
  const bought = new Set(checked.length ? checked : inPlan);
  state.recurring = state.recurring.map((r) => (bought.has(r.id) ? learnFrequency(r, today) : r));
  state.history.unshift({ date: today, label: plan.label, total: estimate, ...(paid != null ? { paid } : {}), saving, items: bought.size });
  state.history = state.history.slice(0, 50);
  state.list = state.list.filter((l) => !bought.has(l.id)).map((l) => ({ ...l, checked: false }));
  for (const id of bought) delete state.dishNeed?.[id];
  save();
  const left = state.list.length;
  toast(left ? `Enregistré. ${left} article${left > 1 ? 's' : ''} reste${left > 1 ? 'nt' : ''} dans la liste.` : 'Courses enregistrées 👍');
  setTab('list');
}

// ---------- Habitudes ----------
// ---------- Budget ----------
const spent = (h) => h.paid ?? h.total;
function budgetCard() {
  const s = state.settings;
  const now = new Date();
  const months = [...Array(6)].map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = d.toISOString().slice(0, 7);
    const list = state.history.filter((h) => h.date.slice(0, 7) === key);
    return { key, label: d.toLocaleDateString('fr-BE', { month: 'short' }), total: list.reduce((t, h) => t + spent(h), 0), saving: list.reduce((t, h) => t + (h.saving ?? 0), 0) };
  });
  const cur = months.at(-1);
  const budget = s.monthBudget ?? 0;
  const max = Math.max(...months.map((m) => m.total), 1);
  const savedAll = state.history.reduce((t, h) => t + (h.saving ?? 0), 0);
  const pct = budget ? Math.min(100, (cur.total / budget) * 100) : 0;
  return `<section class="hero">
      <span class="eyebrow">Budget de ${esc(now.toLocaleDateString('fr-BE', { month: 'long' }))}</span>
      <div class="row" style="align-items:baseline;gap:8px"><span class="total num">${eur(cur.total)}</span>${budget ? `<span>/ ${eur(budget)}</span>` : ''}</div>
      ${budget ? `<div class="progress"><span style="width:${pct}%${cur.total > budget ? ';background:var(--danger)' : ''}"></span></div>
        <span class="small">${cur.total > budget ? `Dépassé de ${eur(cur.total - budget)}` : `Il reste ${eur(budget - cur.total)} ce mois-ci`}</span>` : ''}
      <span class="saving">Économisé grâce à l'app : ${eur(cur.saving)} ce mois · ${eur(savedAll)} en tout</span>
    </section>
    <div class="card">
      <label class="btn soft block" style="cursor:pointer">${icon('scan')} Scanner un ticket de caisse<input type="file" id="receipt-file" accept="image/*" capture="environment" hidden></label>
      <label class="field"><span>Mon budget courses par mois</span><div class="row"><input type="number" min="0" step="10" inputmode="decimal" data-setting="monthBudget" data-num value="${budget || ''}" placeholder="ex. 300" style="max-width:140px"> <b>€</b></div></label>
      <div class="bars" role="img" aria-label="Dépenses des 6 derniers mois">${months.map((m) => `<div class="bar"><span class="num tiny">${m.total ? `${Math.round(m.total)} €` : ''}</span><i style="height:${(m.total / max) * 75}%" class="${budget && m.total > budget ? 'over' : ''}"></i><span class="tiny muted">${esc(m.label)}</span></div>`).join('')}</div>
      <p class="tiny muted">Chaque « Courses faites » compte le montant payé (ou l'estimation). Économie = les mêmes articles au magasin le plus proche, moins le prix du plan.</p>
    </div>`;
}

function viewRecurring() {
  const now = Date.now();
  const rows = state.recurring
    .map((r) => ({ ...r, p: productById(r.id), next: r.last ? new Date(r.last).getTime() + r.every * DAY : now }))
    .filter((r) => r.p).sort((a, b) => a.next - b.next);
  const s = state.settings;
  const suggestions = PRODUCTS.filter((p) => p.every && !state.recurring.some((r) => r.id === p.id));
  return `
    <h1>Budget et habitudes</h1>
    ${budgetCard()}
    <p class="muted">Les produits que tu rachètes souvent reviennent tout seuls dans ta liste. Le rythme s'ajuste quand tu valides « Courses faites ».</p>
    <div class="card">
      <label class="row"><input type="checkbox" class="switch" data-setting="autoAdd" data-bool-check ${s.autoAdd ? 'checked' : ''}><span class="grow">Ajouter automatiquement à l'ouverture</span></label>
    </div>
    <div class="card">
      <div class="section-head"><h2>Mes produits habituels</h2><span class="pill">${rows.length}</span></div>
      ${rows.length ? `<ul class="items">${rows.map((r) => {
        const days = Math.ceil((r.next - now) / DAY);
        return `<li><span class="name">${esc(r.p.name)}<span class="sub">${days <= 0 ? 'à racheter maintenant' : `dans ${days} jour${days > 1 ? 's' : ''}`}</span></span>
          <span class="small muted">tous les</span>
          <input type="number" min="1" style="width:64px;min-height:38px;text-align:right" data-action="every" data-id="${r.id}" value="${r.every}" aria-label="Jours">
          <span class="small muted">j</span>
          <button class="icon-btn" data-action="unrec" data-id="${r.id}" aria-label="Retirer">${icon('x')}</button></li>`;
      }).join('')}</ul>` : '<p class="muted small">Aucun pour l\'instant : choisis-en ci-dessous.</p>'}
    </div>
    ${suggestions.length ? `<div class="stack"><span class="eyebrow">Suggestions</span><div class="chips" style="flex-wrap:wrap">
      ${suggestions.map((p) => `<button class="chip" data-action="rec" data-id="${p.id}"><span class="plus">+</span>${esc(p.name.replace(/\s*\(.*\)$/, ''))}<span class="muted tiny">${p.every} j</span></button>`).join('')}
    </div></div>` : ''}
    <div class="card">
      <h2>Rappel dans ton agenda</h2>
      <div class="grid2">
        <label class="field">Jour<select data-setting="reminderDay" data-num>${['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'].map((d, i) => `<option value="${i}" ${s.reminderDay === i ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
        <label class="field">Heure<input type="time" data-setting="reminderTime" value="${esc(s.reminderTime)}"></label>
      </div>
      <button class="btn" data-action="ics">${icon('repeat')} Ajouter le rappel hebdomadaire</button>
    </div>
    ${state.history.length ? `<div class="card"><h2>Historique</h2><ul class="items">
      ${state.history.slice(0, 15).map((h, i) => `<li><span class="name small">${esc(dateFr(h.date))} · ${esc(h.label)}<span class="sub">${h.paid != null ? `payé ${eur(h.paid)} (estimé ${eur(h.total)})` : 'estimation'}${h.saving ? ` · −${eur(h.saving)} économisés` : ''}</span></span>
        <button class="btn ghost small num" data-action="hist-edit" data-i="${i}">${eur(spent(h))}</button>
        <button class="icon-btn" data-action="hist-del" data-i="${i}" aria-label="Supprimer">${icon('x')}</button></li>`).join('')}
    </ul></div>` : ''}`;
}

function icsReminder() {
  const s = state.settings;
  const [hh, mm] = s.reminderTime.split(':').map(Number);
  const d = new Date();
  d.setDate(d.getDate() + ((s.reminderDay - d.getDay() + 7) % 7));
  d.setHours(hh, mm, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = (x) => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
  const end = new Date(d.getTime() + 3600000);
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//grocery-opti//FR', 'BEGIN:VEVENT',
    `UID:grocery-opti-${Date.now()}@local`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(d)}`, `DTEND:${stamp(end)}`, 'RRULE:FREQ=WEEKLY',
    'SUMMARY:🛒 Courses', `DESCRIPTION:Ouvre Grocery Opti : ${location.href.split('#')[0]}`,
    'BEGIN:VALARM', 'TRIGGER:-PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Courses', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  download('rappel-courses.ics', ics, 'text/calendar');
}

function download(name, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- Prix ----------
function viewPrices() {
  const ch = chains();
  const q = norm(priceSearch.trim());
  const base = q ? allProducts().filter((p) => norm(p.name).includes(q)) : allProducts().filter((p) => state.list.some((l) => l.id === p.id));
  const list = (base.length || q ? base : PRODUCTS.slice(0, 8)).slice(0, 25);
  const shown = state.stores.length ? [...new Set(state.stores.map((s) => s.chain))] : Object.keys(ch);
  return `
    <h1>Prix</h1>
    ${freshnessCard()}
    <div class="searchbox">${icon('search')}<input type="search" id="price-search" placeholder="Comparer un produit…" value="${esc(priceSearch)}" autocomplete="off"></div>
    <p class="small muted">${q ? '' : state.list.length ? 'Les produits de ta liste.' : 'Quelques exemples.'} Touche un prix pour le corriger avec celui de ton ticket.</p>
    ${list.map((p) => {
      const infos = shown.map((k) => [k, priceInfo(p, k, ch, state.overrides, PRICES.items ?? {})]).filter(([, i]) => i);
      const min = Math.min(...infos.map(([, i]) => i.price));
      return `<div class="card"><h3>${esc(p.name)}</h3><div>${infos.sort((a, b) => a[1].price - b[1].price).map(([k, info]) => `
        <div class="price-row ${info.price === min ? 'best' : ''}">
          ${logo(k, 'sm')}
          <span class="grow"><b>${esc(ch[k].name)}</b> ${KIND[info.kind] ?? ''}${info.article ? `<span class="tiny muted" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(info.article)}${info.until ? ` · jusqu'au ${dateFr(info.until)}` : ''}</span>` : ''}</span>
          <input type="number" class="num ${info.kind === 'estimate' ? 'est' : ''}" step="0.01" min="0" data-action="price" data-id="${p.id}" data-chain="${k}" value="${info.price.toFixed(2)}" aria-label="Prix ${esc(ch[k].name)}">
          ${info.kind === 'user' ? `<button class="icon-btn" data-action="unprice" data-id="${p.id}" data-chain="${k}" aria-label="Revenir au prix automatique">${icon('undo')}</button>` : ''}
        </div>`).join('')}</div></div>`;
    }).join('') || '<div class="empty">Aucun produit trouvé.</div>'}
    <p class="foot">${priceSourcesNote()}</p>`;
}

// ---------- Réglages ----------
function viewSettings() {
  const s = state.settings;
  const ch = chains();
  return `
    <h1>Réglages</h1>
    <button class="banner tuto-entry" data-action="tuto">${icon('spark')}<span class="grow"><b>Guide en images</b><br><span class="small muted">Comment utiliser l'app, étape par étape</span></span>${icon('arrow')}</button>
    <div class="card"><h2>Mon adresse</h2>${addressForm()}</div>
    ${storesBlock()}
    ${state.home ? `<div class="card">
      <h2>Rayon de recherche</h2>
      <div class="seg">${[1.5, 3, 5].map((r) => `<button data-action="radius" data-val="${r}" aria-pressed="${s.radiusKm === r}">${String(r).replace('.', ',')} km</button>`).join('')}</div>
    </div>` : ''}
    <div class="card">
      <h2>Retrait (Collect)</h2>
      <div class="grid2">
        <label class="field"><span class="row">${logo('colruyt', 'sm')}Collect&Go : frais (€)</span><input type="number" min="0" step="0.05" data-collect="colruyt.fee" value="${s.collect.colruyt.fee}"></label>
        <label class="field"><span class="row">${logo('colruyt', 'sm')}Collect&Go : minimum (€)</span><input type="number" min="0" step="1" data-collect="colruyt.minOrder" value="${s.collect.colruyt.minOrder}"></label>
        <label class="field"><span class="row">${logo('delhaize', 'sm')}Delhaize Collect : frais (€)</span><input type="number" min="0" step="0.05" data-collect="delhaize.fee" value="${s.collect.delhaize.fee}"></label>
        <label class="field"><span class="row">${logo('delhaize', 'sm')}Delhaize Collect : minimum (€)</span><input type="number" min="0" step="1" data-collect="delhaize.minOrder" value="${s.collect.delhaize.minOrder}"></label>
      </div>
      <p class="tiny muted">Valeurs relevées le 12 oct. 2026 (Collect&Go : « à partir de 5,95 € » ; Delhaize : retrait gratuit, minimum de 30 € encore indiqué sur une page). Corrige-les si ton panier en ligne affiche autre chose.</p>
    </div>
    <div class="card">
      <h2>Calcul</h2>
      <div class="grid2">
        <label class="field">Valeur de ton temps (€/h)<input type="number" min="0" step="1" data-setting="valueOfTime" data-num value="${s.valueOfTime}"></label>
        <label class="field">Minutes par magasin<input type="number" min="0" data-setting="minutesPerStore" data-num value="${s.minutesPerStore}"></label>
      </div>
      <label class="row"><input type="checkbox" class="switch" data-setting="openNow" data-bool-check ${s.openNow ? 'checked' : ''}><span class="grow">Seulement les magasins ouverts maintenant</span></label>
      <details><summary class="small muted">Niveaux de prix estimés par enseigne</summary>
        <div class="grid2" style="margin-top:10px">${Object.entries(ch).map(([k, c]) => `
          <label class="field"><span class="row">${logo(k, 'sm')}${esc(c.name)}</span><input type="number" min="50" max="200" data-action="index" data-chain="${k}" value="${c.index}"></label>`).join('')}</div>
        <p class="tiny muted" style="margin-top:8px">Colruyt = 100. Sert seulement quand on n'a pas le vrai prix.</p>
      </details>
    </div>
    <div class="card">
      <h2>Mes données</h2>
      <div class="row wrap">
        <button class="btn" data-action="export">Exporter</button>
        <label class="btn">Importer<input type="file" id="import" accept="application/json" hidden></label>
        <button class="btn danger" data-action="reset">Tout effacer</button>
      </div>
      <p class="tiny muted">Tout reste sur ce téléphone : liste, adresse, prix saisis.</p>
    </div>
    <p class="foot">${priceSourcesNote()}</p>`;
}

async function locate(kind) {
  const typed = document.getElementById('home-input')?.value.trim(); // lu avant de réafficher
  if (kind === 'address' && !typed) { toast('Tape ton adresse'); return; }
  busy = kind;
  render();
  try {
    let home;
    if (kind === 'gps') {
      const pos = await currentPosition();
      const address = (await reverseGeocode(pos.lat, pos.lng).catch(() => null)) ?? 'Ma position';
      home = { address, ...pos };
    } else {
      home = await geocodeAddress(typed);
      if (!home) { toast('Adresse introuvable, vérifie la rue et la commune'); return; }
    }
    state.home = home;
    await refreshStores();
  } catch (e) {
    toast(e?.code === 1 ? 'Autorise la localisation dans ton navigateur' : 'Pas de connexion, réessaie dans un instant');
  } finally {
    busy = null;
    save();
    render();
  }
}

async function refreshStores() {
  const found = await findStores(state.home, state.settings.radiusKm);
  state.stores = found;
  save();
  toast(found.length ? `${found.length} supermarché${found.length > 1 ? 's' : ''} trouvé${found.length > 1 ? 's' : ''}` : 'Aucun supermarché suivi dans ce rayon');
}

// ---------- Événements ----------
document.addEventListener('click', async (e) => {
  const tab = e.target.closest('[data-tab]');
  if (tab) { if (tab.dataset.tab === 'plan') { shownPlan = null; orderStop = null; } if (tab.dataset.tab === 'list') { smartOpen = false; quiz = null; } if (tab.dataset.tab === 'plats' && state.tab === 'plats') recipeOpen = null; setTab(tab.dataset.tab); return; }
  // Panier assisté : ouvrir un produit sur le site le coche comme « dans le panier ».
  const open = e.target.closest('a[data-open]');
  if (open) {
    const item = state.list.find((l) => l.id === open.dataset.open);
    if ('copy' in open.dataset) navigator.clipboard?.writeText(open.dataset.copy).then(() => toast(`« ${open.dataset.copy} » copié : colle-le dans la recherche`), () => {});
    if (item && !item.checked) { item.checked = true; save(); setTimeout(render, 300); }
    return;
  }
  const b = e.target.closest('button[data-action]');
  if (!b) return;
  const a = b.dataset.action;
  const id = b.dataset.id;
  const plan = () => lastPlans.find((p) => p.id === b.dataset.plan);

  if (a === 'add') {
    const ex = state.list.find((l) => l.id === id);
    if (ex) ex.qty++; else state.list.push({ id, qty: 1, checked: false });
    search = '';
    save();
    render();
    toast(`${productById(id)?.name.replace(/\s*\(.*\)$/, '')} ajouté`);
  } else if (a === 'quiz') {
    startQuiz(b.dataset.val);
    render();
    window.scrollTo({ top: 0 });
  } else if (a === 'quiz-pick') {
    const q = questionsFor(quiz.mode)[quiz.i];
    const v = q.options.find((o) => String(o.value) === b.dataset.val).value;
    if (q.type === 'many') {
      const cur = new Set((quiz.answers[q.id] ?? []).map(String));
      if (cur.has(String(v))) cur.delete(String(v)); else cur.add(String(v));
      quiz.answers[q.id] = q.options.map((o) => o.value).filter((x) => cur.has(String(x)));
      render();
    } else {
      quiz.answers[q.id] = v;
      if (quiz.i + 1 < questionsFor(quiz.mode).length) quiz.i++; else finishQuiz();
      render();
    }
  } else if (a === 'quiz-next') {
    if (quiz.i + 1 < questionsFor(quiz.mode).length) { quiz.i++; render(); } else finishQuiz();
  } else if (a === 'quiz-back') {
    if (quiz.i) quiz.i--; else quiz = null;
    render();
  } else if (a === 'dish-swap') {
    const sm = smartSettings();
    const cur = sm.dishes.find((d) => d.id === id);
    const [next] = proposeDishes({ ...(sm.profile ?? {}), dinners: recipeById(id).type === 'plat' ? 1 : 0, dessert: recipeById(id).type === 'dessert' ? 1 : 0 },
      [...sm.dishes.map((d) => d.id), ...(sm.swapped ?? [])]);
    sm.swapped = [...(sm.swapped ?? []), id].slice(-40);
    if (next && cur) Object.assign(cur, { id: next.id }); else toast('Pas d\'autre plat compatible');
    save();
    render();
  } else if (a === 'dish-remove') {
    const sm = smartSettings();
    sm.dishes = sm.dishes.filter((d) => d.id !== id);
    save();
    render();
  } else if (a === 'recipe-open') {
    recipeOpen = id;
    if (state.tab !== 'plats') { smartOpen = false; setTab('plats'); } else { render(); window.scrollTo({ top: 0 }); }
  } else if (a === 'recipe-back') {
    recipeOpen = null;
    render();
  } else if (a === 'recipe-type') {
    recipeType = b.dataset.val;
    render();
  } else if (a === 'recipe-quick') {
    recipeQuick = !recipeQuick;
    render();
  } else if (a === 'kitchen') {
    const k = kitchen();
    k[b.dataset.val] = !k[b.dataset.val];
    save();
    render();
  } else if (a === 'diet') {
    state.settings.diet = b.dataset.val;
    save();
    render();
  } else if (a === 'servings') {
    state.settings.servings = Math.max(1, (state.settings.servings ?? smartSettings().profile?.people ?? 1) + Number(b.dataset.d));
    save();
    render();
  } else if (a === 'recipe-add') {
    const r = recipeById(id);
    addDish(r, state.settings.servings ?? smartSettings().profile?.people ?? 1);
    save();
    toast(`Ingrédients de « ${r.name} » ajoutés à ta liste`);
    recipeOpen = null;
    render();
  } else if (a === 'menu-clear') {
    state.menu = [];
    save();
    render();
  } else if (a === 'hist-edit') {
    const h = state.history[Number(b.dataset.i)];
    const v = await ask('Montant payé (€)', { input: spent(h).toFixed(2).replace('.', ','), ok: 'Enregistrer' });
    const n = v == null ? null : Number(String(v).replace(',', '.'));
    if (Number.isFinite(n) && n >= 0) { h.paid = n; save(); render(); }
  } else if (a === 'hist-del') {
    if (await ask('Supprimer ces courses de l\'historique ?', { ok: 'Supprimer' })) { state.history.splice(Number(b.dataset.i), 1); save(); render(); }
  } else if (a === 'voice') {
    dictate();
  } else if (a === 'scan') {
    scan();
  } else if (a === 'smart-open') {
    smartOpen = true;
    render();
    window.scrollTo({ top: 0 });
  } else if (a === 'smart-close') {
    smartOpen = false;
    render();
  } else if (a === 'smart-budget') {
    smartSettings().budget = Number(b.dataset.val);
    save();
    render();
  } else if (a === 'smart-shop') {
    const sm = smartSettings();
    if (sm.shop !== b.dataset.val) { sm.shop = b.dataset.val; sm.pins = {}; }
    save();
    render();
  } else if (a === 'smart-goal') {
    smartSettings().goal = b.dataset.val;
    save();
    render();
  } else if (a === 'smart-pin') {
    const pins = smartSettings().pins;
    const i = Number(b.dataset.i);
    if (pins[id] === i) delete pins[id]; else pins[id] = i;
    save();
    render();
  } else if (a === 'smart-remove') {
    smartSettings().removed[id] = true;
    save();
    render();
  } else if (a === 'smart-apply') {
    applySmart();
  } else if (a === 'tuto') {
    openTuto({ icon, logo, nutri: nutriBadge });
  } else if (a === 'healthy') {
    state.settings.healthy = !state.settings.healthy;
    save();
    const res = document.getElementById('results');
    if (res) res.innerHTML = searchResults();
    return;
  } else if (a === 'add-cat') {
    const chain = b.dataset.chain ?? 'colruyt';
    const r = rowById(chain, id);
    if (!r) return;
    const p = catalogProduct(r, chain);
    if (!state.custom.some((c) => c.id === p.id)) state.custom.push(p);
    const ex = state.list.find((l) => l.id === p.id);
    if (ex) ex.qty++; else state.list.push({ id: p.id, qty: 1, checked: false });
    search = '';
    save();
    render();
    toast(`${rowName(r)} ajouté`);
  } else if (a === 'add-custom') {
    const name = search.trim();
    const answer = await ask(`Prix approximatif de « ${name} » (€) ?`, { input: '2', ok: 'Ajouter' });
    if (answer == null) return;
    const ref = Number(String(answer).replace(',', '.'));
    const p = { id: `perso-${Date.now()}`, name, cat: 4, ref: Number.isFinite(ref) && ref > 0 ? ref : 2, custom: true };
    state.custom.push(p);
    state.list.push({ id: p.id, qty: 1, checked: false });
    search = '';
    save();
    render();
  } else if (a === 'qty') {
    const it = state.list.find((l) => l.id === id);
    if (it) it.qty += Number(b.dataset.d);
    if (state.dishNeed) delete state.dishNeed[id];
    state.list = state.list.filter((l) => l.qty > 0);
    save();
    render();
  } else if (a === 'clear') {
    if (await ask('Vider la liste ?', { ok: 'Vider' })) { state.list = []; state.dishNeed = {}; save(); render(); }
  } else if (a === 'add-due') {
    autoAddDue();
    render();
  } else if (a === 'skip-setup') {
    state.skipSetup = true;
    save();
    render();
  } else if (a === 'set-address') {
    locate('address');
  } else if (a === 'use-gps') {
    locate('gps');
  } else if (a === 'radius') {
    state.settings.radiusKm = Number(b.dataset.val);
    save();
    busy = 'address';
    render();
    try { await refreshStores(); } catch { toast('Pas de connexion, réessaie'); }
    busy = null;
    render();
  } else if (a === 'set') {
    state.settings[b.dataset.key] = 'num' in b.dataset ? Number(b.dataset.val) : b.dataset.val;
    shownPlan = null;
    save();
    render();
  } else if (a === 'order') {
    orderStop = id;
    render();
    window.scrollTo({ top: 0 });
  } else if (a === 'order-back') {
    orderStop = null;
    render();
  } else if (a === 'show-plan') {
    shownPlan = b.dataset.plan;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (a === 'copy') {
    const text = planText(plan());
    try { await navigator.clipboard.writeText(text); toast('Liste copiée'); } catch { ask('Sélectionne le texte et copie-le :', { text, cancel: null, ok: 'Fermer' }); }
  } else if (a === 'done') {
    const p = plan();
    const anyChecked = p.stops.some((st) => st.lines.some((l) => state.list.find((x) => x.id === l.product.id)?.checked));
    const msg = anyChecked
      ? 'Marquer les articles cochés comme achetés ? Les autres restent dans ta liste.'
      : 'Aucun article coché : marquer tout le plan comme acheté ?';
    if (!(await ask(msg, { ok: 'Oui, c\'est fait' }))) return;
    const est = boughtLines(p).reduce((t, l) => t + l.total, 0) + (p.fees ?? 0);
    const paid = await ask('Combien as-tu payé ? (pour le suivi du budget)', { input: est.toFixed(2).replace('.', ','), ok: 'Enregistrer', cancel: 'Passer' });
    const n = paid == null ? null : Number(String(paid).replace(',', '.'));
    finishShopping(p, Number.isFinite(n) && n > 0 ? n : null);
  } else if (a === 'rec') {
    const p = productById(id);
    state.recurring.push({ id, every: p.every ?? 7 });
    save();
    render();
  } else if (a === 'unrec') {
    state.recurring = state.recurring.filter((r) => r.id !== id);
    save();
    render();
  } else if (a === 'unprice') {
    delete state.overrides[id]?.[b.dataset.chain];
    save();
    render();
  } else if (a === 'ics') {
    icsReminder();
  } else if (a === 'export') {
    download(`grocery-opti-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), 'application/json');
  } else if (a === 'reset') {
    if (await ask('Tout effacer (liste, adresse, prix saisis, habitudes) ?', { ok: 'Tout effacer' })) { state = defaults(); save(); render(); }
  }
});

view.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'search') {
    search = t.value;
    document.getElementById('results').innerHTML = searchResults();
  } else if (t.id === 'recipe-search') {
    recipeSearch = t.value;
    const pos = t.selectionStart;
    render();
    const el = document.getElementById('recipe-search');
    el.focus();
    el.setSelectionRange(pos, pos);
  } else if (t.id === 'price-search') {
    priceSearch = t.value;
    const pos = t.selectionStart;
    render();
    const el = document.getElementById('price-search');
    el.focus();
    el.setSelectionRange(pos, pos);
  }
});

view.addEventListener('keydown', (e) => {
  if (e.target.id === 'search' && e.key === 'Enter') view.querySelector('#results button')?.click();
  if (e.target.id === 'home-input' && e.key === 'Enter') locate('address');
});

view.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.setting) {
    let v = t.value;
    if ('num' in t.dataset) v = Number(v);
    if ('boolCheck' in t.dataset) v = t.checked;
    state.settings[t.dataset.setting] = v;
    save();
    render();
    return;
  }
  if (t.dataset.collect) {
    const [chain, key] = t.dataset.collect.split('.');
    state.settings.collect[chain][key] = Math.max(0, Number(t.value) || 0);
    save();
    toast('Enregistré');
    return;
  }
  if (t.id === 'receipt-file' && t.files?.[0]) { readReceipt(t.files[0]); t.value = ''; return; }
  if (t.id === 'smart-budget') {
    smartSettings().budget = Math.max(1, Number(String(t.value).replace(',', '.')) || 1);
    save();
    render();
    return;
  }
  const a = t.dataset.action;
  if (a === 'smart-must') {
    const opt = smartSettings().optional;
    if (t.checked) delete opt[t.dataset.id]; else opt[t.dataset.id] = true;
    save();
    render();
  } else if (a === 'check') {
    const item = state.list.find((l) => l.id === t.dataset.id);
    if (item) item.checked = t.checked;
    t.closest('li')?.classList.toggle('done', t.checked);
    save();
    if (orderStop) render(); // met à jour la progression du panier
  } else if (a === 'every') {
    const r = state.recurring.find((x) => x.id === t.dataset.id);
    if (r) r.every = Math.max(1, Number(t.value) || 1);
    save();
    render();
  } else if (a === 'price') {
    const val = Number(t.value);
    state.overrides[t.dataset.id] = { ...(state.overrides[t.dataset.id] ?? {}) };
    if (t.value === '' || Number.isNaN(val)) delete state.overrides[t.dataset.id][t.dataset.chain];
    else state.overrides[t.dataset.id][t.dataset.chain] = Math.round(val * 100) / 100;
    save();
    render();
    toast('Prix enregistré');
  } else if (a === 'index') {
    state.chainIndex[t.dataset.chain] = Number(t.value) || CHAINS[t.dataset.chain].index;
    save();
    render();
  } else if (a === 'toggle-store') {
    const ex = new Set(state.settings.excluded);
    if (t.checked) ex.delete(t.dataset.id); else ex.add(t.dataset.id);
    state.settings.excluded = [...ex];
    save();
  } else if (t.id === 'import' && t.files[0]) {
    t.files[0].text().then((txt) => {
      try {
        state = migrate(JSON.parse(txt));
        save();
        render();
        toast('Données importées');
      } catch { toast('Fichier invalide'); }
    });
  }
});

// ---------- Démarrage ----------
if (state.settings.autoAdd) autoAddDue({ silent: false });
render();
loadPrices();
if (state.custom.some(isArticle)) loadCatalog();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
