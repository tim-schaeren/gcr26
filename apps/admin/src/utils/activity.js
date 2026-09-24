import { addDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

// Appends an entry to a game's bulletin board. Best-effort: a failure here
// must never undo the admin action that was already saved.
export async function logActivity(gameId, entry) {
  try {
    await addDoc(collection(db, 'games', gameId, 'activity'), {
      at: Date.now(),
      visibility: 'public',
      teamId: null,
      teamName: null,
      ...entry,
    });
  } catch {
    // ignored on purpose
  }
}

async function clearCollection(path) {
  const snap = await getDocs(collection(db, ...path));
  const docs = snap.docs;
  // In chunks, so a long game stays within batch limits
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db);
    docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

export function clearActivity(gameId) {
  return clearCollection(['games', gameId, 'activity']);
}

export function clearAttempts(gameId) {
  return clearCollection(['games', gameId, 'attempts']);
}
