import { collection, documentId, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

// Sends an Expo push to every player in a game, via the Netlify function
export async function sendPushToPlayers(gameId, title, body) {
  try {
    const teamsSnap = await getDocs(query(collection(db, 'teams'), where('gameId', '==', gameId)));
    const memberIds = [...new Set(teamsSnap.docs.flatMap(d => d.data().memberIds ?? []))];
    if (!memberIds.length) return;

    const tokens = [];
    for (let i = 0; i < memberIds.length; i += 10) {
      const batch = memberIds.slice(i, i + 10);
      const usersSnap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', batch)));
      usersSnap.docs.forEach(d => {
        const t = d.data().pushToken;
        if (t) tokens.push(t);
      });
    }
    if (!tokens.length) return;

    await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokens.map(to => ({ to, title, body, sound: 'default' }))),
    });
  } catch {
    // Push is best-effort; the game action itself has already been saved
  }
}
