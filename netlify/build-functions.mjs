// Bundles the server functions (netlify/functions) into plain JavaScript,
// with the shared TypeScript package compiled in. Netlify deploys the result
// (netlify.toml points its functions directory here); local/functions-dev.mjs
// uses the same build, so what runs locally is what runs on the site.
//   node netlify/build-functions.mjs
import { build } from 'esbuild';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

// Netlify finds a function's route by reading `export const config = {...}`
// in its source. esbuild rewrites that into a var plus an export list, so it
// is put back in the form Netlify looks for.
function restoreConfigExport(file) {
  let code = readFileSync(file, 'utf8');
  const match = code.match(/\nvar config = (\{[^;]*\});\n/);
  if (!match) throw new Error(`${file}: no config to export`);
  code = code.replace(match[0], '\n').replace(/\n  config,\n/, '\n');
  writeFileSync(file, `${code}export const config = ${match[1]};\n`);
}

export async function buildFunctions(outdir) {
  const sources = readdirSync(path.join(here, 'functions')).filter(f => f.endsWith('.mjs'));
  for (const file of sources) {
    await build({
      entryPoints: [path.join(here, 'functions', file)],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node20',
      // Shipped as a regular dependency: it loads native and data files
      external: ['firebase-admin'],
      outfile: path.join(outdir, file),
      logLevel: 'warning',
    });
    restoreConfigExport(path.join(outdir, file));
  }
  return sources;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const built = await buildFunctions(path.join(here, '.dist'));
  console.log(`Built ${built.length} functions into netlify/.dist`);
}
