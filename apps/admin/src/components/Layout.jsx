import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useMatch, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import GameForm from './GameForm';

export default function Layout() {
  const [games, setGames] = useState([]);
  const [persistedGameId, setPersistedGameId] = useState(
    () => localStorage.getItem('lastGameId')
  );
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [saving, setSaving] = useState(false);
  const switcherRef = useRef(null);
  const hasAutoSelected = useRef(false);

  const navigate = useNavigate();
  const location = useLocation();
  const match = useMatch('/games/:gameId/*');
  const gameId = match?.params?.gameId;
  const section = match?.params?.['*'];

  // The "active" game for the sidebar — persists even when on /players
  const activeGameId = gameId ?? persistedGameId;
  const currentGame = games.find(g => g.id === activeGameId);

  useEffect(() => {
    return onSnapshot(collection(db, 'games'), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => a.startDateTime - b.startDateTime);
      setGames(list);
    });
  }, []);

  // Auto-select a game on first load if none is in the URL
  useEffect(() => {
    if (hasAutoSelected.current || gameId || games.length === 0) return;
    hasAutoSelected.current = true;
    const lastId = localStorage.getItem('lastGameId');
    const target = games.find(g => g.id === lastId) ?? games[0];
    navigate(`/games/${target.id}/quests`, { replace: true });
  }, [games]);

  // Persist gameId whenever it changes
  useEffect(() => {
    if (gameId && gameId !== persistedGameId) {
      setPersistedGameId(gameId);
      localStorage.setItem('lastGameId', gameId);
    }
  }, [gameId]);

  // Close switcher on outside click
  useEffect(() => {
    function onMouseDown(e) {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setSwitcherOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  useEffect(() => { setSwitcherOpen(false); }, [location.pathname]);

  function switchGame(game) {
    const target = (section === 'quests' || section === 'teams') ? section : 'quests';
    navigate(`/games/${game.id}/${target}`);
  }

  async function handleSaveGame(data) {
    setSaving(true);
    try {
      if (editingGame === 'new') {
        const ref = await addDoc(collection(db, 'games'), data);
        navigate(`/games/${ref.id}/quests`);
      } else {
        await updateDoc(doc(db, 'games', editingGame.id), data);
      }
      setEditingGame(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGame() {
    if (!editingGame || editingGame === 'new') return;
    await deleteDoc(doc(db, 'games', editingGame.id));
    if (editingGame.id === gameId) navigate('/players');
    setEditingGame(null);
  }

  const navClass = ({ isActive }) =>
    `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-52 bg-white border-r border-gray-200 flex flex-col">

        {/* Game switcher */}
        <div ref={switcherRef} className="relative px-3 py-3 border-b border-gray-100">
          <button
            onClick={() => setSwitcherOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <p className="font-semibold text-gray-900 truncate">
              {currentGame?.name ?? 'Select game'}
            </p>
            <span className="text-gray-400 text-[10px] ml-2 shrink-0">
              {switcherOpen ? '▲' : '▼'}
            </span>
          </button>

          {switcherOpen && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
              {games.length === 0 && (
                <p className="px-3 py-2 text-sm text-gray-400">No games yet</p>
              )}
              {games.map(game => (
                <div key={game.id} className="flex items-center group">
                  <button
                    onClick={() => switchGame(game)}
                    className={`flex-1 text-left px-3 py-2 text-sm transition-colors truncate ${
                      game.id === activeGameId
                        ? 'font-medium text-gray-900 bg-gray-50'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {game.name}
                  </button>
                  <button
                    onClick={() => { setEditingGame(game); setSwitcherOpen(false); }}
                    className="px-2 py-2 text-xs text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    title="Edit game"
                  >
                    ✎
                  </button>
                </div>
              ))}
              <button
                onClick={() => { setEditingGame('new'); setSwitcherOpen(false); }}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-400 hover:bg-gray-50 border-t border-gray-100 transition-colors"
              >
                + New game
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {activeGameId && (
            <>
              <NavLink to={`/games/${activeGameId}/quests`} className={navClass}>Quests</NavLink>
              <NavLink to={`/games/${activeGameId}/teams`} className={navClass}>Teams</NavLink>
              <div className="pt-2 mt-2 border-t border-gray-100" />
            </>
          )}
          <NavLink to="/players" className={navClass}>Players</NavLink>
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={() => signOut(auth)}
            className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {editingGame !== null && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setEditingGame(null)} />
          <div className="fixed right-0 inset-y-0 z-50 w-96 bg-white shadow-xl flex flex-col">
            <GameForm
              game={editingGame === 'new' ? null : editingGame}
              onSave={handleSaveGame}
              onCancel={() => setEditingGame(null)}
              onDelete={handleDeleteGame}
              saving={saving}
            />
          </div>
        </>
      )}

      <main className="flex-1 overflow-hidden flex">
        <div className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
