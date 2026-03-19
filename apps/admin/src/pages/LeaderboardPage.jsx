import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';

function medal(rank) {
  if (rank === 0) return '🥇';
  if (rank === 1) return '🥈';
  if (rank === 2) return '🥉';
  return null;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function LeaderboardPage() {
  const { gameId } = useParams();
  const [teams, setTeams] = useState([]);
  const [totalQuests, setTotalQuests] = useState(0);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'teams'), where('gameId', '==', gameId)),
      snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    );
  }, [gameId]);

  useEffect(() => {
    return onSnapshot(collection(db, 'games', gameId, 'quests'), snap => {
      setTotalQuests(snap.size);
    });
  }, [gameId]);

  const sorted = [...teams].sort((a, b) => {
    if (a.finishedAt && b.finishedAt) return a.finishedAt - b.finishedAt;
    if (a.finishedAt) return -1;
    if (b.finishedAt) return 1;
    return (b.completedQuestIds?.length ?? 0) - (a.completedQuestIds?.length ?? 0);
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Leaderboard</h1>

      {sorted.length === 0 ? (
        <p className="text-gray-400">No teams yet.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((team, i) => {
            const completed = team.completedQuestIds?.length ?? 0;
            const pct = totalQuests > 0 ? (completed / totalQuests) * 100 : 0;
            return (
              <div key={team.id} className="bg-white border border-gray-200 rounded-lg px-5 py-4">
                <div className="flex items-center gap-4">
                  <span className="text-xl w-8 text-center shrink-0">
                    {medal(i) ?? <span className="text-sm font-semibold text-gray-400">#{i + 1}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{team.name}</p>
                      <p className="text-xs text-gray-500 shrink-0">
                        {completed} / {totalQuests} quests
                        {team.finishedAt && (
                          <span className="ml-2 text-green-600 font-medium">
                            ✓ {formatTime(team.finishedAt)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-900 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
