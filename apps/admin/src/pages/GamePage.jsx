import { useState, useEffect } from 'react';
import {
  doc, collection, query, where,
  updateDoc, getDocs, onSnapshot, writeBatch, documentId,
} from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';

function getStatus(game) {
  if (!game) return null;
  if (game.endedAt) return 'ended';
  if (game.pausedAt) return 'paused';
  if (Date.now() >= game.startDateTime) return 'running';
  return 'upcoming';
}

function formatDateTime(ts) {
  return new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return '—';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

async function sendPushToPlayers(gameId, title, body) {
  try {
    const teamsSnap = await getDocs(query(collection(db, 'teams'), where('gameId', '==', gameId)));
    console.log('[push] teams found:', teamsSnap.docs.length, teamsSnap.docs.map(d => ({ id: d.id, memberIds: d.data().memberIds })));

    const memberIds = [...new Set(teamsSnap.docs.flatMap(d => d.data().memberIds ?? []))];
    console.log('[push] memberIds:', memberIds);
    if (!memberIds.length) { console.warn('[push] no memberIds — aborting'); return; }

    const tokens = [];
    for (let i = 0; i < memberIds.length; i += 10) {
      const batch = memberIds.slice(i, i + 10);
      const usersSnap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', batch)));
      console.log('[push] user docs returned for batch', batch, ':', usersSnap.docs.map(d => ({ id: d.id, pushToken: d.data().pushToken })));
      usersSnap.docs.forEach(d => {
        const t = d.data().pushToken;
        if (t) tokens.push(t);
      });
    }
    console.log('[push] tokens to send to:', tokens);
    if (!tokens.length) { console.warn('[push] no tokens found — aborting'); return; }

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(tokens.map(to => ({ to, title, body, sound: 'default' }))),
    });
    const json = await res.json();
    console.log('[push] Expo API response:', JSON.stringify(json));
  } catch (e) {
    console.warn('[push] failed:', e);
  }
}

const STATUS_STYLES = {
  upcoming: 'bg-gray-100 text-gray-600',
  running:  'bg-green-100 text-green-700',
  paused:   'bg-yellow-100 text-yellow-700',
  ended:    'bg-red-100 text-red-600',
};
const STATUS_LABELS = {
  upcoming: 'Upcoming', running: 'Running', paused: 'Paused', ended: 'Ended',
};

export default function GamePage() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [busy, setBusy] = useState(false);

  // "end game" confirmation — requires typing END
  const [endInput, setEndInput] = useState('');
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // "reset" confirmation — requires typing RESET
  const [resetInput, setResetInput] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    return onSnapshot(doc(db, 'games', gameId), snap => {
      setGame(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  }, [gameId]);

  async function run(fn) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  async function startNow() {
    await run(async () => {
      await updateDoc(doc(db, 'games', gameId), { startDateTime: Date.now() });
      await sendPushToPlayers(gameId, '🏁 The game has started!', 'Good luck — your first quest awaits.');
    });
  }

  async function pause() {
    await run(async () => {
      await updateDoc(doc(db, 'games', gameId), { pausedAt: Date.now() });
      await sendPushToPlayers(gameId, '⏸ Game paused', 'The admins have paused the game. Sit tight!');
    });
  }

  async function resume() {
    const extra = Date.now() - game.pausedAt;
    await run(async () => {
      await updateDoc(doc(db, 'games', gameId), {
        pausedAt: null,
        totalPausedMs: (game.totalPausedMs ?? 0) + extra,
      });
      await sendPushToPlayers(gameId, '▶️ Game resumed', 'The game is back on — keep going!');
    });
  }

  async function endGame() {
    await run(async () => {
      await updateDoc(doc(db, 'games', gameId), { endedAt: Date.now() });
      await sendPushToPlayers(gameId, '🏁 Game over', 'The admins have ended the game. Thanks for playing!');
    });
    setShowEndConfirm(false);
    setEndInput('');
  }

  async function resetGame() {
    await run(async () => {
      const batch = writeBatch(db);
      // Reset game state
      batch.update(doc(db, 'games', gameId), {
        endedAt: null, pausedAt: null, totalPausedMs: 0,
      });
      // Reset all team progress
      const teamsSnap = await getDocs(query(collection(db, 'teams'), where('gameId', '==', gameId)));
      teamsSnap.docs.forEach(d => {
        batch.update(d.ref, { completedQuestIds: [], currentQuestId: null, finishedAt: null, score: 0 });
      });
      await batch.commit();
    });
    setShowResetConfirm(false);
    setResetInput('');
  }

  if (!game) return null;

  const status = getStatus(game);
  const totalPaused = game.totalPausedMs ?? 0;

  return (
    <div className="max-w-sm">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Game</h1>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6 space-y-2">
        <p className="text-sm font-semibold text-gray-900">{game.name}</p>
        <p className="text-xs text-gray-500">Scheduled start: {formatDateTime(game.startDateTime)}</p>
        {totalPaused > 0 && (
          <p className="text-xs text-gray-500">Total paused: {formatDuration(totalPaused)}</p>
        )}
        {game.pausedAt && (
          <p className="text-xs text-yellow-600">Paused at {formatDateTime(game.pausedAt)}</p>
        )}
        {game.endedAt && (
          <p className="text-xs text-red-500">Ended at {formatDateTime(game.endedAt)}</p>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-3">
        {!game.endedAt && (
          <>
            {status === 'upcoming' && (
              <button
                onClick={startNow}
                disabled={busy}
                className="w-full py-3 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                Start now
              </button>
            )}

            {status === 'running' && (
              <button
                onClick={pause}
                disabled={busy}
                className="w-full py-3 bg-yellow-500 text-white rounded-lg text-sm font-semibold hover:bg-yellow-600 disabled:opacity-50 transition-colors"
              >
                Pause game
              </button>
            )}

            {status === 'paused' && (
              <button
                onClick={resume}
                disabled={busy}
                className="w-full py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Resume game
              </button>
            )}

            {(status === 'running' || status === 'paused') && (
              showEndConfirm ? (
                <div className="border border-red-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-gray-700">
                    This will end the game for all players and notify them.
                    Type <span className="font-mono font-bold">END</span> to confirm.
                  </p>
                  <input
                    value={endInput}
                    onChange={e => setEndInput(e.target.value)}
                    placeholder="Type END"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-red-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={endGame}
                      disabled={busy || endInput !== 'END'}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-40 transition-colors"
                    >
                      End game
                    </button>
                    <button
                      onClick={() => { setShowEndConfirm(false); setEndInput(''); }}
                      className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowEndConfirm(true)}
                  className="w-full py-3 border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
                >
                  End game
                </button>
              )
            )}
          </>
        )}

        {/* Reset — only after game has ended */}
        {game.endedAt && (
          showResetConfirm ? (
            <div className="border border-gray-300 rounded-lg p-4 space-y-3">
              <p className="text-sm text-gray-700">
                This will reset all team progress and clear the game state.
                Type <span className="font-mono font-bold">RESET</span> to confirm.
              </p>
              <input
                value={resetInput}
                onChange={e => setResetInput(e.target.value)}
                placeholder="Type RESET"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={resetGame}
                  disabled={busy || resetInput !== 'RESET'}
                  className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  Reset game
                </button>
                <button
                  onClick={() => { setShowResetConfirm(false); setResetInput(''); }}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Reset game
            </button>
          )
        )}
      </div>
    </div>
  );
}
