// The bulletin board: a record of what happened during a game.
// Entries live in games/{gameId}/activity. Rules decide who may read each one:
// 'public' entries are visible to everyone in the game, 'team' entries only to
// that team (and admins), so a rival can't see what a team spends money on.

export type ActivityType =
  | 'quest_solved'
  | 'team_finished'
  | 'hint_revealed'
  | 'coins_adjusted'
  | 'game_started'
  | 'game_paused'
  | 'game_resumed'
  | 'game_ended'
  | 'admin_note'
  | 'admin_marked_solved'
  | 'admin_moved'
  | 'admin_finished'
  | 'admin_unfinished';

export type ActivityVisibility = 'public' | 'team';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  at: number;
  visibility: ActivityVisibility;
  teamId: string | null;      // null for game-wide events
  teamName: string | null;    // denormalized so the feed renders without extra reads
  questTitle?: string;
  questNumber?: number;
  placement?: number;         // team_finished
  amount?: number;            // coins spent or granted (negative = deducted)
  reason?: string;            // admin adjustment reason
  text?: string;              // admin note
}

// Entries players write use deterministic ids, so two teammates acting at the
// same moment produce one entry rather than two.
export const questSolvedId = (teamId: string, questId: string) => `${teamId}_quest_solved_${questId}`;
export const teamFinishedId = (teamId: string) => `${teamId}_finished`;
export const hintRevealedId = (teamId: string, questId: string, index: number) =>
  `${teamId}_hint_${questId}_${index}`;

// Types a player's device is allowed to write (mirrored in firestore.rules)
export const PLAYER_WRITABLE_TYPES: ActivityType[] = ['quest_solved', 'team_finished', 'hint_revealed'];

const ICONS: Record<ActivityType, string> = {
  quest_solved: '✅',
  team_finished: '🏆',
  hint_revealed: '💡',
  coins_adjusted: '🪙',
  game_started: '🚩',
  game_paused: '⏸️',
  game_resumed: '▶️',
  game_ended: '🏁',
  admin_note: '📣',
  admin_marked_solved: '🛠️',
  admin_moved: '🛠️',
  admin_finished: '🛠️',
  admin_unfinished: '🛠️',
};

function ordinal(n: number): string {
  if (n >= 11 && n <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

// One place for the wording, so the admin console and the app never disagree.
// Pass the reader's team id to address them directly: a team reads "You revealed
// a hint", while admins and rival teams read "Team Blue revealed a hint".
export function formatActivity(entry: ActivityEntry, viewerTeamId?: string | null): { icon: string; text: string } {
  const mine = !!viewerTeamId && entry.teamId === viewerTeamId;
  const team = mine ? 'You' : entry.teamName ?? 'A team';
  const quest = entry.questTitle ? `“${entry.questTitle}”` : 'a quest';
  const icon = ICONS[entry.type] ?? '•';

  switch (entry.type) {
    case 'quest_solved': {
      const number = entry.questNumber ? ` (quest ${entry.questNumber})` : '';
      return { icon, text: `${team} solved ${quest}${number}` };
    }
    case 'team_finished':
      return {
        icon,
        text: entry.placement
          ? `${team} finished in ${ordinal(entry.placement)} place`
          : `${team} finished the race`,
      };
    case 'hint_revealed':
      return { icon, text: `${team} revealed a hint on ${quest} for ${entry.amount ?? 0} coins` };
    case 'coins_adjusted': {
      const amount = entry.amount ?? 0;
      const who = mine ? 'you' : team;
      const action = amount >= 0 ? `gave ${who} ${amount} coins` : `took ${Math.abs(amount)} coins from ${who}`;
      return { icon, text: `Admins ${action}${entry.reason ? ` — ${entry.reason}` : ''}` };
    }
    case 'game_started':
      return { icon, text: 'The game started' };
    case 'game_paused':
      return { icon, text: 'The game was paused' };
    case 'game_resumed':
      return { icon, text: 'The game resumed' };
    case 'game_ended':
      return { icon, text: 'The admins ended the game' };
    case 'admin_note':
      return { icon, text: entry.text ?? '' };
    case 'admin_marked_solved':
      return { icon, text: `Admins marked ${quest} solved for ${mine ? 'you' : team}` };
    case 'admin_moved':
      return { icon, text: `Admins moved ${mine ? 'you' : team} to ${quest}` };
    case 'admin_finished':
      return { icon, text: `Admins marked ${mine ? 'your race' : `${team}'s race`} as finished` };
    case 'admin_unfinished':
      return { icon, text: `Admins reopened ${mine ? 'your race' : `${team}'s race`}` };
    default:
      return { icon, text: '' };
  }
}

// "14:32" style clock for feed rows
export function formatActivityTime(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
