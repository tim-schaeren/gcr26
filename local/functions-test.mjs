// Checks the server functions end to end against the local emulators.
// Needs the emulators, the players and demo race (seed-players.mjs,
// seed-demo.mjs), and the functions running (functions-dev.mjs):
//   node local/functions-test.mjs
// It changes the demo race; run seed-demo.mjs again afterwards.
const API = 'http://localhost:8888';
const useItem = '/api/use-item';
const hosts = '/api/hosts';
const sendPush = '/api/send-push';
const deleteUser = '/api/delete-user';

const AUTH = 'http://localhost:9099/identitytoolkit.googleapis.com/v1';
const FS = 'http://localhost:8080/v1/projects/gcr26-d76cc/databases/(default)/documents';
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
async function token(email, password) {
  const r = await fetch(`${AUTH}/accounts:signInWithPassword?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  return (await r.json()).idToken;
}
const val = v => typeof v === 'number' ? { integerValue: String(v) } : typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : v === null ? { nullValue: null } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, val(x)])) } };
async function patch(path, fields) {
  const mask = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&');
  await fetch(`${FS}/${path}?${mask}`, { method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, val(v)])) }) });
}
async function get(path) {
  const d = await (await fetch(`${FS}/${path}`, { headers: OWNER })).json();
  const out = {};
  for (const [k, v] of Object.entries(d.fields ?? {})) out[k] = v.integerValue !== undefined ? Number(v.integerValue) : v.stringValue ?? v.booleanValue ?? v.nullValue ?? '…';
  return out;
}
async function call(path, tok, body) {
  const res = await fetch(API + path, { method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return `${res.status} ${await res.text()}`;
}
const results = [];
function check(name, got, want) { const ok = got.startsWith(want); results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      ${got}`); }

const G = 'demo-bern';
const started = Date.now();
await patch(`games/${G}`, { shop: { compass: { enabled: true, price: 25, durationMinutes: 5 }, curse: { enabled: true, price: 40, durationMinutes: 2 }, robbery: { enabled: true, price: 30, percent: 25, cap: 30, durationMinutes: 15 }, donate: { enabled: true, price: 0 }, shield: { enabled: true, price: 30 } } });
const katniss = await token('katniss@district12.gov', 'katniss');
const tony = await token('tony@stark.industries', 'tony123');
const sherlock = await token('sherlock@221b.co.uk', 'sherlock');

check('no sign-in is refused', await call(useItem, 'nope', { gameId: G, item: 'curse', targetTeamId: 'demo-cobble' }), '401');
check('curse without enough coins', await call(useItem, katniss, { gameId: G, item: 'curse', targetTeamId: 'demo-cobble' }), '409 {"error":"Not enough coins"}');
await patch('teams/demo-owls', { coins: 200 });
check('curse on yourself', await call(useItem, katniss, { gameId: G, item: 'curse', targetTeamId: 'demo-owls' }), '400');
check('curse a finished team', await call(useItem, katniss, { gameId: G, item: 'curse', targetTeamId: 'demo-bears' }), '409');
check('curse Cobblestone Crew', await call(useItem, katniss, { gameId: G, item: 'curse', targetTeamId: 'demo-cobble' }), '200 {"outcome":"cursed"');
const cobble = await get('teams/demo-cobble');
check('curse is on their team', String(cobble.cursedUntil > Date.now() && cobble.cursedByName === 'Night Owls'), 'true');
check('cursed team can’t use items', await call(useItem, tony, { gameId: G, item: 'robbery', targetTeamId: 'demo-owls' }), '409 {"error":"You’re cursed"}');
check('curse twice', await call(useItem, katniss, { gameId: G, item: 'curse', targetTeamId: 'demo-cobble' }), '409');
check('rob Cobblestone (30 coins → takes 7)', await call(useItem, katniss, { gameId: G, item: 'robbery', targetTeamId: 'demo-cobble' }), '200 {"outcome":"robbed","targetTeamName":"Cobblestone Crew","amount":7}');
check('coins moved', JSON.stringify([(await get('teams/demo-owls')).coins, (await get('teams/demo-cobble')).coins]), '[137,23]');
check('rob again inside the cooldown', await call(useItem, katniss, { gameId: G, item: 'robbery', targetTeamId: 'demo-cobble' }), '409');
await patch('teams/demo-lost', { shields: 1 });
check('curse a shielded team', await call(useItem, katniss, { gameId: G, item: 'curse', targetTeamId: 'demo-lost' }), '200 {"outcome":"blocked"');
check('shield used up, price paid, no curse', JSON.stringify([(await get('teams/demo-lost')).shields, (await get('teams/demo-owls')).coins, !!(await get('teams/demo-lost')).cursedUntil]), '[0,97,false]');
check('donate nothing', await call(useItem, katniss, { gameId: G, item: 'donate', targetTeamId: 'demo-lost', amount: 0 }), '400');
check('donate 10 to Lost & Found', await call(useItem, katniss, { gameId: G, item: 'donate', targetTeamId: 'demo-lost', amount: 10 }), '200 {"outcome":"donated"');
check('donated coins arrived', String((await get('teams/demo-lost')).coins), '35');
check('team from another game', await call(useItem, katniss, { gameId: G, item: 'donate', targetTeamId: 'nope', amount: 1 }), '404');
const acts = await (await fetch(`${FS}/games/${G}/activity?pageSize=100`, { headers: OWNER })).json();
// Only this run's entries: the demo seed doesn't clear earlier ones
const types = acts.documents.filter(d => Number(d.fields.at?.integerValue ?? 0) >= started).map(d => d.fields.type.stringValue).filter(t => ['team_cursed', 'team_robbed', 'attack_blocked', 'coins_donated'].includes(t)).sort();
check('feed entries written', JSON.stringify(types), '["attack_blocked","coins_donated","team_cursed","team_robbed"]');

check('a player can’t list hosts', await call(hosts, katniss, { gameId: G, action: 'list' }), '403');
check('host lists hosts', await call(hosts, sherlock, { gameId: G, action: 'list' }), '200 {"hosts":[{"uid"');
check('host adds a co-host by email', await call(hosts, sherlock, { gameId: G, action: 'add', email: 'Tony@Stark.Industries ' }), '200');
check('unknown email', await call(hosts, sherlock, { gameId: G, action: 'add', email: 'nobody@nowhere.test' }), '404');
const tonyUid = JSON.parse((await call(hosts, sherlock, { gameId: G, action: 'list' })).slice(4)).hosts.find(h => h.name === 'Tony Stark')?.uid;
check('co-host appears by name', String(!!tonyUid), 'true');
check('host removes the co-host', await call(hosts, sherlock, { gameId: G, action: 'remove', uid: tonyUid }), '200');
const sherlockUid = JSON.parse((await call(hosts, sherlock, { gameId: G, action: 'list' })).slice(4)).hosts[0].uid;
check('can’t remove the last host', await call(hosts, sherlock, { gameId: G, action: 'remove', uid: sherlockUid }), '409');

check('a player can’t push', await call(sendPush, katniss, { gameId: G, title: 'hi' }), '403');
check('a host can push', await call(sendPush, sherlock, { gameId: G, title: 'Test', body: 'Hello' }), '200 {"sent":');
check('no sign-in, no push', await call(sendPush, 'nope', { gameId: G, title: 'x' }), '401');

// An admin deletes someone's account, everything the app's own deletion removes
async function signUp(email) {
  const r = await fetch(`${AUTH}/accounts:signUp?key=x`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'pw1234', returnSecureToken: true }) });
  const j = await r.json();
  return { uid: j.localId, token: j.idToken };
}
async function exists(path) { return (await fetch(`${FS}/${path}`, { headers: OWNER })).ok; }
const tag = Date.now();
const doomed = await signUp(`doomed${tag}@test.dev`);
const admin = await signUp(`admin${tag}@test.dev`);
await patch(`users/${admin.uid}`, { name: 'Test admin', isAdmin: true });
await patch(`users/${doomed.uid}`, { name: 'Doomed', isAdmin: false, teamId: 'demo-lost', gameId: G });
await patch(`games/${G}/players/${doomed.uid}`, { id: doomed.uid, name: 'Doomed', joinedAt: 1 });
await patch(`games/${G}/private/${doomed.uid}`, { lastLocation: { lat: 46.9, lng: 7.4, updatedAt: 1 } });
await patch(`games/${G}/messages/doomed-${tag}`, { teamId: 'demo-lost', authorId: doomed.uid, authorName: 'Doomed', fromHost: false, text: 'hello', sentAt: 1 });
await patch(`trail/doomed-${tag}`, { userId: doomed.uid, teamId: 'demo-lost', gameId: G, lat: 46.9, lng: 7.4, t: 1 });
await fetch(`${FS}:commit`, { method: 'POST', headers: OWNER, body: JSON.stringify({ writes: [{ transform: {
  document: `projects/gcr26-d76cc/databases/(default)/documents/teams/demo-lost`,
  fieldTransforms: [{ fieldPath: 'memberIds', appendMissingElements: { values: [{ stringValue: doomed.uid }] } }],
} }] }) });
const membersOfLost = async () => ((await (await fetch(`${FS}/teams/demo-lost`, { headers: OWNER })).json()).fields.memberIds.arrayValue.values ?? []).map(v => v.stringValue);

check('a player can’t delete accounts', await call(deleteUser, katniss, { uid: doomed.uid }), '403');
check('an admin can’t delete themselves here', await call(deleteUser, admin.token, { uid: admin.uid }), '400');
check('an admin deletes an account', await call(deleteUser, admin.token, { uid: doomed.uid }), '200 {"deleted":true,"teams":1');
check('profile, game entries, message and trail are gone', JSON.stringify(await Promise.all([
  exists(`users/${doomed.uid}`), exists(`games/${G}/players/${doomed.uid}`), exists(`games/${G}/private/${doomed.uid}`),
  exists(`games/${G}/messages/doomed-${tag}`), exists(`trail/doomed-${tag}`),
])), '[false,false,false,false,false]');
check('off the team, which stays', String(!(await membersOfLost()).includes(doomed.uid) && await exists('teams/demo-lost')), 'true');
check('they can no longer sign in', String(!(await token(`doomed${tag}@test.dev`, 'pw1234'))), 'true');

console.log(`\n${results.filter(Boolean).length} of ${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
