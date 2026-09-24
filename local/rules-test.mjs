// Firestore rules test suite.
//
//   1. firebase emulators:start --project rules-test --config firebase.rules-test.json
//   2. node local/rules-test.mjs
//
// Runs against a throwaway project on its own ports, so your dev data is untouched.
// Seeding goes through the emulator REST API with "Authorization: Bearer owner",
// which bypasses rules; every assertion then runs as a real signed-in user.

import { initializeApp } from 'firebase/app';
import {
  getAuth, connectAuthEmulator, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut,
} from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc, addDoc, getDoc,
  getDocs, collection, query, where, orderBy, documentId, writeBatch,
} from 'firebase/firestore';

const PROJECT = 'rules-test';
const AUTH_PORT = 9199;
const FIRESTORE_PORT = 8090;

const app = initializeApp({ apiKey: 'x', projectId: PROJECT });
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, `http://127.0.0.1:${AUTH_PORT}`, { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', FIRESTORE_PORT);

const REST = `http://127.0.0.1:${FIRESTORE_PORT}/v1/projects/${PROJECT}/databases/(default)/documents`;
const owner = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const S = v => ({ stringValue: v });
const B = v => ({ booleanValue: v });
const I = v => ({ integerValue: String(v) });
const ARR = v => ({ arrayValue: { values: v } });

async function seed(path, fields) {
  const res = await fetch(`${REST}/${path}`, { method: 'PATCH', headers: owner, body: JSON.stringify({ fields }) });
  if (!res.ok) throw new Error(`seed ${path}: ${await res.text()}`);
}

const results = [];
let section = '';
const group = name => { section = name; };
async function expect(name, shouldPass, fn) {
  try {
    const value = await fn();
    results.push({ section, name, ok: shouldPass, detail: typeof value === 'number' ? `${value} docs` : 'allowed' });
  } catch (e) {
    results.push({ section, name, ok: !shouldPass, detail: e.code ?? e.message });
  }
}

const tag = Date.now();
const id = suffix => `${suffix}_${tag}`;
const GAME = id('game');
const GAME_NO_HOSTS = id('legacygame');
const TEAM_A = id('teamA');
const TEAM_B = id('teamB');
const QUEST = 'q1';

// A deliberately incomplete profile: what the app wrote before it set isAdmin/teamId.
// Rules must cope, since accounts like this exist in production.
const people = {
  admin:   { isAdmin: true,  teamId: null,   sparse: false },
  host:    { isAdmin: false, teamId: null,   sparse: false },
  playerA: { isAdmin: false, teamId: TEAM_A, sparse: true  },
  mateA:   { isAdmin: false, teamId: TEAM_A, sparse: false },
  playerB: { isAdmin: false, teamId: TEAM_B, sparse: false },
  outsider:{ isAdmin: false, teamId: null,   sparse: false },
};

for (const [key, person] of Object.entries(people)) {
  person.email = `${key}${tag}@test.dev`;
  person.pass = 'pw1234';
  const { user } = await createUserWithEmailAndPassword(auth, person.email, person.pass);
  person.uid = user.uid;
  await signOut(auth);
  const fields = { name: S(key), email: S(person.email), createdAt: I(1) };
  if (!person.sparse) {
    fields.isAdmin = B(person.isAdmin);
    fields.pushToken = { nullValue: null };
  }
  if (person.teamId) fields.teamId = S(person.teamId);
  else if (!person.sparse) fields.teamId = { nullValue: null };
  await seed(`users/${person.uid}`, fields);
}

await seed(`games/${GAME}`, { name: S('Hosted game'), hostIds: ARR([S(people.host.uid)]), questOrder: ARR([S(QUEST), S('q2')]) });
await seed(`games/${GAME_NO_HOSTS}`, { name: S('Game with no hostIds'), questOrder: ARR([]) });
await seed(`teams/${TEAM_A}`, {
  name: S('Team A'), gameId: S(GAME), memberIds: ARR([S(people.playerA.uid), S(people.mateA.uid)]),
  currentQuestId: S(QUEST), completedQuestIds: ARR([]), coins: I(10), finishedAt: { nullValue: null },
});
await seed(`teams/${TEAM_B}`, {
  name: S('Team B'), gameId: S(GAME), memberIds: ARR([S(people.playerB.uid)]),
  currentQuestId: S(QUEST), completedQuestIds: ARR([]), coins: I(10), finishedAt: { nullValue: null },
});
await seed(`games/${GAME}/activity/pub`, { type: S('quest_solved'), at: I(1), visibility: S('public'), teamId: S(TEAM_A), teamName: S('Team A') });
await seed(`games/${GAME}/activity/privA`, { type: S('hint_revealed'), at: I(2), visibility: S('team'), teamId: S(TEAM_A), teamName: S('Team A') });
await seed(`games/${GAME}/activity/privB`, { type: S('hint_revealed'), at: I(3), visibility: S('team'), teamId: S(TEAM_B), teamName: S('Team B') });
await seed(`games/${GAME}/activity/note`, { type: S('admin_note'), at: I(4), visibility: S('public'), teamId: { nullValue: null }, teamName: { nullValue: null }, text: S('hello') });
await seed(`games/${GAME}/messages/mA`, { teamId: S(TEAM_A), authorId: S(people.playerA.uid), authorName: S('A'), fromHost: B(false), text: S('team A only'), sentAt: I(1) });
await seed(`games/${GAME}/messages/mB`, { teamId: S(TEAM_B), authorId: S(people.playerB.uid), authorName: S('B'), fromHost: B(false), text: S('team B only'), sentAt: I(2) });
await seed(`games/${GAME}/attempts/a1`, { questId: S(QUEST), teamId: S(TEAM_A), teamName: S('Team A'), text: S('seven'), at: I(1) });
await seed(`trail/tr1_${tag}`, { userId: S(people.playerA.uid), teamId: S(TEAM_A), gameId: S(GAME), lat: { doubleValue: 1 }, lng: { doubleValue: 2 }, t: I(1) });

const as = async who => {
  await signOut(auth).catch(() => {});
  await signInWithEmailAndPassword(auth, people[who].email, people[who].pass);
};
const activity = collection(db, 'games', GAME, 'activity');
const messages = collection(db, 'games', GAME, 'messages');
const attempts = collection(db, 'games', GAME, 'attempts');
const solvedEntry = {
  type: 'quest_solved', at: Date.now(), visibility: 'public',
  teamId: TEAM_A, teamName: 'Team A', questTitle: 'Q1', questNumber: 1,
};

// ── A player with an incomplete profile can still play ──────────────────────
group('player (sparse profile)');
await as('playerA');
await expect('solves a quest: progress + board entry in one batch', true, () => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'teams', TEAM_A), { completedQuestIds: [QUEST], currentQuestId: 'q2', questProgress: null, coins: 20 });
  batch.set(doc(db, 'games', GAME, 'activity', `${TEAM_A}_quest_solved_${QUEST}`), solvedEntry);
  return batch.commit();
});
await expect('a teammate repeating the same solve is an allowed overwrite', true, () => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'teams', TEAM_A), { coins: 20 });
  batch.set(doc(db, 'games', GAME, 'activity', `${TEAM_A}_quest_solved_${QUEST}`), solvedEntry);
  return batch.commit();
});
await expect('reveals a hint', true, () => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'teams', TEAM_A), { coins: 10, hintsRevealed: { [QUEST]: 1 } });
  batch.set(doc(db, 'games', GAME, 'activity', `${TEAM_A}_hint_${QUEST}_1`), {
    type: 'hint_revealed', at: Date.now(), visibility: 'team', teamId: TEAM_A, teamName: 'Team A', questTitle: 'Q1', amount: 10,
  });
  return batch.commit();
});
await expect('records a wrong answer', true, () => addDoc(attempts, { questId: QUEST, teamId: TEAM_A, teamName: 'Team A', text: 'seven', at: Date.now() }));
await expect('sends a chat message', true, () => addDoc(messages, { teamId: TEAM_A, authorId: people.playerA.uid, authorName: 'A', fromHost: false, text: 'hi', sentAt: Date.now() }));
await expect('marks the chat thread read', true, () => updateDoc(doc(db, 'teams', TEAM_A), { teamChatReadAt: Date.now() }));
await expect('writes own location', true, () => updateDoc(doc(db, 'users', people.playerA.uid), { lastLocation: { lat: 1, lng: 2, updatedAt: Date.now() } }));
await expect('adds a trail point', true, () => addDoc(collection(db, 'trail'), { userId: people.playerA.uid, teamId: TEAM_A, gameId: GAME, lat: 1, lng: 2, t: Date.now() }));
await expect('reads teammate locations (spread check)', true, async () =>
  (await getDocs(query(collection(db, 'users'), where(documentId(), 'in', [people.playerA.uid, people.mateA.uid])))).docs.length);
await expect('reads the public board', true, async () =>
  (await getDocs(query(activity, where('visibility', '==', 'public'), orderBy('at', 'desc')))).docs.length);
await expect('reads own team board entries', true, async () =>
  (await getDocs(query(activity, where('teamId', '==', TEAM_A), orderBy('at', 'desc')))).docs.length);
await expect('reads own chat thread', true, async () =>
  (await getDocs(query(messages, where('teamId', '==', TEAM_A), orderBy('sentAt')))).docs.length);

// ── and cannot do a host's job, or peek at rivals ───────────────────────────
group('player limits');
await expect("cannot read a rival's private entries", false, async () =>
  (await getDocs(query(activity, where('teamId', '==', TEAM_B), orderBy('at', 'desc')))).docs.length);
await expect('cannot read the whole board unfiltered', false, async () =>
  (await getDocs(query(activity, orderBy('at', 'desc')))).docs.length);
await expect("cannot read a rival's chat thread", false, async () =>
  (await getDocs(query(messages, where('teamId', '==', TEAM_B), orderBy('sentAt')))).docs.length);
await expect('cannot read wrong answers, not even its own', false, async () => (await getDocs(attempts)).docs.length);
await expect('cannot rename its team', false, () => updateDoc(doc(db, 'teams', TEAM_A), { name: 'hax' }));
await expect('cannot edit a quest', false, () => setDoc(doc(db, 'games', GAME, 'quests', QUEST), { title: 'hax' }));
await expect('cannot edit the game', false, () => updateDoc(doc(db, 'games', GAME), { name: 'hax' }));
await expect('cannot make itself a host', false, () => updateDoc(doc(db, 'games', GAME), { hostIds: [people.playerA.uid] }));
await expect('cannot overwrite an admin note', false, () => setDoc(doc(db, 'games', GAME, 'activity', 'note'), solvedEntry));
await expect("cannot overwrite a rival's entry", false, () => setDoc(doc(db, 'games', GAME, 'activity', 'privB'), solvedEntry));
await expect('cannot write a board entry as another team', false, () => setDoc(doc(db, 'games', GAME, 'activity', id('forged')), { ...solvedEntry, teamId: TEAM_B }));
await expect('cannot post a chat message as a host', false, () => addDoc(messages, { teamId: TEAM_A, authorId: people.playerA.uid, authorName: 'A', fromHost: true, text: 'free coins', sentAt: Date.now() }));
await expect('cannot forge the author of a message', false, () => addDoc(messages, { teamId: TEAM_A, authorId: people.playerB.uid, authorName: 'B', fromHost: false, text: 'x', sentAt: Date.now() }));
await expect('cannot record a wrong answer for another team', false, () => addDoc(attempts, { questId: QUEST, teamId: TEAM_B, teamName: 'Team B', text: 'x', at: Date.now() }));
await expect('cannot forge the host read marker', false, () => updateDoc(doc(db, 'teams', TEAM_A), { hostChatReadAt: Date.now() }));
await expect('cannot sneak a rename in with an allowed field', false, () => updateDoc(doc(db, 'teams', TEAM_A), { coins: 1, name: 'hax' }));
await expect('cannot read the trail', false, async () =>
  (await getDocs(query(collection(db, 'trail'), where('gameId', '==', GAME)))).docs.length);

group('rival team');
await as('playerB');
await expect("cannot read team A's private entries", false, async () =>
  (await getDocs(query(activity, where('teamId', '==', TEAM_A), orderBy('at', 'desc')))).docs.length);
await expect("cannot read team A's chat", false, async () =>
  (await getDocs(query(messages, where('teamId', '==', TEAM_A), orderBy('sentAt')))).docs.length);
await expect('can read the public board', true, async () =>
  (await getDocs(query(activity, where('visibility', '==', 'public'), orderBy('at', 'desc')))).docs.length);

// ── hosts run their own game, and only theirs ───────────────────────────────
group('host');
await as('host');
await expect('edits their game', true, () => updateDoc(doc(db, 'games', GAME), { name: 'Renamed by host' }));
await expect('writes a quest', true, () => setDoc(doc(db, 'games', GAME, 'quests', QUEST), { title: 'Q1', isActive: true }));
await expect('edits a team in their game', true, () => updateDoc(doc(db, 'teams', TEAM_A), { name: 'Team A' }));
await expect('moves a team (per-team controls)', true, () => updateDoc(doc(db, 'teams', TEAM_A), { currentQuestId: QUEST, questProgress: null, finishedAt: null }));
await expect('logs an intervention', true, () => addDoc(activity, { type: 'admin_marked_solved', at: Date.now(), visibility: 'team', teamId: TEAM_A, teamName: 'Team A', questTitle: 'Q1' }));
await expect('posts a note', true, () => addDoc(activity, { type: 'admin_note', at: Date.now(), visibility: 'public', teamId: null, teamName: null, text: 'Bonus at the fountain' }));
await expect('adjusts coins and writes the ledger', true, async () => {
  await updateDoc(doc(db, 'teams', TEAM_A), { coins: 30 });
  return addDoc(collection(db, 'teams', TEAM_A, 'coinLedger'), { delta: 20, reason: 'side challenge', balanceAfter: 30, byName: 'host', at: Date.now() });
});
await expect('reads every chat thread', true, async () => (await getDocs(query(messages, orderBy('sentAt')))).docs.length);
await expect('reads wrong answers', true, async () => (await getDocs(attempts)).docs.length);
await expect('reads the whole board', true, async () => (await getDocs(query(activity, orderBy('at', 'desc')))).docs.length);
await expect('replies in chat', true, () => addDoc(messages, { teamId: TEAM_A, authorId: people.host.uid, authorName: 'host', fromHost: true, text: 'on our way', sentAt: Date.now() }));
await expect('marks a thread read', true, () => updateDoc(doc(db, 'teams', TEAM_A), { hostChatReadAt: Date.now() }));
await expect('reads the trail of their game', true, async () =>
  (await getDocs(query(collection(db, 'trail'), where('gameId', '==', GAME)))).docs.length);
await expect('CANNOT touch a game with no hostIds', false, () => updateDoc(doc(db, 'games', GAME_NO_HOSTS), { name: 'hax' }));
await expect('CANNOT write a quest in a game it does not host', false, () => setDoc(doc(db, 'games', GAME_NO_HOSTS, 'quests', 'q1'), { title: 'hax' }));
await expect('CANNOT read the player list', false, async () => (await getDocs(collection(db, 'users'))).docs.length);

group('outsider');
await as('outsider');
await expect('cannot edit a game', false, () => updateDoc(doc(db, 'games', GAME), { name: 'hax' }));
await expect('cannot edit a team', false, () => updateDoc(doc(db, 'teams', TEAM_A), { name: 'hax' }));
await expect('cannot make itself a host', false, () => updateDoc(doc(db, 'games', GAME), { hostIds: [people.outsider.uid] }));
await expect('cannot write a board entry', false, () => addDoc(activity, { type: 'quest_solved', at: Date.now(), visibility: 'public', teamId: TEAM_A, teamName: 'Team A' }));

group('platform admin');
await as('admin');
await expect('runs a game with no hostIds', true, () => updateDoc(doc(db, 'games', GAME_NO_HOSTS), { name: 'Admin can' }));
await expect('grants hosting', true, () => updateDoc(doc(db, 'games', GAME_NO_HOSTS), { hostIds: [people.host.uid] }));
await expect('reads the player list', true, async () => (await getDocs(collection(db, 'users'))).docs.length);
await expect('reads a sparse profile', true, () => getDoc(doc(db, 'users', people.playerA.uid)));

let current = '';
for (const r of results) {
  if (r.section !== current) { current = r.section; console.log(`\n── ${current} ──`); }
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}  (${r.detail})`);
}
const failed = results.filter(r => !r.ok);
console.log(failed.length
  ? `\n${failed.length} of ${results.length} FAILED`
  : `\nALL ${results.length} RULES TESTS PASSED`);
process.exit(failed.length ? 1 : 0);
