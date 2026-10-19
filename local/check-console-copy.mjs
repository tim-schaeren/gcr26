// The console is plain JavaScript, so a mistyped catalog name (cc.gamePage.tittle)
// wouldn't fail the build; the page would just show nothing there. This checks
// that every cc.<section>.<name> the console uses exists in the catalog:
//   node local/check-console-copy.mjs
import { build } from 'esbuild';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(tmpdir(), `console-copy-${process.pid}.mjs`);
await build({ entryPoints: [path.join(root, 'packages/shared/src/copy/index.ts')], bundle: true, format: 'esm', outfile: out, logLevel: 'warning' });
const { consoleCopy } = await import(pathToFileURL(out).href);

const files = [];
const walk = d => readdirSync(d, { withFileTypes: true }).forEach(e => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) walk(p); else if (/\.(jsx?|tsx?)$/.test(e.name)) files.push(p);
});
walk(path.join(root, 'apps/admin/src'));
files.push(path.join(root, 'packages/shared/src/questExport.ts'), path.join(root, 'packages/shared/src/shop.ts'));

let used = 0;
const missing = [];
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\b(?:cc|consoleCopy)\.([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)/g)) {
    used++;
    if (!(m[1] in consoleCopy) || !(m[2] in consoleCopy[m[1]])) {
      missing.push(`${path.relative(root, file)}: ${m[0]}`);
    }
  }
}
console.log(`${used} uses checked`);
if (missing.length) {
  console.log(`${missing.length} not in the catalog:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}
console.log('all in the catalog');
