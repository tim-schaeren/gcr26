import { useState, useEffect } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { callApi } from '../utils/api';

// Who may run this game. Any host can add a co-host by email or remove one;
// the server looks the email up, since hosts can't read anyone's account. A
// game always keeps at least one host. Platform admins can run every game.
export default function HostsPanel({ gameId, game, isAdmin, currentUserId }) {
  const [hosts, setHosts] = useState([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const hostIds = game?.hostIds ?? [];
  const canManage = isAdmin || hostIds.includes(currentUserId);

  // Names come from the server; refreshed whenever the list of hosts changes
  useEffect(() => {
    if (!canManage) return;
    callApi('/api/hosts', { gameId, action: 'list' })
      .then(res => setHosts(res.hosts))
      .catch(() => setHosts(hostIds.map(uid => ({ uid, name: uid === currentUserId ? 'You' : 'A host' }))));
  }, [gameId, canManage, hostIds.join(',')]);

  async function run(body) {
    setBusy(true);
    setError(null);
    try {
      const res = await callApi('/api/hosts', { gameId, ...body });
      setHosts(res.hosts);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addHost() {
    if (!email.trim() || busy) return;
    if (await run({ action: 'add', email })) setEmail('');
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Hosts</h2>
      <p className="text-xs text-gray-400 mb-3">
        Hosts run this game: quests, teams, coins and the activity board. Add a co-host by
        the email they signed up with.
      </p>

      {hostIds.length === 0 ? (
        <p className="text-xs text-yellow-600 mb-3">
          No hosts yet — only platform admins can run this game.
        </p>
      ) : (
        <div className="space-y-1 mb-3">
          {hosts.map(({ uid, name }) => (
            <div key={uid} className="flex items-center justify-between text-sm text-gray-700">
              <span>{name}{uid === currentUserId ? ' (you)' : ''}</span>
              {canManage && hosts.length > 1 && (
                <button
                  onClick={() => run({ action: 'remove', uid })}
                  disabled={busy}
                  className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              onKeyDown={e => e.key === 'Enter' && addHost()}
              placeholder="cohost@example.com"
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
          {isAdmin && !hostIds.includes(currentUserId) && (
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
