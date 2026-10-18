// A host's push to their players: everyone in the game, or one team. Only the
// game's hosts may send, and the tokens are looked up here, so the console
// never sees them and nobody else can push through this.
import { firebase, callerUid, canManageGame, handle, HttpError, pushToPlayers } from '../lib/server.mjs';

export default (req) => handle(req, async ({ gameId, teamId, title, body }) => {
  const uid = await callerUid(req);
  if (!gameId || !title) throw new HttpError(400, 'Bad request');
  const { db } = firebase();
  const game = (await db.doc(`games/${gameId}`).get()).data();
  if (!game) throw new HttpError(404, 'This game no longer exists');
  if (!(await canManageGame(db, uid, game))) throw new HttpError(403, 'Only this game’s hosts can send push');

  const teams = teamId
    ? [await db.doc(`teams/${teamId}`).get()].filter(t => t.exists && t.data().gameId === gameId)
    : (await db.collection('teams').where('gameId', '==', gameId).get()).docs;
  const uids = teams.flatMap(t => t.data().memberIds ?? []);
  await pushToPlayers(db, gameId, uids, String(title).slice(0, 100), String(body ?? '').slice(0, 300));
  return { sent: uids.length };
});

export const config = { path: '/api/send-push' };
