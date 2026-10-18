// Who runs a game. Finding someone by email needs every account, which hosts
// can't read, so it happens here: a host names a co-host by email and never
// sees anyone's account data.
import { FieldValue } from 'firebase-admin/firestore';
import { firebase, callerUid, canManageGame, handle, HttpError } from '../lib/server.mjs';

export default (req) => handle(req, async ({ gameId, action, email, uid: hostUid }) => {
  const uid = await callerUid(req);
  const { auth, db } = firebase();
  const gameRef = db.doc(`games/${gameId ?? '_'}`);
  const game = (await gameRef.get()).data();
  if (!game) throw new HttpError(404, 'This game no longer exists');
  if (!(await canManageGame(db, uid, game))) throw new HttpError(403, 'Only this game’s hosts can do that');
  const hostIds = game.hostIds ?? [];

  if (action === 'add') {
    const wanted = String(email ?? '').trim().toLowerCase();
    if (!wanted) throw new HttpError(400, 'Enter an email address');
    let user;
    try {
      user = await auth.getUserByEmail(wanted);
    } catch {
      throw new HttpError(404, 'No account with that email. They need to sign up first.');
    }
    await gameRef.update({ hostIds: FieldValue.arrayUnion(user.uid) });
  } else if (action === 'remove') {
    if (!hostIds.includes(hostUid)) throw new HttpError(404, 'Not a host of this game');
    // A game always keeps someone who can run it
    if (hostIds.length <= 1) throw new HttpError(409, 'A game needs at least one host');
    await gameRef.update({ hostIds: FieldValue.arrayRemove(hostUid) });
  } else if (action !== 'list') {
    throw new HttpError(400, 'Bad request');
  }

  // Names only: co-hosts see who else runs the game, not their accounts
  const ids = (await gameRef.get()).data().hostIds ?? [];
  const profiles = ids.length ? await db.getAll(...ids.map(id => db.doc(`users/${id}`))) : [];
  return {
    hosts: ids.map((id, i) => ({ uid: id, name: profiles[i]?.data()?.name ?? 'A host' })),
  };
});

export const config = { path: '/api/hosts' };
