// Items one team uses on another: curse, robbery and donate. A team's app may
// only ever change its own team, so these run here, where one transaction
// checks everything, moves the coins, applies a shield, and records it.
import { FieldValue } from 'firebase-admin/firestore';
import {
  SHOP_ITEMS_BY_TYPE,
  shopConfig,
  gameEconomy,
  teamCoins,
  curseMsLeft,
  robberyTake,
} from '@gcr26/shared';
import { firebase, callerUid, handle, HttpError, pushToPlayers } from '../lib/server.mjs';

const TARGETED = ['curse', 'robbery', 'donate'];

export default (req) => handle(req, async ({ gameId, item, targetTeamId, amount }) => {
  const uid = await callerUid(req);
  if (!gameId || !TARGETED.includes(item) || !targetTeamId) throw new HttpError(400, 'Bad request');
  const { db } = firebase();
  const definition = SHOP_ITEMS_BY_TYPE[item];

  const result = await db.runTransaction(async (tx) => {
    const now = Date.now();
    const gameRef = db.doc(`games/${gameId}`);
    const game = (await tx.get(gameRef)).data();
    if (!game) throw new HttpError(404, 'This game no longer exists');
    if (game.endedAt) throw new HttpError(409, 'The game is over');
    if (game.pausedAt) throw new HttpError(409, 'The game is paused');
    if (now < game.startDateTime) throw new HttpError(409, 'The game hasn’t started yet');

    const config = shopConfig(game)[item];
    if (!config.enabled) throw new HttpError(409, `${definition.name} isn’t for sale in this game`);
    const economy = gameEconomy(game);

    const mine = await tx.get(
      db.collection('teams').where('gameId', '==', gameId).where('memberIds', 'array-contains', uid).limit(1),
    );
    if (mine.empty) throw new HttpError(403, 'You aren’t on a team in this game');
    const buyerRef = mine.docs[0].ref;
    const buyer = { id: buyerRef.id, ...mine.docs[0].data() };
    if (buyer.id === targetTeamId) throw new HttpError(400, 'Pick another team');
    if (buyer.finishedAt) throw new HttpError(409, 'Your race is over');
    if (curseMsLeft(buyer, now) > 0) throw new HttpError(409, 'You’re cursed');

    const targetRef = db.doc(`teams/${targetTeamId}`);
    const targetSnap = await tx.get(targetRef);
    const target = targetSnap.exists ? { id: targetSnap.id, ...targetSnap.data() } : null;
    if (!target || target.gameId !== gameId) throw new HttpError(404, 'That team isn’t in this game');

    const gift = item === 'donate' ? Math.floor(Number(amount)) : 0;
    if (item === 'donate' && !(gift > 0)) throw new HttpError(400, 'Choose how many coins to give');

    const buyerCoins = teamCoins(buyer, economy);
    const cost = config.price + gift;
    if (buyerCoins < cost) throw new HttpError(409, 'Not enough coins');

    // Checked before anything is paid, since these aren't the buyer's gamble
    if (item === 'curse') {
      if (target.finishedAt) throw new HttpError(409, `${target.name} has already finished`);
      if (curseMsLeft(target, now) > 0) throw new HttpError(409, `${target.name} is already cursed`);
    }
    if (item === 'robbery' && target.robbedAt && now - target.robbedAt < config.durationMinutes * 60000) {
      throw new HttpError(409, `${target.name} was robbed recently. Try again later.`);
    }

    const activityRef = db.collection(`games/${gameId}/activity`).doc();
    const entry = {
      at: now,
      visibility: 'public',
      teamId: buyer.id,
      teamName: buyer.name,
      targetTeamId: target.id,
      targetTeamName: target.name,
      itemType: item,
    };

    // A shield stops an attack and is used up; the attacker has still paid
    if (definition.isAttack && (target.shields ?? 0) > 0) {
      tx.update(buyerRef, { coins: buyerCoins - config.price });
      tx.update(targetRef, { shields: FieldValue.increment(-1) });
      tx.set(activityRef, { ...entry, type: 'attack_blocked' });
      return { outcome: 'blocked', buyer, target };
    }

    if (item === 'curse') {
      tx.update(buyerRef, { coins: buyerCoins - config.price });
      tx.update(targetRef, { cursedUntil: now + config.durationMinutes * 60000, cursedByName: buyer.name });
      tx.set(activityRef, { ...entry, type: 'team_cursed', durationMinutes: config.durationMinutes });
      return { outcome: 'cursed', buyer, target, minutes: config.durationMinutes };
    }

    if (item === 'robbery') {
      const taken = robberyTake(teamCoins(target, economy), config);
      tx.update(buyerRef, { coins: buyerCoins - config.price + taken });
      tx.update(targetRef, { coins: teamCoins(target, economy) - taken, robbedAt: now });
      tx.set(activityRef, { ...entry, type: 'team_robbed', amount: taken });
      return { outcome: 'robbed', buyer, target, amount: taken };
    }

    tx.update(buyerRef, { coins: buyerCoins - cost });
    tx.update(targetRef, { coins: teamCoins(target, economy) + gift });
    tx.set(activityRef, { ...entry, type: 'coins_donated', amount: gift });
    return { outcome: 'donated', buyer, target, amount: gift };
  });

  // The team on the receiving end hears about it straight away
  const { outcome, buyer, target, amount: n, minutes } = result;
  const coins = `${n} coin${n === 1 ? '' : 's'}`;
  const message = {
    blocked: [`Your shield held`, `It blocked ${buyer.name}’s ${item}.`],
    cursed: [`Cursed!`, `${buyer.name} cursed your team for ${minutes} min.`],
    robbed: [`Robbed!`, `${buyer.name} stole ${coins} from your team.`],
    donated: [`A gift`, `${buyer.name} gave your team ${coins}.`],
  }[outcome];
  await pushToPlayers(db, gameId, target.memberIds ?? [], ...message);

  return { outcome, targetTeamName: target.name, amount: n ?? null };
});

export const config = { path: '/api/use-item' };
