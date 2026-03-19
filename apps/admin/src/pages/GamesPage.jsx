import { useState, useEffect, useRef } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import GameForm from '../components/GameForm';

export default function GamesPage() {
  const [games, setGames] = useState([]);
  const [selected, setSelected] = useState(null); // game object or 'new'
  const [saving, setSaving] = useState(false);
  const isDirty = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    return onSnapshot(collection(db, 'games'), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => a.startDateTime - b.startDateTime);
      setGames(list);
    });
  }, []);

  function tryClose(callback) {
    if (isDirty.current && !confirm('You have unsaved changes. Discard them?')) return;
    isDirty.current = false;
    callback?.();
  }

  function handleRowClick(game) {
    if (selected && selected !== 'new' && selected.id === game.id) {
      tryClose(() => setSelected(null));
    } else {
      tryClose(() => setSelected(game));
    }
  }

  async function handleSave(data) {
    setSaving(true);
    try {
      if (selected === 'new') {
        await addDoc(collection(db, 'games'), data);
      } else {
        await updateDoc(doc(db, 'games', selected.id), data);
      }
      isDirty.current = false;
      setSelected(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected || selected === 'new') return;
    if (!confirm(`Delete "${selected.name}"? This will also delete all its quests.`)) return;
    await deleteDoc(doc(db, 'games', selected.id));
    isDirty.current = false;
    setSelected(null);
  }

  function handleCancel() {
    tryClose(() => setSelected(null));
  }

  return (
    <div className="flex h-full gap-6">
      {/* List */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Games</h1>
          <button
            onClick={() => tryClose(() => setSelected('new'))}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            + New Game
          </button>
        </div>

        {games.length === 0 ? (
          <p className="text-gray-400">No games yet. Create your first one.</p>
        ) : (
          <div className="space-y-2">
            {games.map(game => (
              <div
                key={game.id}
                onClick={() => handleRowClick(game)}
                className={`flex items-center gap-4 bg-white border rounded-lg px-4 py-3 cursor-pointer transition-colors
                  ${selected && selected !== 'new' && selected.id === game.id
                    ? 'border-gray-900 ring-1 ring-gray-900'
                    : 'border-gray-200 hover:border-gray-400'}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{game.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {game.city} · {new Date(game.startDateTime).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/games/${game.id}/quests`); }}
                  className="text-sm text-gray-400 hover:text-gray-900 transition-colors shrink-0"
                >
                  Quests →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide-over panel */}
      {selected && (
        <div className="w-96 border-l border-gray-200 bg-white -mr-8 -my-8 flex flex-col shadow-sm">
          <GameForm
            game={selected === 'new' ? null : selected}
            onSave={handleSave}
            onCancel={handleCancel}
            onDelete={handleDelete}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
}
