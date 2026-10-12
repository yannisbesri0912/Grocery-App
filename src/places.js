// Lieux : adresse → coordonnées, et supermarchés autour d'un point.
// Données OpenStreetMap (Nominatim pour les adresses, Overpass pour les
// magasins), interrogées depuis le navigateur. Rien n'est écrit en dur :
// l'app marche autour de n'importe quelle adresse en Belgique.
import { CHAINS } from './data.js';
import { haversineKm } from './optimizer.js';

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

/** Adresse tapée → { address, lat, lng } ou null. */
export async function geocodeAddress(text) {
  const url = `${NOMINATIM}/search?format=json&limit=1&countrycodes=be&addressdetails=1&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const [hit] = await res.json();
  return hit ? { address: shortAddress(hit) ?? text, lat: Number(hit.lat), lng: Number(hit.lon) } : null;
}

/** Position GPS → adresse lisible. */
export async function reverseGeocode(lat, lng) {
  const url = `${NOMINATIM}/reverse?format=json&zoom=18&addressdetails=1&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
  if (!res.ok) return null;
  return shortAddress(await res.json());
}

function shortAddress(hit) {
  const a = hit?.address;
  if (!a) return hit?.display_name ?? null;
  const street = [a.road ?? a.pedestrian ?? a.square, a.house_number].filter(Boolean).join(' ');
  const city = [a.postcode, a.city_district ?? a.suburb ?? a.city ?? a.town ?? a.village].filter(Boolean).join(' ');
  return [street, city].filter(Boolean).join(', ') || hit.display_name;
}

/** Position actuelle du téléphone (demande l'autorisation). */
export function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Géolocalisation indisponible'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(e),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

/** Enseigne d'un magasin OpenStreetMap (ou null si on ne la suit pas). */
export function chainFromTags(tags = {}) {
  const t = `${tags.brand ?? ''} ${tags.name ?? ''} ${tags.operator ?? ''}`.toLowerCase();
  if (/colruyt/.test(t)) return 'colruyt';
  if (/\baldi\b/.test(t)) return 'aldi';
  if (/\blidl\b/.test(t)) return 'lidl';
  if (/carrefour\s*express/.test(t)) return 'carrefourx';
  if (/carrefour/.test(t)) return 'carrefour';
  if (/delhaize/.test(t)) return 'delhaize';
  if (/albert\s*heijn/.test(t)) return 'ah';
  return null;
}

const DAYS = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];
const toH = (s) => { const [h, m] = s.split(':').map(Number); return h + (m || 0) / 60; };

/**
 * Horaires OpenStreetMap simples (« Mo-Sa 08:00-20:00; Su off ») →
 * tableau de 7 jours (0 = dimanche) : [ouverture, fermeture] ou null (fermé).
 * Format trop complexe → null (horaires inconnus : considéré comme ouvert).
 */
export function parseOpeningHours(text) {
  if (!text) return null;
  const s = text.trim().toLowerCase();
  if (s === '24/7') return Array(7).fill([0, 24]);
  const week = Array(7).fill(undefined);
  for (const rule of s.split(';').map((r) => r.trim()).filter(Boolean)) {
    const m = rule.match(/^((?:[a-z]{2}(?:-[a-z]{2})?)(?:,[a-z]{2}(?:-[a-z]{2})?)*)\s+(.+)$/);
    if (!m) { if (/^ph\b/.test(rule)) continue; return null; }
    const days = new Set();
    for (const part of m[1].split(',')) {
      const [a, b] = part.split('-').map((d) => DAYS.indexOf(d));
      if (a < 0 || (b !== undefined && b < 0)) return null;
      if (b === undefined) days.add(a);
      else for (let d = a; ; d = (d + 1) % 7) { days.add(d); if (d === b) break; }
    }
    let slot;
    if (/^(off|closed)$/.test(m[2])) slot = null;
    else {
      const times = [...m[2].matchAll(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/g)];
      if (!times.length) return null;
      slot = [toH(times[0][1]), toH(times.at(-1)[2])];
    }
    for (const d of days) week[d] = slot;
  }
  return week.map((x) => (x === undefined ? null : x));
}

/** Formate les horaires d'aujourd'hui : « 8h–20h » ou « fermé aujourd'hui ». */
export function todayHours(hours, date = new Date()) {
  if (!hours) return '';
  const slot = hours[date.getDay()];
  if (!slot) return "fermé aujourd'hui";
  const f = (h) => `${Math.floor(h)}h${h % 1 ? String(Math.round((h % 1) * 60)).padStart(2, '0') : ''}`;
  return `${f(slot[0])}–${f(slot[1])}`;
}

/** Garde les magasins utiles : les plus proches, 2 par enseigne au maximum. */
export function selectStores(elements, home, { perChain = 2, max = 10 } = {}) {
  const all = [];
  for (const el of elements) {
    const tags = el.tags ?? {};
    const chain = chainFromTags(tags);
    if (!chain || !CHAINS[chain]) continue;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
    const city = [tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(' ');
    all.push({
      id: `osm-${el.type}-${el.id}`,
      chain,
      name: tags.name || CHAINS[chain].name,
      address: [street, city].filter(Boolean).join(', '),
      lat, lng,
      hours: parseOpeningHours(tags.opening_hours),
      km: haversineKm(home, { lat, lng }),
    });
  }
  all.sort((a, b) => a.km - b.km);
  const count = {};
  const kept = [];
  for (const s of all) {
    if ((count[s.chain] ?? 0) >= perChain) continue;
    count[s.chain] = (count[s.chain] ?? 0) + 1;
    kept.push(s);
    if (kept.length >= max) break;
  }
  return kept;
}

/** Supermarchés autour d'un point, via Overpass. */
export async function findStores(home, radiusKm = 3) {
  const r = Math.round(radiusKm * 1000);
  const query = `[out:json][timeout:25];nwr["shop"="supermarket"](around:${r},${home.lat},${home.lng});out center tags;`;
  let lastError;
  for (const endpoint of OVERPASS) {
    try {
      const res = await fetch(endpoint, { method: 'POST', body: new URLSearchParams({ data: query }) });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const { elements = [] } = await res.json();
      return selectStores(elements, home);
    } catch (e) { lastError = e; }
  }
  throw lastError ?? new Error('Overpass indisponible');
}
