// Test ponctuel : quels liens ouvrent un produit / une recherche sur Colruyt et Delhaize ?
import { openBrowser, acceptCookies, sleep } from './browser.mjs';

const { browser, context } = await openBrowser();
const page = await context.newPage();
async function visit(url) {
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);
    console.log(`\n### ${url}\n  status=${res?.status()} final=${page.url()}\n  title=${await page.title()}`);
    const c = await acceptCookies(page); if (c) console.log(`  cookies: ${c}`);
    const h1 = await page.locator('h1').first().textContent({ timeout: 3000 }).catch(() => '');
    console.log(`  h1=${(h1 || '').trim().slice(0, 100)}`);
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => /produ|product|\/p\//i.test(h)).slice(0, 12));
    console.log(`  links=${JSON.stringify(links)}`);
    const inputs = await page.evaluate(() => [...document.querySelectorAll('input')].map((i) => `${i.type}|${i.name}|${i.id}|${i.placeholder}`).slice(0, 10));
    console.log(`  inputs=${JSON.stringify(inputs)}`);
  } catch (e) { console.log(`\n### ${url}\n  ERREUR ${e.message.slice(0, 200)}`); }
}
await visit('https://www.colruyt.be/fr');
// Recherche via la barre du site
try {
  const box = page.locator('input[type="search"], input[name*="search" i], input[placeholder*="cherch" i]').filter({ visible: true }).first();
  await box.fill('lait demi', { timeout: 5000 });
  await box.press('Enter');
  await sleep(6000);
  console.log(`\n### recherche via la barre → ${page.url()}`);
  const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => /produ|product|\/p\//i.test(h)).slice(0, 12));
  console.log(`  links=${JSON.stringify(links)}`);
} catch (e) { console.log(`recherche : ${e.message.slice(0, 200)}`); }
for (const u of [
  'https://www.colruyt.be/fr/produits?searchTerm=lait',
  'https://www.colruyt.be/fr/produits/1433',
  'https://www.colruyt.be/nl/producten/1433',
  'https://www.collectandgo.be/fr',
  'https://www.delhaize.be/fr/shop/search?text=lait',
  'https://www.delhaize.be/fr/shop/Verse-groenten-en-fruit/Vers-fruit/Appelen-en-peren/Appelen/Gekke-appelen-Verpakt/p/F2017071900003540000',
]) await visit(u);
await browser.close();
