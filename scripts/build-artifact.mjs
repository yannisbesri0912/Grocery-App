// Assemble l'app en une seule page HTML autonome (CSS + JS inline), pour la
// publier comme Artifact claude.ai : un lien à ouvrir sur le téléphone.
// Usage : node scripts/build-artifact.mjs [sortie]   (défaut : dist/courses-opti.html)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');
const out = process.argv[2] ?? join(root, 'dist/courses-opti.html');

// Les modules sont concaténés dans l'ordre des dépendances : on retire les
// imports (les noms deviennent globaux au module unique) et les `export`.
const strip = (src) => src
  .replace(/^import[\s\S]*?from\s+'[^']+';\n/gm, '')
  .replace(/^export\s+(?=(const|function|async|let|class)\b)/gm, '');
const js = ['src/data.js', 'src/optimizer.js', 'src/app.js'].map((f) => `// ---- ${f}\n${strip(read(f))}`).join('\n');
if (/^\s*(import|export)\s/m.test(js)) throw new Error('import/export restant après assemblage');

const html = read('index.html');
// Les vrais prix sont intégrés à la page (elle ne peut rien télécharger d'autre).
let prices = 'null';
try { prices = JSON.stringify(JSON.parse(read('data/prices.json'))).replace(/</g, '\\u003c'); } catch { /* pas encore de prix */ }
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'))
  .replace(/<script[^>]*src="src\/app\.js"[^>]*><\/script>/, '');
const icon = `data:image/svg+xml;base64,${Buffer.from(read('icon.svg')).toString('base64')}`;

const page = `<title>Courses Opti</title>
<style>
${read('src/style.css')}
</style>
${body.replaceAll('src="icon.svg"', `src="${icon}"`).trim()}
<script>window.__PRICES__ = ${prices};</script>
<script type="module">
${js}
</script>
`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, page);
console.log(`${out} (${(page.length / 1024).toFixed(0)} Ko)`);
