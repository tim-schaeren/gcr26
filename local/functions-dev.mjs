// Runs the site's server functions (netlify/functions) on this computer,
// against the local emulators, the way Netlify runs them in production:
//   node local/functions-dev.mjs
// The console's dev server forwards /api here. For the app on a phone, set
// EXPO_PUBLIC_API_URL=http://<this computer's LAN IP>:8888 in apps/mobile/.env.
import { buildFunctions } from '../netlify/build-functions.mjs';
import { createServer } from 'node:http';
import { mkdirSync, symlinkSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'local', '.functions-build');
const host = process.env.EMULATOR_HOST ?? 'localhost';
process.env.FIRESTORE_EMULATOR_HOST = `${host}:8080`;
process.env.FIREBASE_AUTH_EMULATOR_HOST = `${host}:9099`;
process.env.GCLOUD_PROJECT = 'gcr26-d76cc';

mkdirSync(out, { recursive: true });
if (!existsSync(path.join(out, 'node_modules'))) symlinkSync(path.join(root, 'node_modules'), path.join(out, 'node_modules'));

const routes = {};
for (const file of await buildFunctions(out)) {
  const mod = await import(pathToFileURL(path.join(out, file)).href);
  routes[mod.config.path] = mod.default;
}

createServer(async (req, res) => {
  // The app on a phone calls from another origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.end();
  const fn = routes[req.url.split('?')[0]];
  if (!fn) { res.statusCode = 404; return res.end('Not found'); }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const response = await fn(new Request(`http://localhost${req.url}`, {
    method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined,
  }));
  res.statusCode = response.status;
  res.setHeader('Content-Type', response.headers.get('content-type') ?? 'application/json');
  res.end(await response.text());
}).listen(8888, () => console.log(`Functions on http://localhost:8888: ${Object.keys(routes).join(', ')}`));
