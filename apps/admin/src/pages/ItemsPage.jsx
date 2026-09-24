import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { SHOP_ITEMS, shopConfig } from '@gcr26/shared';
import { db } from '../firebase';

function ItemCard({ item, config, onSave, saving }) {
  const [price, setPrice] = useState(String(config.price));
  const [minutes, setMinutes] = useState(String(config.durationMinutes));
  const [error, setError] = useState(null);

  const dirty =
    price !== String(config.price) || minutes !== String(config.durationMinutes);

  function save() {
    const parsedPrice = parseInt(price);
    const parsedMinutes = parseInt(minutes);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return setError('Price must be 0 or more.');
    if (item.hasDuration && (!Number.isFinite(parsedMinutes) || parsedMinutes <= 0)) {
      return setError('Duration must be at least 1 minute.');
    }
    setError(null);
    onSave({ price: parsedPrice, durationMinutes: item.hasDuration ? parsedMinutes : 0 });
  }

  return (
    <div className={`bg-white border rounded-lg p-5 ${config.enabled ? 'border-gray-200' : 'border-gray-100'}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none">{item.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h2 className={`text-sm font-semibold ${config.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
              {item.name}
            </h2>
            <button
              onClick={() => onSave({ enabled: !config.enabled })}
              className={`relative w-10 h-6 rounded-full transition-colors ml-auto ${config.enabled ? 'bg-gray-900' : 'bg-gray-200'}`}
              title={config.enabled ? 'On sale' : 'Hidden from teams'}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.enabled ? 'translate-x-4' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">{item.description}</p>

          {config.enabled && (
            <>
              <div className="flex items-end gap-3 mt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Price (coins)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                  />
                </div>
                {item.hasDuration && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Lasts (minutes)</label>
                    <input
                      type="number"
                      min="1"
                      className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      value={minutes}
                      onChange={e => setMinutes(e.target.value)}
                    />
                  </div>
                )}
                <button
                  onClick={save}
                  disabled={!dirty || saving}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
                </button>
              </div>
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ItemsPage() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    return onSnapshot(doc(db, 'games', gameId), snap => {
      setGame(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  }, [gameId]);

  const config = shopConfig(game);

  async function saveItem(type, patch) {
    setSaving(type);
    try {
      // Written as a nested field so other items are left alone
      await updateDoc(doc(db, 'games', gameId), {
        [`shop.${type}`]: { ...config[type], ...patch },
      });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Items</h1>
      <p className="text-sm text-gray-400 mb-6">
        What teams can buy with their coins. Switching an item off hides it from the shop.
      </p>

      <div className="space-y-3">
        {SHOP_ITEMS.map(item => (
          // Remounting when a stored value changes picks up another host's edit,
          // without an effect that would fight this host's typing
          <ItemCard
            key={`${item.type}:${config[item.type].price}:${config[item.type].durationMinutes}`}
            item={item}
            config={config[item.type]}
            saving={saving === item.type}
            onSave={patch => saveItem(item.type, patch)}
          />
        ))}
      </div>
    </div>
  );
}
