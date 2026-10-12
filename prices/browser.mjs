// Robot navigateur pour les sites sans données publiques (Delhaize, Aldi).
// Il ouvre la page de recherche comme un visiteur, puis lit les produits dans
// les données que la page charge elle-même (réponses JSON, JSON-LD,
// __NEXT_DATA__…). Peu de requêtes, espacées : une recherche par produit.
import { chromium } from 'playwright';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (min, max) => sleep(min + Math.random() * (max - min));

export async function openBrowser() {
  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    userAgent: UA,
    locale: 'fr-BE',
    timezoneId: 'Europe/Brussels',
    viewport: { width: 1366, height: 900 },
    extraHTTPHeaders: { 'Accept-Language': 'fr-BE,fr;q=0.9,nl;q=0.7,en;q=0.5' },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  return { browser, context };
}

const COOKIE_BUTTONS = [
  '#onetrust-accept-btn-handler',
  'button#accept-all', 'button[data-testid="cookie-accept-all"]', '[data-testid="uc-accept-all-button"]',
  'button:has-text("Tout accepter")', 'button:has-text("Accepter tout")', 'button:has-text("Accepter")',
  'button:has-text("Alles accepteren")', 'button:has-text("Accept all")', 'button:has-text("J\'accepte")',
];

export async function acceptCookies(page) {
  // Usercentrics (Aldi) : API JavaScript, plus fiable que le bouton dans le shadow DOM.
  const uc = await page.evaluate(async () => {
    for (let i = 0; i < 10; i++) {
      if (window.UC_UI?.acceptAllConsents) { await window.UC_UI.acceptAllConsents(); return true; }
      await new Promise((r) => setTimeout(r, 300));
      if (!document.querySelector('#usercentrics-root')) return false;
    }
    return false;
  }).catch(() => false);
  if (uc) { await sleep(800); return 'usercentrics'; }
  for (const sel of COOKIE_BUTTONS) {
    try {
      const b = page.locator(sel).first();
      if (await b.isVisible({ timeout: 500 })) {
        await b.click({ timeout: 2000 });
        await sleep(800);
        return sel;
      }
    } catch { /* bouton absent */ }
  }
  return null;
}

// ---------- Extraction générique ----------
const NAME_KEYS = ['name', 'productName', 'title', 'displayName', 'description', 'longName'];
const SIZE_KEYS = ['contentSize', 'content', 'quantity', 'packaging', 'packagingSize', 'packSize', 'size', 'netContent', 'netQuantity', 'weight', 'unitSize', 'salesUnitSize', 'productSize', 'volume'];
const PRICE_KEYS = ['price', 'currentPrice', 'salePrice', 'priceValue', 'sellingPrice', 'finalPrice', 'regularPrice', 'basePrice', 'amount', 'value'];

function num(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const m = v.replace(/\s/g, '').match(/(\d+[.,]\d{1,2}|\d+)/);
    if (m && /€|eur|^\d/.test(v.toLowerCase().trim())) return Number(m[1].replace(',', '.'));
  }
  return null;
}

function priceOf(o, depth = 0) {
  if (o == null || depth > 3) return null;
  if (typeof o !== 'object') return num(o);
  for (const k of PRICE_KEYS) {
    if (!(k in o)) continue;
    const v = o[k];
    const n = typeof v === 'object' ? priceOf(v, depth + 1) : num(v);
    if (n != null && n > 0 && n < 500) return n;
  }
  return null;
}

function textOf(o, keys) {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (v && typeof v === 'object' && typeof v.value === 'string') return v.value;
  }
  return '';
}

function unitPriceText(o) {
  for (const [k, v] of Object.entries(o)) {
    if (/unit.?price|price.?per|per.?unit|comparison|supplementary|baseprice|grundpreis/i.test(k)) {
      if (typeof v === 'string') return v;
      if (v && typeof v === 'object') return JSON.stringify(v).slice(0, 120);
    }
  }
  return '';
}

const SIZE_RE = /\d+(?:[.,]\d+)?\s*(?:x\s*\d+(?:[.,]\d+)?\s*)?(?:kg|g|gr|l|cl|ml|st|stuks|pièces|rol|rollen|wasbeurten|lavages)\b/i;

// Format caché dans un autre champ (« 1 l », « 500 g ») : on prend la première
// chaîne courte qui ressemble à une contenance, sur deux niveaux.
function sizeFromValues(o, name) {
  if (SIZE_RE.test(name)) return '';
  const seen = [];
  const scan = (x, depth) => {
    if (!x || typeof x !== 'object' || depth > 2) return null;
    for (const v of Object.values(x)) {
      if (typeof v === 'string' && v.length < 40 && SIZE_RE.test(v) && !/€/.test(v)) return v.match(SIZE_RE)[0];
      if (v && typeof v === 'object' && !seen.includes(v)) { seen.push(v); const r = scan(v, depth + 1); if (r) return r; }
    }
    return null;
  };
  return scan(o, 0) ?? '';
}

/** Parcourt un JSON quelconque et en sort les objets qui ressemblent à des produits. */
export function productsFromJson(root, limit = 400) {
  const out = [];
  const seen = new Set();
  const walk = (o, depth) => {
    if (!o || typeof o !== 'object' || depth > 14 || out.length >= limit) return;
    if (Array.isArray(o)) { o.forEach((x) => walk(x, depth + 1)); return; }
    const name = textOf(o, NAME_KEYS);
    const price = name && name.length < 160 ? priceOf(o) ?? priceOf(o.offers) ?? priceOf(o.prices) ?? priceOf(o.priceInfo) : null;
    if (name && price) {
      const brand = typeof o.brand === 'string' ? o.brand : (o.brand?.name ?? o.manufacturer ?? '');
      const size = textOf(o, SIZE_KEYS) || sizeFromValues(o, name);
      const key = `${name}|${price}|${size}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({
          name: `${brand && !name.toLowerCase().includes(String(brand).toLowerCase()) ? `${brand} ` : ''}${name} ${size}`.trim(),
          price,
          unitText: unitPriceText(o),
          url: typeof o.url === 'string' ? o.url : undefined,
        });
      }
    }
    for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v, depth + 1);
  };
  walk(root, 0);
  return out;
}

/** Données embarquées dans le HTML : JSON-LD, __NEXT_DATA__, états initiaux. */
export async function embeddedJson(page) {
  return page.evaluate(() => {
    const out = [];
    for (const s of document.querySelectorAll('script[type="application/ld+json"], script#__NEXT_DATA__, script[type="application/json"]')) {
      try { out.push(JSON.parse(s.textContent)); } catch { /* ignore */ }
    }
    for (const k of ['__NEXT_DATA__', '__INITIAL_STATE__', '__APOLLO_STATE__', '__NUXT__', '__PRELOADED_STATE__']) {
      try { if (window[k]) out.push(JSON.parse(JSON.stringify(window[k]))); } catch { /* ignore */ }
    }
    return out;
  });
}

const SEARCH_INPUTS = [
  'input[type="search"]', 'input[name="q"]', 'input[name="text"]', 'input[name="query"]',
  'input[name="searchTerm"]', 'input[name="search"]', 'input[placeholder*="echerch" i]',
  'input[placeholder*="zoek" i]', 'input[aria-label*="echerch" i]', 'input[aria-label*="zoek" i]',
  'input[id*="search" i]', 'input[class*="search" i]',
];
const SEARCH_OPENERS = [
  'button[aria-label*="echerch" i]', 'button[aria-label*="zoek" i]', 'button[aria-label*="search" i]',
  'a[aria-label*="echerch" i]', '[data-testid*="search" i] button', 'button[class*="search" i]',
];

/** Recherche via la barre du site (quand on ne connaît pas l'adresse de recherche). */
async function searchWithBox(page, site, query, debug) {
  await page.goto(site.home, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await acceptCookies(page);
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  let input = null;
  for (let round = 0; round < 2 && !input; round++) {
    for (const sel of SEARCH_INPUTS) {
      const el = page.locator(sel).filter({ visible: true }).first();
      if (await el.isVisible({ timeout: 300 }).catch(() => false)) { input = el; if (debug) console.log(`    barre de recherche : ${sel}`); break; }
    }
    if (!input) {
      for (const sel of SEARCH_OPENERS) {
        const b = page.locator(sel).filter({ visible: true }).first();
        if (await b.isVisible({ timeout: 300 }).catch(() => false)) { await b.click().catch(() => {}); await sleep(800); break; }
      }
    }
  }
  if (!input) {
    // Diagnostic : champs et liens de recherche présents sur la page.
    const info = await page.evaluate(() => ({
      url: location.href,
      inputs: [...document.querySelectorAll('input')].slice(0, 15).map((i) => `${i.type}|${i.name}|${i.id}|${i.placeholder}|${i.getAttribute('aria-label') ?? ''}|${i.offsetParent ? 'visible' : 'caché'}`),
      links: [...document.querySelectorAll('a[href*="search"], a[href*="recherch"], a[href*="zoek"], form')].slice(0, 10).map((a) => a.getAttribute('href') ?? `form action=${a.getAttribute('action')}`),
      buttons: [...document.querySelectorAll('button')].map((b) => (b.getAttribute('aria-label') || b.textContent || '').trim()).filter(Boolean).slice(0, 25),
    })).catch(() => ({}));
    console.log(`    [${site.name}] page : ${info.url}`);
    console.log(`    champs : ${JSON.stringify(info.inputs)}`);
    console.log(`    liens/formulaires : ${JSON.stringify(info.links)}`);
    console.log(`    boutons : ${JSON.stringify(info.buttons)}`);
    throw new Error(`${site.name} : barre de recherche introuvable`);
  }
  await acceptCookies(page);
  // fill() ne « clique » pas : un bandeau par-dessus ne le bloque pas.
  await input.fill(query, { timeout: 10000 });
  await sleep(400);
  await input.press('Enter');
  await page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {});
  if (debug) console.log(`    après recherche : ${page.url()}`);
}

/**
 * Lance une recherche et renvoie les produits trouvés.
 * site : { name, home, searchUrl?(q) } — sans searchUrl, on passe par la barre de recherche.
 */
export async function searchProducts(context, site, query, { debug = false } = {}) {
  const page = await context.newPage();
  const bodies = [];
  const urls = [];
  const pending = [];
  page.on('response', (res) => {
    const ct = res.headers()['content-type'] ?? '';
    if (!ct.includes('json')) return;
    urls.push(`${res.status()} ${res.url().slice(0, 160)}`);
    // site.dataUrl : seules les réponses qui portent les résultats de recherche
    // (évite les produits « mis en avant » sans rapport avec la recherche).
    if (site.dataUrl && !site.dataUrl.test(res.url())) return;
    const len = Number(res.headers()['content-length'] ?? 0);
    if (len > 5e6) return;
    pending.push(res.json().then((b) => bodies.push(b)).catch(() => {}));
  });
  page.on('request', (req) => {
    // Les API GraphQL en POST : on note le nom de l'opération (diagnostic).
    if (req.method() === 'POST' && /api|graphql/i.test(req.url())) {
      const op = (req.postData() ?? '').match(/"operationName"\s*:\s*"([^"]+)"/)?.[1];
      if (op) urls.push(`POST ${req.url().slice(0, 80)} op=${op}`);
    }
  });
  let products = [];
  try {
    if (site.searchUrl) {
      await page.goto(site.searchUrl(query), { waitUntil: 'domcontentloaded', timeout: 45000 });
      await acceptCookies(page);
    } else {
      await searchWithBox(page, site, query, debug);
    }
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    if (site.dataUrl) {
      await page.waitForResponse((r) => site.dataUrl.test(r.url()), { timeout: 12000 }).catch(() => {});
    }
    await page.mouse.wheel(0, 1500);
    await sleep(1500);
    await Promise.allSettled(pending);
    const embedded = site.embedded === false ? [] : await embeddedJson(page);
    for (const b of [...bodies, ...embedded]) products.push(...productsFromJson(b));
    if (debug) {
      console.log(`    [${site.name}] « ${query} » → ${page.url()}`);
      console.log(`    titre : ${await page.title()}`);
      console.log(`    JSON réseau : ${bodies.length}, embarqués : ${embedded.length}, produits lus : ${products.length}`);
      for (const u of urls.slice(0, 25)) console.log(`      ${u}`);
      for (const p of products.slice(0, 6)) console.log(`      • ${p.name} — ${p.price} € ${p.unitText ? `(${p.unitText})` : ''}`);
      if (products[0]) {
        const needle = products[0].name.split(' ').slice(-3, -1).join(' ') || products[0].name;
        for (const b of [...bodies, ...embedded]) {
          const str = JSON.stringify(b);
          const at = str.indexOf(needle.slice(0, 20));
          if (at >= 0) { console.log(`    extrait brut : ${str.slice(Math.max(0, at - 400), at + 900)}`); break; }
        }
      }
      if (!products.length) {
        const text = (await page.evaluate(() => document.body?.innerText ?? '')).replace(/\s+/g, ' ').slice(0, 600);
        console.log(`    texte visible : ${text}`);
      }
    }
  } finally {
    await page.close();
  }
  await jitter(1500, 3500);
  return products;
}
