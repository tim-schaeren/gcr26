import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hostedGameIds, setHostedGameIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setIsAdmin(false);
        setHostedGameIds([]);
        setLoading(false);
        return;
      }

      // Check Firestore for admin flag
      const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
      const isAdminUser = snap.exists() && snap.data().isAdmin === true;

      setUser(firebaseUser);
      setIsAdmin(isAdminUser);
      setLoading(false);
    });
  }, []);

  // Games this user hosts. Platform admins can run every game, so they don't
  // need to be listed as a host to get in.
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(collection(db, 'games'), where('hostIds', 'array-contains', user.uid)),
      snap => setHostedGameIds(snap.docs.map(d => d.id)),
      () => setHostedGameIds([]),
    );
  }, [user?.uid]);

  return { user, isAdmin, hostedGameIds, isHost: hostedGameIds.length > 0, loading };
}
