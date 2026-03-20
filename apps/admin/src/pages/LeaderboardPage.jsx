import { useState, useEffect } from 'react';
import { collection, doc, query, where, onSnapshot } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';

function medal(rank) {
  if (rank === 0) return '🥇';
  if (rank === 1) return '🥈';
  if (rank === 2) return '🥉';
  return null;
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return '—';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function teamQuestStatus(team, questMap, memberUsers, questOrder) {
  if (team.finishedAt) return null;
  const questId = team.currentQuestId ?? questOrder?.[0] ?? null;
  if (!questId) return null;
  const quest = questMap[questId];
  if (!quest) return null;

  const withLoc = memberUsers.filter(u => u.lastLocation);
  if (!withLoc.length || !quest.location?.lat) {
    return { label: quest.title, solving: false };
  }

  const lat = withLoc.reduce((s, u) => s + u.lastLocation.lat, 0) / withLoc.length;
  const lng = withLoc.reduce((s, u) => s + u.lastLocation.lng, 0) / withLoc.length;
  const solving = distanceMeters(lat, lng, quest.location.lat, quest.location.lng) <= (quest.fenceRadius ?? 50);
  return { label: quest.title, solving };
}

export default function LeaderboardPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [teams, setTeams] = useState([]);
  const [questMap, setQuestMap] = useState({});
  const [users, setUsers] = useState([]);

  useEffect(() => {
    return onSnapshot(doc(db, 'games', gameId), snap => {
      setGame(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  }, [gameId]);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'teams'), where('gameId', '==', gameId)),
      snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    );
  }, [gameId]);

  useEffect(() => {
    return onSnapshot(collection(db, 'games', gameId, 'quests'), snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = { id: d.id, ...d.data() }; });
      setQuestMap(map);
    });
  }, [gameId]);

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const totalQuests = game?.questOrder?.length ?? 0;
  const totalPausedMs = game?.totalPausedMs ?? 0;

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
            const memberUsers = users.filter(u => team.memberIds?.includes(u.id));
            const status = teamQuestStatus(team, questMap, memberUsers, game?.questOrder);

            return (
              <div
                key={team.id}
                className="bg-white border border-gray-200 rounded-lg px-5 py-4 cursor-pointer hover:border-gray-300 transition-colors"
                onClick={() => navigate(`/games/${gameId}/teams`, { state: { highlightTeamId: team.id } })}
              >
                <div className="flex items-center gap-4">
                  <span className="text-xl w-8 text-center shrink-0">
                    {medal(i) ?? <span className="text-sm font-semibold text-gray-400">#{i + 1}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{team.name}</p>
                      <p className="text-xs text-gray-500 shrink-0">
                        {completed} / {totalQuests} quests
                        {team.finishedAt && game && (
                          <span className="ml-2 text-green-600 font-medium">
                            ✓ {formatDuration(team.finishedAt - game.startDateTime - totalPausedMs)}
                          </span>
                        )}
                      </p>
                    </div>
                    {status && (
                      <p className="text-xs text-gray-400 mb-2 truncate">
                        <span
                          className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${status.solving ? 'bg-green-500' : 'bg-yellow-400'}`}
                        />
                        {status.solving ? 'Solving' : 'Looking for'}{' '}
                        <span className="text-gray-500">{status.label}</span>
                      </p>
                    )}
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
