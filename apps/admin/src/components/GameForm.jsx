import { useState, useEffect } from 'react';
import { geocodeCity } from '../utils/geocode';

const EMPTY = { name: '', startDateTime: '', city: '', maxTeamSize: '' };

function toFormState(game) {
  if (!game) return EMPTY;
  const dt = game.startDateTime
    ? new Date(game.startDateTime).toISOString().slice(0, 16)
    : '';
  return {
    name: game.name,
    startDateTime: dt,
    city: game.city,
    maxTeamSize: game.maxTeamSize ?? '',
  };
}

export default function GameForm({ game, onSave, onCancel, onDelete, saving }) {
  const [form, setForm] = useState(() => toFormState(game));
  const [errors, setErrors] = useState({});
  const [geocoding, setGeocoding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  useEffect(() => {
    setForm(toFormState(game));
    setErrors({});
    setConfirming(false);
    setDeleteInput('');
  }, [game?.id]);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.startDateTime) e.startDateTime = 'Start date and time are required.';
    if (!form.city.trim()) e.city = 'City is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setGeocoding(true);
    try {
      const coords = await geocodeCity(form.city.trim());
      if (!coords) {
        setErrors(e => ({ ...e, city: 'Could not find this city. Check the spelling.' }));
        return;
      }
      const parsed = parseInt(form.maxTeamSize);
      onSave({
        name: form.name.trim(),
        startDateTime: new Date(form.startDateTime).getTime(),
        city: form.city.trim(),
        cityCoordinates: coords,
        questOrder: game?.questOrder ?? [],
        ...(Number.isFinite(parsed) && parsed > 0 ? { maxTeamSize: parsed } : { maxTeamSize: null }),
      });
    } finally {
      setGeocoding(false);
    }
  }

  const isBusy = saving || geocoding;
  const deleteConfirmed = deleteInput === game?.name;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">
          {game ? 'Edit Game' : 'New Game'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {confirming ? (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">Delete this game?</p>
              <p className="text-sm text-red-600">
                This will permanently delete <span className="font-medium">{game.name}</span> and all its quests. This cannot be undone.
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Type <span className="font-semibold">{game.name}</span> to confirm:
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder={game.name}
                autoFocus
              />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Grand City Race 2026"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start date & time</label>
              <input
                type="datetime-local"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${errors.startDateTime ? 'border-red-400' : 'border-gray-300'}`}
                value={form.startDateTime}
                onChange={e => set('startDateTime', e.target.value)}
              />
              {errors.startDateTime && <p className="text-xs text-red-500 mt-1">{errors.startDateTime}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${errors.city ? 'border-red-400' : 'border-gray-300'}`}
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="e.g. Zurich"
              />
              {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
              <p className="text-xs text-gray-400 mt-1">Used as the default map location when adding quests.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max team size</label>
              <input
                type="number"
                min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                value={form.maxTeamSize}
                onChange={e => set('maxTeamSize', e.target.value)}
                placeholder="No limit"
              />
              <p className="text-xs text-gray-400 mt-1">Leave blank for no limit.</p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 px-6 py-4 flex items-center">
        {confirming ? (
          <>
            <button
              onClick={() => { setConfirming(false); setDeleteInput(''); }}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={onDelete}
              disabled={!deleteConfirmed}
              className="ml-auto px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Delete game
            </button>
          </>
        ) : (
          <>
            {game && (
              <button
                onClick={() => setConfirming(true)}
                className="text-sm text-red-400 hover:text-red-600 transition-colors"
              >
                Delete
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isBusy}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {isBusy ? 'Saving…' : 'Save Game'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
