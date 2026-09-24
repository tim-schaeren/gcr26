import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

// Who may run this game. Platform admins can run every game without being listed.
// Only admins can grant hosting, because finding a user by email needs the player list.
export default function HostsPanel({ gameId, game, isAdmin, currentUserId }) {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const hostIds = game?.hostIds ?? [];

  useEffect(() => {
    if (!isAdmin) return;
    return onSnapshot(collection(db, 'users'), snap =>
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [isAdmin]);

  async function addHost() {
    const wanted = email.trim().toLowerCase();
    if (!wanted || busy) return;
    const match = users.find(u => (u.email ?? '').toLowerCase() === wanted);
    if (!match) {
      setError('No player with that email. They need an account first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'games', gameId), { hostIds: arrayUnion(match.id) });
      setEmail('');
    } finally {
      setBusy(false);
    }
  }

  async function removeHost(uid) {
    await updateDoc(doc(db, 'games', gameId), { hostIds: arrayRemove(uid) });
  }

  const nameFor = uid => {
    const user = users.find(u => u.id === uid);
    if (user) return user.name || user.email || uid;
    return uid === currentUserId ? 'You' : uid;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Hosts</h2>
      <p className="text-xs text-gray-400 mb-3">
        Hosts run this game: quests, teams, coins and the activity board. Platform admins can run every game.
      </p>

      {hostIds.length === 0 ? (
        <p className="text-xs text-yellow-600 mb-3">
          No hosts yet — only platform admins can run this game.
        </p>
      ) : (
        <div className="space-y-1 mb-3">
          {hostIds.map(uid => (
            <div key={uid} className="flex items-center justify-between text-sm text-gray-700">
              <span>{nameFor(uid)}{uid === currentUserId ? ' (you)' : ''}</span>
              {isAdmin && (
                <button
                  onClick={() => removeHost(uid)}
                  className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              onKeyDown={e => e.key === 'Enter' && addHost()}
              placeholder="player@example.com"
            />
            <button
              onClick={addHost}
              disabled={!email.trim() || busy}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Add host
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          {!hostIds.includes(currentUserId) && (
            <button
              onClick={() => updateDoc(doc(db, 'games', gameId), { hostIds: arrayUnion(currentUserId) })}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors mt-2"
            >
              + Add me as host
            </button>
          )}
        </>
      )}
    </div>
  );
}
