import { useState, useEffect } from 'react';
import { collection, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function PlayersPage() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [games, setGames] = useState([]);

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, 'users'), snap =>
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'teams'), snap =>
        setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'games'), snap =>
        setGames(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));
  const gameMap = Object.fromEntries(games.map(g => [g.id, g]));

  async function toggleAdmin(user) {
    await updateDoc(doc(db, 'users', user.id), { isAdmin: !user.isAdmin });
  }

  const sorted = [...users].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Players</h1>

      {sorted.length === 0 ? (
        <p className="text-gray-400">No players yet.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {sorted.map(user => {
            const team = user.teamId ? teamMap[user.teamId] : null;
            const game = team ? gameMap[team.gameId] : null;
            return (
              <div key={user.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{user.name}</span>
                    {user.isAdmin && (
                      <span className="text-xs bg-gray-900 text-white px-1.5 py-0.5 rounded font-medium">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
                </div>

                <div className="text-xs text-right shrink-0">
                  {team ? (
                    <span className="text-gray-600">
                      {team.name}
                      {game && <span className="text-gray-400"> · {game.name}</span>}
                    </span>
                  ) : (
                    <span className="text-gray-300">Unassigned</span>
                  )}
                </div>

                <button
                  onClick={() => toggleAdmin(user)}
                  className="text-xs text-gray-400 hover:text-gray-700 transition-colors shrink-0"
                >
                  {user.isAdmin ? 'Revoke admin' : 'Make admin'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
