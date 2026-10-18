import { collection, doc, documentId, getDoc, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';

async function tokensIn(ref, ids) {
  const tokens = new Map();
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10);
    const snap = await getDocs(query(ref, where(documentId(), 'in', batch)));
    snap.docs.forEach(d => {
      const t = d.data().pushToken;
      if (t) tokens.set(d.id, t);
    });
  }
  return tokens;
}

// A refused read can break the Firestore client for the whole page, so
// profiles are only asked for by someone the rules let read them
async function isPlatformAdmin() {
  const uid = auth.currentUser?.uid;
  if (!uid) return false;
  const snap = await getDoc(doc(db, 'users', uid)).catch(() => null);
  return snap?.exists() && snap.data().isAdmin === true;
}

// Tokens live on each player's private entry in the game, which only its
// hosts can read. Profiles are only readable by platform admins; they fill in
// players from before the app copied its token over.
async function tokensForMembers(gameId, memberIds) {
  const tokens = await tokensIn(collection(db, 'games', gameId, 'private'), memberIds).catch(() => new Map());
  const missing = memberIds.filter(id => !tokens.has(id));
  if (missing.length && (await isPlatformAdmin())) {
    const fromProfiles = await tokensIn(collection(db, 'users'), missing).catch(() => new Map());
    fromProfiles.forEach((t, id) => tokens.set(id, t));
  }
  return [...new Set(tokens.values())];
}

async function sendToTokens(tokens, title, body) {
  if (!tokens.length) return;
  await fetch('/api/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tokens.map(to => ({ to, title, body, sound: 'default' }))),
  });
}

// Players walk around with the phone pocketed, so a host's reply needs a nudge
export async function sendPushToTeam(teamId, title, body) {
  try {
    const teamSnap = await getDoc(doc(db, 'teams', teamId));
    if (!teamSnap.exists()) return;
    const { gameId, memberIds = [] } = teamSnap.data();
    await sendToTokens(await tokensForMembers(gameId, memberIds), title, body);
  } catch {
    // Push is best-effort; the message itself is already saved
  }
}

// Sends an Expo push to every player in a game, via the Netlify function
export async function sendPushToPlayers(gameId, title, body) {
  try {
    const teamsSnap = await getDocs(query(collection(db, 'teams'), where('gameId', '==', gameId)));
    const memberIds = [...new Set(teamsSnap.docs.flatMap(d => d.data().memberIds ?? []))];
    if (!memberIds.length) return;
    await sendToTokens(await tokensForMembers(gameId, memberIds), title, body);
  } catch {
    // Push is best-effort; the game action itself has already been saved
  }
}
