// Sonde : que publie Lidl Belgique (robots.txt, recherche produits, prix) ? Quelques requêtes seulement.
import { writeFileSync, mkdirSync } from 'node:fs';
const UA = { 'User-Agent': 'Mozilla/5.0 (GroceryOpti; +https://github.com/yannisbesri0912/Grocery-App)', 'Accept-Language': 'fr-BE,fr;q=0.9' };
const out = {};
async function get(name, url, json = true) {
  try {
    const res = await fetch(url, { headers: UA });
    const text = await res.text();
    out[name] = { status: res.status, type: res.headers.get('content-type'), len: text.length, body: text.slice(0, json ? 60000 : 8000) };
  } catch (e) { out[name] = { error: String(e) }; }
  await new Promise((r) => setTimeout(r, 1500));
}
await get('robots', 'https://www.lidl.be/robots.txt', false);
await get('search-lait', 'https://www.lidl.be/q/api/search?assortment=BE&locale=fr_BE&version=v2.0.0&q=lait&fetchsize=24');
await get('search-poulet', 'https://www.lidl.be/q/api/search?assortment=BE&locale=fr_BE&version=v2.0.0&q=poulet&fetchsize=24');
await get('cat-food', 'https://www.lidl.be/q/api/search?assortment=BE&locale=fr_BE&version=v2.0.0&category.id=10068374&fetchsize=24');
await get('page-assortiment', 'https://www.lidl.be/c/fr-BE/assortiment-alimentaire/s10008019', false);
await get('openprices-locations', 'https://prices.openfoodfacts.org/api/v1/locations?osm_name__like=Lidl&osm_address_country__like=Belg&size=50');
await get('openprices-prices', 'https://prices.openfoodfacts.org/api/v1/prices?location_osm_name__like=Lidl&location_osm_address_country__like=Belg&size=100&order_by=-date');
mkdirSync('data-raw', { recursive: true });
writeFileSync('data-raw/lidl-probe.json', JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log(k, v.status, v.type, v.len, v.error ?? '');
