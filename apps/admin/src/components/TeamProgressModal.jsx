import { useState } from 'react';
import { gameEconomy, teamCoins } from '@gcr26/shared';

// Live fixes for a single team: a quest turns out to be unreachable, a phone dies,
// a team finishes off-app. Each action explains itself to that team on the board.
export default function TeamProgressModal({ team, game, quests, onApply, onClose }) {
  const [busy, setBusy] = useState(false);
  const questOrder = game?.questOrder ?? [];
  const currentQuestId = team.currentQuestId ?? questOrder[0] ?? null;
  const currentQuest = quests[currentQuestId];
  const completed = team.completedQuestIds ?? [];
  const economy = gameEconomy(game);

  async function run(action) {
    if (busy) return;
    setBusy(true);
    try {
      await onApply(action);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-full flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{team.name} · progress</h2>
          <p className="text-xs text-gray-400 mt-1">
            {completed.length} of {questOrder.length} quests · {teamCoins(team, economy)} coins
            {team.finishedAt && ' · finished'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {team.finishedAt ? (
            <div>
              <p className="text-sm text-gray-700 mb-2">This team is marked as finished.</p>
              <button
                onClick={() => run({ type: 'unfinish' })}
                disabled={busy}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Reopen their race
              </button>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Current quest</p>
                <p className="text-sm text-gray-900 mb-2">{currentQuest?.title ?? '—'}</p>
                <button
                  onClick={() => run({ type: 'solve', questId: currentQuestId, questTitle: currentQuest?.title })}
                  disabled={busy || !currentQuestId}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  Mark solved &amp; advance
                </button>
                <p className="text-xs text-gray-400 mt-1">
                  Pays the usual {economy.coinsPerQuest} coins, as if the team had answered.
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Jump to a quest</p>
                <div className="space-y-1">
                  {questOrder.map((id, i) => {
                    const quest = quests[id];
                    if (!quest) return null;
                    const isCurrent = id === currentQuestId;
                    return (
                      <div key={id} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                        <span className={`flex-1 text-sm truncate ${isCurrent ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                          {quest.title}
                          {completed.includes(id) && <span className="text-xs text-green-600 ml-2">solved</span>}
                        </span>
                        {isCurrent ? (
                          <span className="text-xs text-gray-400 shrink-0">current</span>
                        ) : (
                          <button
                            onClick={() => run({ type: 'move', questId: id, questTitle: quest.title })}
                            disabled={busy}
                            className="text-xs text-gray-400 hover:text-gray-900 shrink-0 transition-colors"
                          >
                            Move here
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <button
                  onClick={() => run({ type: 'finish' })}
                  disabled={busy}
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Mark team as finished
                </button>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
