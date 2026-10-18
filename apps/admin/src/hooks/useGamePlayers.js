import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';

// The people in a game, with their last known position. Hosts read the game's
// own player list — profiles hold email addresses, which hosts don't get to
// see. Platform admins also read profiles, which cover players added by hand
// and anyone on an app version that only reported its position there.
export function useGamePlayers(gameId) {
  const { isAdmin } = useAuth();
  const [members, setMembers] = useState([]);
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    if (!gameId) return;
    return onSnapshot(
      collection(db, 'games', gameId, 'players'),
      snap => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setMembers([]),
    );
  }, [gameId]);

  useEffect(() => {
    if (!isAdmin) {
      setProfiles([]);
      return;
    }
    return onSnapshot(
      collection(db, 'users'),
      snap => setProfiles(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setProfiles([]),
    );
  }, [isAdmin]);

  return useMemo(() => {
    const byId = new Map();
    for (const p of [...profiles, ...members]) {
      const prev = byId.get(p.id);
      if (!prev) {
        byId.set(p.id, p);
        continue;
      }
      // Whichever source saw the player most recently wins the position
      const newer = (p.lastLocation?.updatedAt ?? 0) > (prev.lastLocation?.updatedAt ?? 0);
      byId.set(p.id, { ...prev, ...p, lastLocation: newer ? p.lastLocation : prev.lastLocation });
    }
    return [...byId.values()];
  }, [members, profiles]);
}
