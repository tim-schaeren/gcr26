import { useState, useEffect } from 'react';
import LocationPicker from './LocationPicker';

const EMPTY = {
  title: '',
  description: '',
  navigationHint: '',
  fenceRadius: '50',
  location: { lat: '', lng: '' },
  answers: [''],
  hints: [''],
  isActive: true,
};

function toFormState(quest) {
  if (!quest) return EMPTY;
  return {
    title: quest.title,
    description: quest.description,
    navigationHint: quest.navigationHint ?? '',
    fenceRadius: String(quest.fenceRadius ?? 50),
    location: { lat: String(quest.location?.lat ?? ''), lng: String(quest.location?.lng ?? '') },
    answers: quest.answers?.length ? quest.answers : [''],
    hints: quest.hints?.length ? quest.hints : [''],
    isActive: quest.isActive,
  };
}

export default function QuestForm({ quest, existingTitles, cityCoordinates, onSave, onCancel, onDelete, onDirtyChange, saving }) {
  const [form, setForm] = useState(() => toFormState(quest));
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  useEffect(() => {
    setForm(toFormState(quest));
    setErrors({});
    setConfirming(false);
    setDeleteInput('');
  }, [quest?.id]);

  useEffect(() => {
    const original = JSON.stringify(toFormState(quest));
    const current = JSON.stringify(form);
    onDirtyChange?.(original !== current);
  }, [form]);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function setArrayItem(field, index, value) {
    setForm(f => {
      const arr = [...f[field]];
      arr[index] = value;
      return { ...f, [field]: arr };
    });
  }

  function addArrayItem(field) {
    setForm(f => ({ ...f, [field]: [...f[field], ''] }));
  }

  function removeArrayItem(field, index) {
    setForm(f => ({ ...f, [field]: f[field].filter((_, i) => i !== index) }));
  }

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required.';
    else if (existingTitles?.includes(form.title.trim()) && form.title.trim() !== quest?.title) {
      e.title = 'A quest with this title already exists.';
    }
    if (!form.description.trim()) e.description = 'Description is required.';
    if (!form.navigationHint.trim()) e.navigationHint = 'Navigation hint is required.';
    const radius = parseFloat(form.fenceRadius);
    if (isNaN(radius) || radius <= 0) e.fenceRadius = 'Fence radius must be a positive number.';
    const lat = parseFloat(form.location.lat);
    const lng = parseFloat(form.location.lng);
    if (isNaN(lat) || isNaN(lng) || !form.location.lat || !form.location.lng) {
      e.location = 'A valid location is required.';
    }
    const answers = form.answers.map(a => a.trim()).filter(Boolean);
    if (answers.length === 0) e.answers = 'At least one answer is required.';
    const hints = form.hints.map(h => h.trim()).filter(Boolean);
    if (hints.length === 0) e.hints = 'At least one hint is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const answers = form.answers.map(a => a.trim()).filter(Boolean);
    const hints = form.hints.map(h => h.trim()).filter(Boolean);
    onSave({
      title: form.title.trim(),
      description: form.description.trim(),
      navigationHint: form.navigationHint.trim(),
      fenceRadius: parseFloat(form.fenceRadius),
      location: { lat: parseFloat(form.location.lat), lng: parseFloat(form.location.lng) },
      answers,
      hints,
      isActive: form.isActive,
    });
  }

  const deleteConfirmed = deleteInput === quest?.title;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">
          {quest ? 'Edit Quest' : 'New Quest'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 px-6 py-5">
        {confirming ? (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">Delete this quest?</p>
              <p className="text-sm text-red-600">
                This will permanently delete <span className="font-medium">{quest.title}</span>. This cannot be undone.
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Type <span className="font-semibold">{quest.title}</span> to confirm:
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder={quest.title}
                autoFocus
              />
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${errors.title ? 'border-red-400' : 'border-gray-300'}`}
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Quest title"
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none ${errors.description ? 'border-red-400' : 'border-gray-300'}`}
                rows={4}
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="What must players do to complete this quest?"
              />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Navigation Hint</label>
              <textarea
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none ${errors.navigationHint ? 'border-red-400' : 'border-gray-300'}`}
                rows={2}
                value={form.navigationHint}
                onChange={e => set('navigationHint', e.target.value)}
                placeholder="How do players find this quest? (e.g. 'Find the oldest tree in the city')"
              />
              {errors.navigationHint && <p className="text-xs text-red-500 mt-1">{errors.navigationHint}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fence Radius (meters)</label>
              <input
                type="number"
                min="1"
                className={`w-32 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${errors.fenceRadius ? 'border-red-400' : 'border-gray-300'}`}
                value={form.fenceRadius}
                onChange={e => set('fenceRadius', e.target.value)}
                placeholder="50"
              />
              {errors.fenceRadius && <p className="text-xs text-red-500 mt-1">{errors.fenceRadius}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <LocationPicker
                value={form.location}
                onChange={loc => set('location', loc)}
                defaultCenter={cityCoordinates}
                fenceRadius={parseFloat(form.fenceRadius) || 0}
              />
              {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid Answers</label>
              <div className="space-y-2">
                {form.answers.map((answer, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${errors.answers ? 'border-red-400' : 'border-gray-300'}`}
                      value={answer}
                      onChange={e => setArrayItem('answers', i, e.target.value)}
                      placeholder={`Answer ${i + 1}`}
                    />
                    {form.answers.length > 1 && (
                      <button onClick={() => removeArrayItem('answers', i)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {errors.answers && <p className="text-xs text-red-500">{errors.answers}</p>}
                <button onClick={() => addArrayItem('answers')} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                  + Add answer
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hints</label>
              <div className="space-y-2">
                {form.hints.map((hint, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${errors.hints ? 'border-red-400' : 'border-gray-300'}`}
                      value={hint}
                      onChange={e => setArrayItem('hints', i, e.target.value)}
                      placeholder={`Hint ${i + 1}`}
                    />
                    {form.hints.length > 1 && (
                      <button onClick={() => removeArrayItem('hints', i)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {errors.hints && <p className="text-xs text-red-500">{errors.hints}</p>}
                <button onClick={() => addArrayItem('hints')} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                  + Add hint
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => set('isActive', !form.isActive)}
                className={`relative w-10 h-6 rounded-full transition-colors ${form.isActive ? 'bg-gray-900' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-4' : ''}`} />
              </button>
              <span className="text-sm text-gray-700">Active</span>
            </div>
          </>
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
              Delete quest
            </button>
          </>
        ) : (
          <>
            {quest && (
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
                disabled={saving}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save Quest'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
