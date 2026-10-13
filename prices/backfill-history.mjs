// Rattrapage de l'historique Colruyt à partir des copies quotidiennes du
// catalogue (projet BelgianNoise, stockage public) : un jour sur `step`.
//   node prices/backfill-history.mjs [jours=120] [step=2]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { PRODUCTS } from '../src/data.js';
import { RULES, PET_BABY } from '../src/match-rules.js';
import { pickBest } from '../src/matcher.js';
import { addDay } from '../src/history.js';
import { toCandidate } from './colruyt.mjs';

const BUCKET = 'https://storage.googleapis.com/storage/v1/b/colruyt-products/o';
const FILES = 'https://storage.googleapis.com/colruyt-products/';
const OUT = new URL('../data/history.json', import.meta.url);
const days = Number(process.argv[2] ?? 120);
const step = Number(process.argv[3] ?? 2);

const since = new Date(Date.now() - days * 86400000);
const names = [];
for (let d = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), 1)); d <= new Date(); d.setUTCMonth(d.getUTCMonth() + 1)) {
  const res = await fetch(`${BUCKET}?prefix=${encodeURIComponent(`colruyt-products/${d.toISOString().slice(0, 7)}`)}&fields=items(name)`);
  names.push(...((await res.json()).items ?? []).map((i) => i.name));
}
// Un fichier par jour (le dernier de la journée), un jour sur `step`.
const byDay = new Map();
for (const n of names.sort()) { const day = n.match(/(\d{4}-\d{2}-\d{2})/)?.[1]; if (day && day >= since.toISOString().slice(0, 10)) byDay.set(day, n); }
const picked = [...byDay].filter((_, i, a) => (a.length - 1 - i) % step === 0);
console.log(`${picked.length} jours à lire`);

let hist = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { dates: [], p: {} };
for (const [day, name] of picked) {
  const products = await (await fetch(FILES + name)).json();
  const cands = products.filter((p) => p.isAvailable !== false && p.isPriceAvailable !== false && p.businessDomain !== 'RETAIL_LU').map(toCandidate);
  const prices = {};
  for (const p of PRODUCTS) {
    const rule = RULES[p.id];
    if (!rule) continue;
    const best = pickBest(rule, cands, PET_BABY);
    if (best) prices[p.id] = { colruyt: best.priceForSpec };
  }
  hist = addDay(hist, day, prices);
  console.log(day, Object.keys(prices).length, 'produits');
}
writeFileSync(OUT, `${JSON.stringify(hist)}\n`);
console.log(`Écrit : data/history.json (${hist.dates.length} jours)`);
