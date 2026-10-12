import { HOME, CHAINS, STORES, DELIVERY, CATEGORIES, PRODUCTS } from './data.js';
import {
  MODES, DEFAULT_SETTINGS, optimize, priceInfo, mapsUrl, dueRecurring, learnFrequency, isOpen,
} from './optimizer.js';

// ---------- État persistant ----------
const KEY = 'courses-opti:v1';
const DAY = 86400000;

function defaults() {
  return {
    tab: 'list',
    list: [], // { id, qty, checked }
    recurring: [], // { id, every, last } : à choisir dans l'onglet Auto
    overrides: {}, // { productId: { chain: prix } } prix réellement constatés
    custom: [], // produits ajoutés par l'utilisateur
    chainIndex: {}, // indices de prix modifiés
    settings: { ...DEFAULT_SETTINGS, autoAdd: true, reminderDay: 6, reminderTime: '10:00' },
    home: { ...HOME },
    coords: {}, // { storeId: {lat,lng} } issus du géocodage
    geocoded: false,
    history: [], // { date, plan, total }
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      return merge(JSON.parse(raw));
    }
  } catch { /* stockage indisponible : on repart des valeurs par défaut */ }
  return defaults();
}

// Dans claude.ai (Artifact), les données sont aussi gardées sur ton compte
// via la capacité `db` : la liste te suit d'un appareil à l'autre.
const IN_CLAUDE = typeof window.claude?.use === 'function';

function merge(saved) {
  const d = defaults();
  return { ...d, ...saved, settings: { ...d.settings, ...saved.settings } };
}

let state = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  scheduleCloud();
}

let cloudDoc = null;
let cloudTimer;
let cloudBusy = false;
let cloudDirty = false;

function scheduleCloud() {
  if (!cloudDoc) return;
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(pushCloud, 800);
}

async function pushCloud() {
  if (!cloudDoc) return;
  if (cloudBusy) { cloudDirty = true; return; }
  cloudBusy = true;
  try {
    await cloudDoc.set({ state: JSON.stringify(state), updatedAt: Date.now() });
  } catch { /* hors ligne ou lecture seule : la copie locale reste */ }
  cloudBusy = false;
  if (cloudDirty) { cloudDirty = false; pushCloud(); }
}

async function connectCloud() {
  if (!IN_CLAUDE) return;
  try {
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    const uid = user ? await user.id() : null;
    if (!db || !uid) return;
    const ref = db.doc(`data/users/${uid}/state`);
    const snap = await ref.get();
    cloudDoc = ref;
    if (snap.exists && typeof snap.data().state === 'string') {
      state = merge(JSON.parse(snap.data().state));
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
      if (state.settings.autoAdd) autoAddDue({ silent: true });
      render();
    } else {
      pushCloud();
    }
  } catch { /* pas de synchro : l'app marche en local */ }
}

// ---------- Vrais prix (data/prices.json, mis à jour chaque nuit) ----------
let PRICES = { items: {}, sources: {} };

async function loadPrices() {
  if (window.__PRICES__) PRICES = window.__PRICES__;
  else {
    try {
      const res = await fetch('data/prices.json', { cache: 'no-cache' });
      if (res.ok) PRICES = await res.json();
    } catch { /* hors ligne : estimations */ }
  }
  render();
}

const dateFr = (iso) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' }) : '');

function priceSourcesNote() {
  const src = PRICES.sources ?? {};
  const real = ['colruyt', 'delhaize', 'aldi'].filter((c) => src[c]?.date)
    .map((c) => `${CHAINS[c].name} (${dateFr(src[c].date)}${src[c].ok === false ? ', donnée ancienne' : ''})`);
  const estimated = Object.keys(CHAINS).filter((c) => !src[c]?.date).map((c) => CHAINS[c].name);
  const promos = src.promos?.date ? ' Promotions via <a href="https://www.prijsprofeet.be" target="_blank" rel="noopener">PrijsProfeet</a>.' : '';
  if (!real.length) return `Pas encore de prix réels : estimations pour toutes les enseignes.${promos}`;
  return `Prix réels : ${real.join(', ')}.${estimated.length ? ` Estimés à partir des prix Colruyt : ${estimated.join(', ')}.` : ''}${promos}`;
}

const KIND_BADGE = {
  promo: '<span class="pill promo">promo</span>',
  estimate: '<span class="pill">estim.</span>',
  user: '<span class="pill">ton prix</span>',
  real: '',
};

// ---------- Dérivés ----------
const allProducts = () => [...PRODUCTS, ...state.custom];
const productById = (id) => allProducts().find((p) => p.id === id);
const chains = () => Object.fromEntries(
  Object.entries(CHAINS).map(([k, c]) => [k, { ...c, index: state.chainIndex[k] ?? c.index }]),
);
const stores = () => STORES.map((s) => ({ ...s, ...(state.coords[s.id] ?? {}) }));
const eur = (x) => x.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function computePlans() {
  return optimize({
    items: state.list,
    products: allProducts(),
    stores: stores(),
    delivery: DELIVERY,
    chains: chains(),
    overrides: state.overrides,
    real: PRICES.items ?? {},
    home: state.home,
    settings: state.settings,
  });
}

// ---------- Automatisme : récurrents à racheter ----------
function autoAddDue({ silent } = {}) {
  const due = dueRecurring(state.recurring).filter((r) => !state.list.some((l) => l.id === r.id));
  if (!due.length) return 0;
  for (const r of due) state.list.push({ id: r.id, qty: 1, checked: false });
  save();
  if (!silent) toast(`${due.length} produit(s) récurrent(s) ajouté(s)`);
  return due.length;
}

// ---------- UI helpers ----------
const view = document.getElementById('view');
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

function setTab(tab) {
  state.tab = tab;
  save();
  render();
  window.scrollTo(0, 0);
}

// Boîte de dialogue dans la page (confirm/prompt sont bloqués dans certains navigateurs intégrés).
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
    (wrap.querySelector('#ask-input') ?? wrap.querySelector('#ask-text') ?? wrap.querySelector('[data-r="1"]')).focus();
    wrap.querySelector('#ask-text')?.select();
  });
}

let search = '';
let priceSearch = '';

function render() {
  document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === state.tab)));
  document.getElementById('home-label').textContent = `📍 ${state.home.address}`;
  const views = { list: viewList, plan: viewPlan, recurring: viewRecurring, prices: viewPrices, settings: viewSettings };
  view.innerHTML = (views[state.tab] ?? viewList)();
}

// ---------- Vue : Liste ----------
function searchResults() {
  if (!search.trim()) return '';
  const q = norm(search.trim());
  // D'abord les noms qui commencent par la recherche, puis un mot qui commence par elle.
  const rank = (n) => (n.startsWith(q) ? 0 : new RegExp(`(^|[^a-z])${q.replace(/[^a-z0-9 ]/g, '')}`).test(n) ? 1 : 2);
  const hits = allProducts().filter((p) => norm(p.name).includes(q))
    .sort((a, b) => rank(norm(a.name)) - rank(norm(b.name))).slice(0, 8);
  const exact = hits.some((p) => norm(p.name) === q);
  return `<div class="suggest">
    ${hits.map((p) => `<button data-action="add" data-id="${p.id}"><span>${esc(p.name)}</span><span class="muted num">≈ ${eur(p.ref)}</span></button>`).join('')}
    ${exact ? '' : `<button data-action="add-custom"><span>➕ Ajouter « ${esc(search.trim())} »</span><span class="muted small">nouveau produit</span></button>`}
  </div>`;
}

function groupedList(lines, renderLine) {
  const groups = new Map();
  for (const l of lines) {
    const p = productById(l.id);
    if (!p) continue;
    const cat = CATEGORIES[p.cat] ?? 'Divers';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push({ ...l, p });
  }
  return [...groups.entries()]
    .sort((a, b) => CATEGORIES.indexOf(a[0]) - CATEGORIES.indexOf(b[0]))
    .map(([cat, ls]) => `<div class="cat">${esc(cat)}</div><ul class="items">${ls.map(renderLine).join('')}</ul>`)
    .join('');
}

function viewList() {
  const due = dueRecurring(state.recurring).filter((r) => !state.list.some((l) => l.id === r.id));
  const banner = due.length
    ? `<div class="banner"><span>🔁 <b>${due.length}</b> produit(s) récurrent(s) à racheter</span>
         <button class="btn primary" data-action="add-due">Ajouter</button></div>`
    : '';
  const total = state.list.reduce((n, l) => n + l.qty, 0);
  return `
    ${banner}
    <div class="card">
      <input type="search" id="search" placeholder="Ajouter un produit (lait, pâtes…)" value="${esc(search)}" autocomplete="off">
      <div id="results">${searchResults()}</div>
    </div>
    <div class="card">
      <div class="row between"><h2>Ma liste</h2><span class="pill">${total} article(s)</span></div>
      ${state.list.length
        ? groupedList(state.list, (l) => `
          <li>
            <span class="name grow">${esc(l.p.name)}</span>
            <span class="qty">
              <button class="btn icon" data-action="qty" data-id="${l.id}" data-d="-1" aria-label="Moins">−</button>
              <b class="num">${l.qty}</b>
              <button class="btn icon" data-action="qty" data-id="${l.id}" data-d="1" aria-label="Plus">+</button>
            </span>
          </li>`)
        : '<div class="empty">Liste vide. Cherche un produit ci-dessus ou ajoute tes récurrents.</div>'}
    </div>
    ${state.list.length ? `
      <div class="row">
        <button class="btn ghost danger" data-action="clear">Vider</button>
        <button class="btn primary grow" data-action="go-plan">🧭 Trouver le plan le moins cher</button>
      </div>` : ''}
  `;
}

// ---------- Vue : Plan ----------
let openPlan = null;

function planCard(plan, i, ref) {
  const best = i === 0;
  const saving = ref ? ref.total - plan.total : 0;
  const isOpenState = state.tab === 'plan' && (openPlan === plan.id || (openPlan == null && best));
  const stops = plan.stops.map((s, n) => {
    const st = s.store;
    const ch = CHAINS[st.chain];
    const sub = s.lines.reduce((a, l) => a + l.total, 0);
    const open = st.hours ? (isOpen(st, new Date()) ? '<span class="pill good">ouvert</span>' : '<span class="pill warn">fermé maintenant</span>') : '';
    return `
      <div class="card" style="margin:10px 0 0;box-shadow:none">
        <div class="row between">
          <div class="row grow"><span class="chain-dot" style="background:${ch?.color ?? 'var(--muted)'}"></span>
            <div class="grow"><h3>${plan.kind === 'trip' ? `${n + 1}. ` : ''}${esc(st.name)}</h3>
            <div class="muted small">${esc(st.address ?? '')}</div></div></div>
          <div class="num"><b>${eur(sub)}</b></div>
        </div>
        <div class="row" style="margin-top:4px">${open}</div>
        <ul class="items" style="margin-top:6px">
          ${s.lines.map((l) => {
            const item = state.list.find((x) => x.id === l.product.id);
            return `<li class="${item?.checked ? 'done' : ''}">
              <input type="checkbox" data-action="check" data-id="${l.product.id}" ${item?.checked ? 'checked' : ''} aria-label="Pris">
              <span class="name grow">${l.qty > 1 ? `${l.qty} × ` : ''}${esc(l.product.name)}
                ${l.info?.article ? `<br><span class="small muted">${esc(l.info.article)}</span>` : ''}</span>
              <span class="num small" style="text-align:right">${eur(l.total)}<br>${KIND_BADGE[l.info?.kind] ?? ''}</span></li>`;
          }).join('')}
        </ul>
      </div>`;
  }).join('');

  return `
    <div class="card ${best ? 'best' : ''}">
      <details ${isOpenState ? 'open' : ''} data-plan="${plan.id}">
        <summary>
          <div class="row between">
            <div class="grow">
              ${best ? '<span class="pill accent">⭐ Meilleur plan</span> ' : `<span class="pill">#${i + 1}</span> `}
              ${plan.kind === 'delivery' ? '<span class="pill">en ligne</span>' : ''}
              <h3 style="margin-top:6px">${esc(plan.label)}</h3>
            </div>
            <div style="text-align:right"><div class="big num">${eur(plan.total)}</div>
              <div class="small muted">coût total</div></div>
          </div>
          ${best && saving > 0.01 ? `<div class="small good" style="margin-top:4px">−${eur(saving)} vs tout acheter au plus proche</div>` : ''}
        </summary>
        <div class="stats">
          <div><b class="num">${eur(plan.goods)}</b><span>courses</span></div>
          <div><b class="num">${plan.travel.minutes} min</b><span>${plan.travel.km.toFixed(1)} km</span></div>
          <div><b class="num">${eur(plan.travel.cost + plan.fees)}</b><span>${plan.fees ? 'frais + temps' : 'temps / trajet'}</span></div>
        </div>
        ${stops}
        <div class="row wrap" style="margin-top:12px">
          ${plan.kind === 'trip' || plan.delivery?.pickupStore
            ? `<a class="btn" target="_blank" rel="noopener" href="${esc(mapsUrl(state.home, plan, state.settings.mode))}">🗺️ Itinéraire</a>` : ''}
          ${plan.delivery ? `<a class="btn" target="_blank" rel="noopener" href="${esc(plan.delivery.url)}">🛒 Commander</a>` : ''}
          <button class="btn" data-action="copy" data-plan="${plan.id}">📋 Copier</button>
          <a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(planText(plan))}">💬 WhatsApp</a>
          <button class="btn primary grow" data-action="done" data-plan="${plan.id}">✅ Courses faites</button>
        </div>
      </details>
    </div>`;
}

let lastPlans = [];

function viewPlan() {
  const s = state.settings;
  const controls = `
    <div class="card">
      <div class="grid2">
        <label class="field"><span>Déplacement</span>
          <select data-setting="mode">${Object.entries(MODES).map(([k, m]) => `<option value="${k}" ${s.mode === k ? 'selected' : ''}>${m.label}</option>`).join('')}</select></label>
        <label class="field"><span>Magasins max</span>
          <select data-setting="maxStores" data-num>${[1, 2, 3].map((n) => `<option ${s.maxStores === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="field"><span>Valeur de ton temps (€/h)</span>
          <input type="number" min="0" step="1" data-setting="valueOfTime" data-num value="${s.valueOfTime}"></label>
        <label class="field"><span>Horaires</span>
          <select data-setting="openNow" data-bool><option value="false" ${!s.openNow ? 'selected' : ''}>Peu importe</option><option value="true" ${s.openNow ? 'selected' : ''}>Ouverts maintenant</option></select></label>
      </div>
    </div>`;
  if (!state.list.length) return controls + '<div class="empty">Ajoute des produits à ta liste pour calculer un plan.</div>';
  lastPlans = computePlans();
  if (!lastPlans.length) return controls + '<div class="empty">Aucun plan possible avec ces réglages (magasins fermés ou exclus, minimum de commande…).</div>';
  // Référence : tout acheter dans le magasin le plus proche qui a tout.
  const singles = lastPlans.filter((p) => p.kind === 'trip' && p.stops.length === 1);
  const nearest = singles.sort((a, b) => a.travel.km - b.travel.km)[0];
  return controls + lastPlans.slice(0, 6).map((p, i) => planCard(p, i, nearest)).join('') +
    `<p class="small muted">${priceSourcesNote()} Coût total = courses + frais + temps passé (valorisé à ${eur(s.valueOfTime)}/h).</p>`;
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
  // Rien coché : on considère que tout a été acheté. Sinon, seulement les articles cochés.
  const bought = new Set(checked.length ? checked : inPlan);
  state.recurring = state.recurring.map((r) => (bought.has(r.id) ? learnFrequency(r, today) : r));
  state.history.unshift({ date: today, label: plan.label, total: plan.goods, items: bought.size });
  state.history = state.history.slice(0, 50);
  state.list = state.list.filter((l) => !bought.has(l.id)).map((l) => ({ ...l, checked: false }));
  save();
  const left = state.list.length;
  toast(left ? `Courses enregistrées. ${left} article(s) restent dans la liste.` : 'Courses enregistrées 👍');
  setTab('list');
}

// ---------- Vue : Récurrents (automatique) ----------
function viewRecurring() {
  const now = Date.now();
  const rows = [...state.recurring]
    .map((r) => ({ ...r, p: productById(r.id), next: r.last ? new Date(r.last).getTime() + r.every * DAY : now }))
    .filter((r) => r.p)
    .sort((a, b) => a.next - b.next);
  const s = state.settings;
  const suggestions = PRODUCTS.filter((p) => p.every && !state.recurring.some((r) => r.id === p.id));
  return `
    <div class="card stack">
      <h2>Mode automatique</h2>
      <p class="small muted" style="margin:0">Les produits ci-dessous sont remis dans ta liste dès qu'ils arrivent à échéance. Quand tu valides « Courses faites », l'app ajuste la fréquence selon ta vraie consommation.</p>
      <label class="row"><input type="checkbox" data-setting="autoAdd" data-bool-check ${s.autoAdd ? 'checked' : ''}> <span>Ajouter automatiquement à l'ouverture</span></label>
      <div class="grid2">
        <label class="field"><span>Rappel hebdo</span>
          <select data-setting="reminderDay" data-num>${['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'].map((d, i) => `<option value="${i}" ${s.reminderDay === i ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
        <label class="field"><span>Heure</span><input type="time" data-setting="reminderTime" value="${esc(s.reminderTime)}"></label>
      </div>
      <button class="btn" data-action="ics">📅 Ajouter le rappel à mon agenda (.ics)</button>
    </div>
    <div class="card">
      <h2>Récurrents (${rows.length})</h2>
      ${rows.length ? `<ul class="items">${rows.map((r) => {
        const days = Math.ceil((r.next - now) / DAY);
        const when = days <= 0 ? '<span class="pill accent">à racheter</span>' : `<span class="small muted">dans ${days} j</span>`;
        return `<li><span class="name grow">${esc(r.p.name)}<br>${when}</span>
          <span class="small muted">tous les</span>
          <input class="days" type="number" min="1" data-action="every" data-id="${r.id}" value="${r.every}" aria-label="Jours">
          <span class="small muted">j</span>
          <button class="btn icon ghost" data-action="unrec" data-id="${r.id}" aria-label="Retirer">✕</button></li>`;
      }).join('')}</ul>` : '<div class="empty">Aucun produit récurrent.</div>'}
    </div>
    ${suggestions.length ? `<div class="card"><h3>Suggestions</h3><div class="suggest">
      ${suggestions.map((p) => `<button data-action="rec" data-id="${p.id}"><span>${esc(p.name)}</span><span class="muted small">tous les ${p.every} j ➕</span></button>`).join('')}
    </div></div>` : ''}
    ${state.history.length ? `<div class="card"><h3>Historique</h3><ul class="items">
      ${state.history.slice(0, 10).map((h) => `<li><span class="grow small">${esc(h.date)} · ${esc(h.label)}</span><span class="num">${eur(h.total)}</span></li>`).join('')}
    </ul></div>` : ''}
  `;
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
  const url = location.href.split('#')[0];
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//courses-opti//FR', 'BEGIN:VEVENT',
    `UID:courses-opti-${Date.now()}@local`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(d)}`, `DTEND:${stamp(end)}`, 'RRULE:FREQ=WEEKLY',
    'SUMMARY:🛒 Courses (plan optimisé)', `DESCRIPTION:Ouvre Courses Opti : ${url}`,
    'BEGIN:VALARM', 'TRIGGER:-PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Courses', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  download('rappel-courses.ics', ics, 'text/calendar');
}

async function download(name, content, type) {
  if (IN_CLAUDE) {
    const dl = await window.claude.use('downloads');
    if (!dl) { toast('Téléchargement indisponible ici'); return; }
    try { await dl.save({ filename: name, data: content }); toast('Fichier enregistré'); } catch { toast('Téléchargement annulé'); }
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- Vue : Prix ----------
function viewPrices() {
  const ch = chains();
  const q = norm(priceSearch.trim());
  const list = (q ? allProducts().filter((p) => norm(p.name).includes(q)) : allProducts().filter((p) => state.list.some((l) => l.id === p.id))).slice(0, 30);
  return `
    <div class="card stack">
      <h2>Niveau de prix par enseigne</h2>
      <p class="small muted" style="margin:0">Indice relatif (Colruyt = 100). Les discounters sont moins chers mais n'ont pas toutes les marques.</p>
      <div class="grid2">${Object.entries(ch).map(([k, c]) => `
        <label class="field"><span><span class="chain-dot" style="background:${c.color}"></span> ${esc(c.name)}</span>
        <input type="number" min="50" max="200" data-action="index" data-chain="${k}" value="${c.index}"></label>`).join('')}
      </div>
    </div>
    <div class="card">
      <h2>Prix constatés</h2>
      <input type="search" id="price-search" placeholder="Chercher un produit…" value="${esc(priceSearch)}" autocomplete="off">
      <p class="small muted">${q ? '' : 'Produits de ta liste. '}${priceSourcesNote()} En <i>italique</i> : estimation. Tu peux corriger un prix avec celui de ton ticket ; « ↺ » revient au prix automatique.</p>
      <div id="price-table">${list.map((p) => `
        <h3 style="margin-top:14px">${esc(p.name)}</h3>
        <table class="prices">${Object.entries(ch).map(([k, c]) => {
          const info = priceInfo(p, k, ch, state.overrides, PRICES.items ?? {});
          const own = info?.kind === 'user';
          const detail = info?.article ? `<br><span class="small muted">${esc(info.article)}${info.until ? ` · jusqu'au ${dateFr(info.until)}` : ''}</span>` : '';
          return `<tr><td>${esc(c.name)} ${KIND_BADGE[info?.kind] ?? ''}${detail}</td><td style="white-space:nowrap">${info == null
            ? '<span class="muted small">indisponible</span>'
            : `<input class="price ${info.kind === 'estimate' ? 'est' : ''}" type="number" step="0.01" min="0" data-action="price" data-id="${p.id}" data-chain="${k}" value="${info.price.toFixed(2)}">${own ? ` <button class="btn icon ghost" data-action="unprice" data-id="${p.id}" data-chain="${k}" aria-label="Revenir au prix automatique">↺</button>` : ''}`}</td></tr>`;
        }).join('')}</table>`).join('') || '<div class="empty">Aucun produit.</div>'}
      </div>
    </div>`;
}

// ---------- Vue : Réglages ----------
function viewSettings() {
  const s = state.settings;
  const st = stores();
  const excluded = new Set(s.excluded);
  return `
    <div class="card stack">
      <h2>Domicile</h2>
      <input type="text" id="home-address" value="${esc(state.home.address)}">
      ${IN_CLAUDE
        ? '<p class="small muted" style="margin:0">Positions des magasins approximatives (à ~200 m près), suffisantes pour comparer les trajets.</p>'
        : `<button class="btn" data-action="geocode">📍 Localiser domicile + magasins (OpenStreetMap)</button>
      <p class="small muted" style="margin:0">${state.geocoded ? '✅ Positions vérifiées via OpenStreetMap.' : '⚠️ Positions approximatives : lance la localisation pour des distances précises.'}</p>`}
    </div>
    <div class="card">
      <h2>Magasins & options</h2>
      <ul class="items">${[...st, ...DELIVERY].map((x) => {
        const km = x.lat != null ? (Math.hypot((x.lat - state.home.lat) * 111, (x.lng - state.home.lng) * 70.4) * s.detour).toFixed(1) : null;
        return `<li><input type="checkbox" data-action="toggle-store" data-id="${x.id}" ${excluded.has(x.id) ? '' : 'checked'} aria-label="Utiliser">
          <span class="chain-dot" style="background:${CHAINS[x.chain]?.color}"></span>
          <span class="grow">${esc(x.name)}<br><span class="small muted">${esc(x.address ?? (x.fee != null ? `frais ${eur(x.fee)}, min. ${eur(x.minOrder)}` : ''))}</span></span>
          ${km ? `<span class="small muted num">${km} km</span>` : ''}</li>`;
      }).join('')}</ul>
    </div>
    <div class="card stack">
      <h2>Optimisation</h2>
      <div class="grid2">
        <label class="field"><span>Minutes par magasin</span><input type="number" min="0" data-setting="minutesPerStore" data-num value="${s.minutesPerStore}"></label>
        <label class="field"><span>Facteur détour</span><input type="number" min="1" step="0.05" data-setting="detour" data-num value="${s.detour}"></label>
      </div>
    </div>
    <div class="card stack">
      <h2>Sauvegarde</h2>
      <div class="row wrap">
        <button class="btn" data-action="export">⬇️ Exporter</button>
        <label class="btn">⬆️ Importer<input type="file" id="import" accept="application/json" hidden></label>
        <button class="btn danger" data-action="reset">Réinitialiser</button>
      </div>
      <p class="small muted" style="margin:0">${cloudDoc ? 'Données gardées sur ton compte Claude : tu les retrouves sur tous tes appareils.' : 'Les données restent sur cet appareil (stockage du navigateur).'}</p>
    </div>`;
}

// Géocodage côté navigateur via Nominatim (1 requête/seconde max).
async function geocode() {
  const q = async (address) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=be&q=${encodeURIComponent(address)}`;
    const r = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
    const [hit] = await r.json();
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  };
  const wait = () => new Promise((res) => setTimeout(res, 1100));
  toast('Localisation en cours…');
  try {
    const address = document.getElementById('home-address')?.value.trim() || state.home.address;
    const h = await q(address);
    if (h) state.home = { address, ...h };
    let found = 0;
    for (const s of STORES) {
      await wait();
      const c = await q(s.address);
      if (c) { state.coords[s.id] = c; found++; }
    }
    state.geocoded = Boolean(h);
    state.geocodeTried = true;
    save();
    render();
    toast(`${h ? 'Domicile localisé' : 'Domicile introuvable'} · ${found}/${STORES.length} magasins`);
  } catch {
    state.geocodeTried = true;
    save();
    toast('Pas de connexion à OpenStreetMap, réessaie depuis Réglages.');
  }
}

// ---------- Événements ----------
document.querySelector('.tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (b) setTab(b.dataset.tab);
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
  if (e.target.id === 'search' && e.key === 'Enter') {
    const first = view.querySelector('#results button');
    first?.click();
  }
});

view.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.setting) {
    let v = t.value;
    if ('num' in t.dataset) v = Number(v);
    if ('bool' in t.dataset) v = v === 'true';
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
    t.classList.remove('est');
    save();
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
        state = { ...defaults(), ...JSON.parse(txt) };
        save();
        render();
        toast('Données importées');
      } catch { toast('Fichier invalide'); }
    });
  } else if (t.id === 'home-address') {
    state.home.address = t.value.trim();
    save();
  }
});

view.addEventListener('toggle', (e) => {
  if (e.target.matches('details[data-plan]') && e.target.open) openPlan = e.target.dataset.plan;
}, true);

view.addEventListener('click', async (e) => {
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
    document.getElementById('search')?.focus();
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
  } else if (a === 'go-plan') {
    openPlan = null;
    setTab('plan');
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
  } else if (a === 'geocode') {
    b.disabled = true;
    await geocode();
  } else if (a === 'export') {
    download(`courses-opti-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), 'application/json');
  } else if (a === 'reset') {
    if (await ask('Tout effacer (liste, prix, récurrents) ?', { ok: 'Tout effacer' })) { state = defaults(); save(); render(); }
  }
});

// ---------- Démarrage ----------
if (state.settings.autoAdd) autoAddDue({ silent: false });
render();
if (!IN_CLAUDE && !state.geocodeTried && navigator.onLine) geocode();
connectCloud();
loadPrices();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
