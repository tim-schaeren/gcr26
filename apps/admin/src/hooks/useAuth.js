import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setIsAdmin(false);
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

  return { user, isAdmin, loading };
}
