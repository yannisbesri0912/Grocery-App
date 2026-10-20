import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

test('sw.js garde hors ligne tous les modules de l\'app', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const dir = new URL('../src/', import.meta.url);
  const imported = new Set();
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    for (const m of readFileSync(new URL(f, dir), 'utf8').matchAll(/from '\.\/([a-z-]+\.js)'/g)) imported.add(m[1]);
  }
  imported.add('app.js');
  const missing = [...imported].filter((f) => !sw.includes(`'src/${f}'`));
  assert.deepEqual(missing, []);
});
