import { useState, useEffect } from 'react';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, writeBatch, arrayUnion, arrayRemove, query, where,
} from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from '@dnd-kit/core';
import { db } from '../firebase';

function DraggableMemberRow({ user, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: user.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between py-0.5 ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        <button
          {...attributes}
          {...listeners}
          style={{ touchAction: 'none' }}
          className="text-gray-200 hover:text-gray-400 cursor-grab active:cursor-grabbing text-xs select-none"
        >
          ⠿
        </button>
        <span className="text-sm text-gray-700">{user.name}</span>
      </div>
      <button
        onClick={onRemove}
        className="text-xs text-gray-300 hover:text-red-500 transition-colors ml-2"
      >
        ✕
      </button>
    </div>
  );
}

function DraggablePlayerChip({ user }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: user.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, touchAction: 'none' }}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg cursor-grab active:cursor-grabbing select-none transition-opacity ${isDragging ? 'opacity-40' : 'hover:border-gray-400'}`}
    >
      <span className="text-gray-300 text-xs">⠿</span>
      <span className="text-sm text-gray-700">{user.name}</span>
    </div>
  );
}

function DroppableTeamCard({ team, members, maxTeamSize, onRemove, onEdit }) {
  const isFull = maxTeamSize && members.length >= maxTeamSize;
  const { setNodeRef, isOver } = useDroppable({ id: team.id, disabled: !!isFull });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg p-4 border-2 transition-colors ${
        isOver && !isFull ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{team.name}</span>
          {maxTeamSize && (
            <span className={`text-xs font-medium ${isFull ? 'text-red-400' : 'text-gray-400'}`}>
              {members.length}/{maxTeamSize}
            </span>
          )}
        </div>
        <button
          onClick={() => onEdit(team)}
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
        >
          Edit
        </button>
      </div>

      <div className="space-y-1 min-h-[2rem]">
        {members.length === 0 && !isOver && (
          <p className="text-sm text-gray-300 italic">Drop players here</p>
        )}
        {members.map(user => (
          <DraggableMemberRow
            key={user.id}
            user={user}
            onRemove={() => onRemove(user, team)}
          />
        ))}
      </div>

      {isFull && <p className="text-xs text-red-400 mt-2">Team is full</p>}
    </div>
  );
}

function TeamForm({ team, onSave, onCancel, onDelete, saving }) {
  const [name, setName] = useState(team?.name ?? '');
  const [confirming, setConfirming] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const deleteConfirmed = deleteInput === team?.name;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">{team ? 'Edit Team' : 'New Team'}</h2>
      </div>

      <div className="flex-1 px-6 py-5">
        {confirming ? (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">Delete this team?</p>
              <p className="text-sm text-red-600">All members will be unassigned. This cannot be undone.</p>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Type <span className="font-semibold">{team.name}</span> to confirm:
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder={team.name}
                autoFocus
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Team Alpha"
              autoFocus
            />
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
              className="ml-auto px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Delete team
            </button>
          </>
        ) : (
          <>
            {team && (
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
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => onSave({ name: name.trim() })}
                disabled={!name.trim() || saving}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Team'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    })
  );

  useEffect(() => {
    return onSnapshot(doc(db, 'games', gameId), snap => {
      if (snap.exists()) setGame({ id: snap.id, ...snap.data() });
    });
  }, [gameId]);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'teams'), where('gameId', '==', gameId)),
      snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [gameId]);

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const userMap = Object.fromEntries(users.map(u => [u.id, u]));
  const teamIds = new Set(teams.map(t => t.id));
  const unassigned = users.filter(u => !u.isAdmin && (!u.teamId || !teamIds.has(u.teamId)));
  const activeUser = activeId ? userMap[activeId] : null;

  function handleDragStart({ active }) {
    setActiveId(active.id);
  }

  function handleDragEnd({ active, over }) {
    setActiveId(null);
    if (!over) return;

    const user = userMap[active.id];
    const targetTeam = teams.find(t => t.id === over.id);
    if (!user || !targetTeam) return;

    const sourceTeam = user.teamId && teamIds.has(user.teamId)
      ? teams.find(t => t.id === user.teamId)
      : null;

    if (sourceTeam?.id === targetTeam.id) return;

    // Optimistic update: reflect the move immediately so there's no snap-back
    // while we wait for the Firestore round-trip.
    setUsers(prev => prev.map(u =>
      u.id === user.id ? { ...u, teamId: targetTeam.id } : u
    ));
    setTeams(prev => prev.map(t => {
      if (t.id === targetTeam.id) {
        return { ...t, memberIds: [...new Set([...(t.memberIds ?? []), user.id])] };
      }
      if (sourceTeam && t.id === sourceTeam.id) {
        return { ...t, memberIds: (t.memberIds ?? []).filter(id => id !== user.id) };
      }
      return t;
    }));

    const batch = writeBatch(db);
    batch.update(doc(db, 'users', user.id), { teamId: targetTeam.id });
    batch.update(doc(db, 'teams', targetTeam.id), { memberIds: arrayUnion(user.id) });
    if (sourceTeam) {
      batch.update(doc(db, 'teams', sourceTeam.id), { memberIds: arrayRemove(user.id) });
    }
    batch.commit();
  }

  async function handleRemove(user, team) {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', user.id), { teamId: null });
    batch.update(doc(db, 'teams', team.id), { memberIds: arrayRemove(user.id) });
    await batch.commit();
  }

  async function handleSaveTeam(data) {
    setSaving(true);
    try {
      if (selected === 'new') {
        await addDoc(collection(db, 'teams'), {
          ...data,
          gameId,
          memberIds: [],
          score: 0,
          currentQuestId: null,
          completedQuestIds: [],
          finishedAt: null,
        });
      } else {
        await updateDoc(doc(db, 'teams', selected.id), data);
      }
      setSelected(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTeam() {
    if (!selected || selected === 'new') return;
    const batch = writeBatch(db);
    for (const uid of selected.memberIds ?? []) {
      batch.update(doc(db, 'users', uid), { teamId: null });
    }
    batch.delete(doc(db, 'teams', selected.id));
    await batch.commit();
    setSelected(null);
  }

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          <button
            onClick={() => setSelected('new')}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            + New Team
          </button>
        </div>

        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {teams.length === 0 && unassigned.length === 0 ? (
            <p className="text-gray-400">No teams yet. Create the first one.</p>
          ) : (
            <div className="space-y-8">
              {teams.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map(team => {
                    const members = (team.memberIds ?? []).map(id => userMap[id]).filter(Boolean);
                    return (
                      <DroppableTeamCard
                        key={team.id}
                        team={team}
                        members={members}
                        maxTeamSize={game?.maxTeamSize}
                        onRemove={handleRemove}
                        onEdit={setSelected}
                      />
                    );
                  })}
                </div>
              )}

              {unassigned.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-gray-500 mb-3">
                    Unassigned Players
                    {teams.length > 0 && (
                      <span className="ml-1 font-normal text-gray-400">— drag into a team</span>
                    )}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {unassigned.map(user => (
                      <DraggablePlayerChip key={user.id} user={user} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DragOverlay>
            {activeUser && (
              <div className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-gray-900 rounded-lg shadow-lg text-sm font-medium text-gray-900 cursor-grabbing">
                <span className="text-gray-400 text-xs">⠿</span>
                {activeUser.name}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {selected && (
        <div className="fixed inset-0 z-20 bg-white flex flex-col md:relative md:inset-auto md:z-auto md:w-96 md:border-l md:border-gray-200 md:-mr-8 md:-my-8 md:shadow-sm">
          <TeamForm
            team={selected === 'new' ? null : selected}
            onSave={handleSaveTeam}
            onCancel={() => setSelected(null)}
            onDelete={handleDeleteTeam}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
}
