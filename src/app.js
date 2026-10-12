import { CHAINS, DELIVERY, CATEGORIES, PRODUCTS } from './data.js';
import {
  MODES, DEFAULT_SETTINGS, optimize, priceInfo, mapsUrl, dueRecurring, learnFrequency, isOpen, haversineKm,
} from './optimizer.js';
import { geocodeAddress, reverseGeocode, currentPosition, findStores, todayHours } from './places.js';

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
    settings: { ...DEFAULT_SETTINGS, autoAdd: true, radiusKm: 3, reminderDay: 6, reminderTime: '10:00' },
    home: null, // { address, lat, lng } : choisi par l'utilisateur
    stores: [], // supermarchés trouvés autour du domicile
    history: [],
  };
}

// Anciennes versions : une adresse et des magasins étaient pré-remplis.
// On les efface pour repartir de l'adresse choisie par l'utilisateur.
function migrate(saved) {
  const s = { ...defaults(), ...saved, settings: { ...defaults().settings, ...saved.settings } };
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

// ---------- Utilitaires ----------
const eur = (x) => x.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
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
  estimate: '<span class="pill">estimé</span>',
  user: '<span class="pill">ton prix</span>',
  real: '',
};

function computePlans() {
  return optimize({
    items: state.list,
    products: allProducts(),
    stores: state.stores,
    delivery: DELIVERY,
    chains: chains(),
    overrides: state.overrides,
    real: PRICES.items ?? {},
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
  ['plan', 'route', 'Plan'],
  ['recurring', 'repeat', 'Habitudes'],
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
  const showSetup = !state.home && state.tab !== 'prices' && state.tab !== 'recurring';
  const views = { list: viewList, plan: viewPlan, recurring: viewRecurring, prices: viewPrices, settings: viewSettings };
  view.innerHTML = showSetup && (state.tab === 'plan' || state.tab === 'settings' || !state.skipSetup) ? viewSetup() : (views[state.tab] ?? viewList)();
  const cta = document.getElementById('cta');
  const showCta = state.tab === 'list' && state.list.length && !(showSetup && !state.skipSetup);
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
    ${state.tab === 'list' ? '<button class="btn ghost" data-action="skip-setup">Plus tard, voir ma liste</button>' : ''}
  </section>`;
}

// ---------- Liste ----------
function searchResults() {
  if (!search.trim()) return '';
  const q = norm(search.trim());
  const rank = (n) => (n.startsWith(q) ? 0 : new RegExp(`(^|[^a-z])${q.replace(/[^a-z0-9 ]/g, '')}`).test(n) ? 1 : 2);
  const hits = allProducts().filter((p) => norm(p.name).includes(q))
    .sort((a, b) => rank(norm(a.name)) - rank(norm(b.name))).slice(0, 7);
  const exact = hits.some((p) => norm(p.name) === q);
  return hits.map((p) => `<button data-action="add" data-id="${p.id}"><span>${esc(p.name)}</span><span class="plus">${icon('plus')}</span></button>`).join('') +
    (exact ? '' : `<button data-action="add-custom"><span>Ajouter « ${esc(search.trim())} »</span><span class="small muted">nouveau</span></button>`);
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
      <li><span class="name">${esc(l.p.name)}</span>
        <span class="stepper">
          <button data-action="qty" data-id="${l.id}" data-d="-1" aria-label="Moins">${icon(l.qty > 1 ? 'minus' : 'x')}</button>
          <b class="num">${l.qty}</b>
          <button data-action="qty" data-id="${l.id}" data-d="1" aria-label="Plus">${icon('plus')}</button>
        </span></li>`).join('')}</ul></div>`).join('');
  return `
    <div class="section-head"><h1>Ma liste</h1>${state.list.length ? '<button class="btn ghost danger small" data-action="clear">Vider</button>' : ''}</div>
    ${due.length ? `<div class="banner">${icon('repeat')}<span class="grow">${due.length} produit${due.length > 1 ? 's' : ''} habituel${due.length > 1 ? 's' : ''} à racheter</span><button class="btn primary" data-action="add-due">Ajouter</button></div>` : ''}
    <div><div class="searchbox">${icon('search')}<input type="search" id="search" placeholder="Ajouter un produit…" value="${esc(search)}" autocomplete="off" enterkeyhint="done"></div>
      <div class="results" id="results">${searchResults()}</div></div>
    ${quickChips()}
    ${state.list.length ? `<div class="card">${listHtml}</div>` : `<div class="empty">${icon('cart')}<b>Ta liste est vide</b><span>Cherche un produit ou touche un ajout rapide.</span></div>`}`;
}

// ---------- Plan ----------
let lastPlans = [];
let shownPlan = null;

function routeLogos(plan) {
  return `<div class="route">${plan.stops.map((s, i) => `${i ? `<span class="arrow">${icon('arrow')}</span>` : ''}${logo(s.store.chain)}`).join('')}</div>`;
}

function prefsBar() {
  const s = state.settings;
  return `<div class="stack">
    <div class="seg" role="group" aria-label="Déplacement">${Object.entries(MODES).map(([k, m]) => `<button data-action="set" data-key="mode" data-val="${k}" aria-pressed="${s.mode === k}">${m.label}</button>`).join('')}</div>
    <div class="seg" role="group" aria-label="Nombre de magasins au maximum">${[1, 2, 3].map((n) => `<button data-action="set" data-key="maxStores" data-val="${n}" data-num aria-pressed="${s.maxStores === n}">${n} magasin${n > 1 ? 's' : ''}</button>`).join('')}</div>
  </div>`;
}

function viewPlan() {
  if (!state.list.length) return `<h1>Meilleur plan</h1><div class="empty">${icon('route')}<b>Ajoute d'abord des produits à ta liste</b><button class="btn primary" data-tab="list">Ouvrir ma liste</button></div>`;
  if (!state.stores.length) return `<h1>Meilleur plan</h1><div class="card">${icon('pin')}<b>Aucun supermarché trouvé autour de ton adresse.</b><p class="small muted">Vérifie l'adresse ou élargis le rayon dans Réglages.</p><button class="btn primary" data-tab="settings">Réglages</button></div>`;
  lastPlans = computePlans();
  if (!lastPlans.length) return `<h1>Meilleur plan</h1>${prefsBar()}<div class="empty">${icon('route')}<b>Aucun plan possible</b><span>Magasins exclus, ou produits introuvables avec ces réglages.</span></div>`;
  const singles = lastPlans.filter((p) => p.kind === 'trip' && p.stops.length === 1);
  const nearest = [...singles].sort((a, b) => a.travel.km - b.travel.km)[0];
  const plan = lastPlans.find((p) => p.id === shownPlan) ?? lastPlans[0];
  const isBest = plan === lastPlans[0];
  const saving = nearest ? nearest.total - plan.total : 0;

  const stops = plan.stops.map((s, i) => {
    const st = s.store;
    const sub = s.lines.reduce((a, l) => a + l.total, 0);
    const km = st.lat != null ? kmFromHome(st) : null;
    const status = st.hours ? (isOpen(st, new Date()) ? `<span class="pill good">ouvert · ${esc(todayHours(st.hours))}</span>` : `<span class="pill warn">fermé maintenant</span>`) : '';
    return `<div class="card">
      <div class="stop-head">
        ${plan.kind === 'trip' ? `<span class="step-num">${i + 1}</span>` : ''}${logo(st.chain, 'lg')}
        <div class="grow"><h3>${esc(st.name)}</h3><div class="small muted">${esc(st.address ?? '')}${km != null ? ` · ${km.toFixed(1)} km` : ''}</div></div>
        <b class="num">${eur(sub)}</b>
      </div>
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
        <div class="stack" style="gap:6px"><span class="eyebrow">${isBest ? 'Le moins cher au total' : 'Autre option'}${plan.kind === 'delivery' ? ' · commande en ligne' : ''}</span>
          <span class="plan-name">${esc(plan.label)}</span>
          <div class="total num">${eur(plan.total)}</div>
          ${isBest && saving > 0.01 ? `<span class="saving">−${eur(saving)} vs le magasin le plus proche</span>` : ''}
        </div>
        ${routeLogos(plan)}
      </div>
      <div class="stats">
        <div><b class="num">${eur(plan.goods)}</b><span>courses</span></div>
        <div><b class="num">${plan.travel.minutes} min</b><span>${plan.travel.km.toFixed(1)} km</span></div>
        <div><b class="num">${eur(plan.travel.cost + plan.fees)}</b><span>${plan.fees ? 'frais + temps' : 'ton temps'}</span></div>
      </div>
    </section>
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
        <span class="grow small">${esc(p.label)}</span>
        <span style="text-align:right"><b class="num">${eur(p.total)}</b><br><span class="diff num">+${eur(p.total - lastPlans[0].total)}</span></span>
      </button>`).join('')}</div>` : ''}
    <p class="foot">${priceSourcesNote()}<br>Coût total = courses + frais + ton temps (${eur(state.settings.valueOfTime)}/h, modifiable dans Réglages).</p>`;
}

function priceSourcesNote() {
  const src = PRICES.sources ?? {};
  const real = ['colruyt', 'delhaize', 'aldi'].filter((c) => src[c]?.date).map((c) => `${CHAINS[c].name} ${dateFr(src[c].date)}`);
  const promos = src.promos?.date ? ' · Promos via <a href="https://www.prijsprofeet.be" target="_blank" rel="noopener">PrijsProfeet</a>' : '';
  return `${real.length ? `Prix réels : ${real.join(', ')}. Autres enseignes : estimés.` : 'Prix estimés.'}${promos} · Magasins © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>`;
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

function finishShopping(plan) {
  const today = new Date().toISOString().slice(0, 10);
  const inPlan = plan.stops.flatMap((s) => s.lines.map((l) => l.product.id));
  const checked = inPlan.filter((id) => state.list.find((l) => l.id === id)?.checked);
  const bought = new Set(checked.length ? checked : inPlan);
  state.recurring = state.recurring.map((r) => (bought.has(r.id) ? learnFrequency(r, today) : r));
  state.history.unshift({ date: today, label: plan.label, total: plan.goods, items: bought.size });
  state.history = state.history.slice(0, 50);
  state.list = state.list.filter((l) => !bought.has(l.id)).map((l) => ({ ...l, checked: false }));
  save();
  const left = state.list.length;
  toast(left ? `Enregistré. ${left} article${left > 1 ? 's' : ''} reste${left > 1 ? 'nt' : ''} dans la liste.` : 'Courses enregistrées 👍');
  setTab('list');
}

// ---------- Habitudes ----------
function viewRecurring() {
  const now = Date.now();
  const rows = state.recurring
    .map((r) => ({ ...r, p: productById(r.id), next: r.last ? new Date(r.last).getTime() + r.every * DAY : now }))
    .filter((r) => r.p).sort((a, b) => a.next - b.next);
  const s = state.settings;
  const suggestions = PRODUCTS.filter((p) => p.every && !state.recurring.some((r) => r.id === p.id));
  return `
    <h1>Habitudes</h1>
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
      ${state.history.slice(0, 10).map((h) => `<li><span class="name small">${esc(dateFr(h.date))} · ${esc(h.label)}</span><span class="num">${eur(h.total)}</span></li>`).join('')}
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
    <div class="card"><h2>Mon adresse</h2>${addressForm()}</div>
    ${storesBlock()}
    ${state.home ? `<div class="card">
      <h2>Rayon de recherche</h2>
      <div class="seg">${[1.5, 3, 5].map((r) => `<button data-action="radius" data-val="${r}" aria-pressed="${s.radiusKm === r}">${String(r).replace('.', ',')} km</button>`).join('')}</div>
    </div>` : ''}
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
  if (tab) { if (tab.dataset.tab === 'plan') shownPlan = null; setTab(tab.dataset.tab); return; }
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
    state.list = state.list.filter((l) => l.qty > 0);
    save();
    render();
  } else if (a === 'clear') {
    if (await ask('Vider la liste ?', { ok: 'Vider' })) { state.list = []; save(); render(); }
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
    if (await ask(msg, { ok: 'Oui, c\'est fait' })) finishShopping(p);
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
  const a = t.dataset.action;
  if (a === 'check') {
    const item = state.list.find((l) => l.id === t.dataset.id);
    if (item) item.checked = t.checked;
    t.closest('li')?.classList.toggle('done', t.checked);
    save();
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

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
