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
await visit('https://www.collectandgo.be/fr/home');
try {
  const box = page.locator('input[placeholder*="produit" i]').filter({ visible: true }).first();
  await box.click({ timeout: 5000 }).catch(() => {});
  await box.fill('lait demi-écrémé', { timeout: 5000 });
  await sleep(1500);
  const sugg = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => /produ|zoek|search|recher/i.test(h)).slice(0, 10));
  console.log(`  suggestions=${JSON.stringify(sugg)}`);
  await box.press('Enter');
  await sleep(6000);
  console.log(`\n### recherche Collect&Go → ${page.url()}\n  title=${await page.title()}`);
  const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => /produ|product|artikel|article/i.test(h)).slice(0, 12));
  console.log(`  links=${JSON.stringify(links)}`);
  const txt = await page.evaluate(() => document.body.innerText.slice(0, 600).replace(/\s+/g, ' '));
  console.log(`  texte=${txt}`);
} catch (e) { console.log(`recherche : ${e.message.slice(0, 300)}`); }
for (const u of ['https://www.collectandgo.be/fr/panier', 'https://www.collectandgo.be/fr/winkelmandje']) await visit(u);
await browser.close();
