// Sonde : quelles adresses ouvrent l'app Collect&Go sur iPhone (fichier public apple-app-site-association) ?
import { writeFileSync, mkdirSync } from 'node:fs';
const out = {};
for (const url of ['https://www.collectandgo.be/.well-known/apple-app-site-association', 'https://collectandgo.be/.well-known/apple-app-site-association']) {
  try { const res = await fetch(url, { redirect: 'follow' }); out[url] = { status: res.status, final: res.url, type: res.headers.get('content-type'), body: (await res.text()).slice(0, 20000) }; }
  catch (e) { out[url] = { error: String(e) }; }
  await new Promise((r) => setTimeout(r, 2000));
}
mkdirSync('data-raw', { recursive: true });
writeFileSync('data-raw/aasa-probe.json', JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log(k, v.status, v.final, v.error ?? '');
