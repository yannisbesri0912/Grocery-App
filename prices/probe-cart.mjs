// Test : adresse du panier Delhaize (une visite de la page d'accueil, puis des adresses candidates).
import { writeFileSync, mkdirSync } from 'node:fs';
import { openBrowser, acceptCookies, sleep } from './browser.mjs';
mkdirSync('data-raw', { recursive: true });
const out = {};
const { browser, context } = await openBrowser();
try {
  const page = await context.newPage();
  await page.goto('https://www.delhaize.be/fr/shop', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await acceptCookies(page);
  await sleep(4000);
  out.links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => `${a.getAttribute('href')} | ${(a.getAttribute('aria-label') ?? a.textContent).trim().slice(0, 40)}`).filter((x) => /cart|panier|basket|winkelmand|checkout/i.test(x)));
  // Clic sur le bouton panier de l'en-tête.
  const btn = page.locator('[data-testid*="cart" i], a[href*="cart"], button[aria-label*="panier" i]').first();
  if (await btn.count()) { await btn.click().catch(() => {}); await sleep(4000); out.afterClick = page.url(); out.afterClickTitle = await page.locator('h1').first().innerText().catch(() => ''); }
  out.tries = [];
  for (const path of ['/fr/cart', '/cart', '/fr/shop/cart', '/fr/checkout', '/fr/shop/cart/summary', '/fr/basket']) {
    await page.goto(`https://www.delhaize.be${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(3500);
    out.tries.push({ path, url: page.url(), h1: (await page.locator('h1').first().innerText().catch(() => '')).slice(0, 80) });
  }
} finally { await browser.close(); }
console.log(JSON.stringify(out, null, 1));
writeFileSync('data-raw/probe-cart.json', JSON.stringify(out, null, 1));
