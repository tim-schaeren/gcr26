import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';

export function useUser() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    return onSnapshot(doc(db, 'users', user.uid), snap => {
      setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
  }, [user?.uid]);

  return { profile, loading };
}
