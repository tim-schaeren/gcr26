// The bulletin board: a record of what happened during a game.
// Entries live in games/{gameId}/activity. Rules decide who may read each one:
// 'public' entries are visible to everyone in the game, 'team' entries only to
// that team (and admins), so a rival can't see what a team spends money on.

export type ActivityType =
  | 'quest_solved'
  | 'team_finished'
  | 'hint_revealed'
  | 'item_bought'
  | 'coins_adjusted'
  | 'game_started'
  | 'game_paused'
  | 'game_resumed'
  | 'game_ended'
  | 'admin_note'
  | 'admin_marked_solved'
  | 'admin_moved'
  | 'admin_finished'
  | 'admin_unfinished'
  // Written by the server when one team uses an item on another
  | 'team_cursed'
  | 'team_robbed'
  | 'coins_donated'
  | 'attack_blocked';

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
  itemName?: string;          // item_bought
  reason?: string;            // admin adjustment reason
  text?: string;              // admin note
  itemType?: string;          // item_bought, attack_blocked: which item
  targetTeamId?: string;      // the team an item was used on
  targetTeamName?: string;
  durationMinutes?: number;   // team_cursed
}

// Entries players write use deterministic ids, so two teammates acting at the
// same moment produce one entry rather than two.
export const questSolvedId = (teamId: string, questId: string) => `${teamId}_quest_solved_${questId}`;
export const teamFinishedId = (teamId: string) => `${teamId}_finished`;
export const hintRevealedId = (teamId: string, questId: string, index: number) =>
  `${teamId}_hint_${questId}_${index}`;

// Types a player's device is allowed to write (mirrored in firestore.rules)
export const PLAYER_WRITABLE_TYPES: ActivityType[] = [
  'quest_solved',
  'team_finished',
  'hint_revealed',
  'item_bought',
];

// Entries a host caused. They are tagged with the team they concern, but the team
// didn't do them — so they still count as news for that team.
const HOST_INITIATED_TYPES: ActivityType[] = [
  'coins_adjusted',
  'admin_marked_solved',
  'admin_moved',
  'admin_finished',
  'admin_unfinished',
  'admin_note',
];

// Is this entry news to the given team? Their own actions are not; everything
// else is, including game-wide events and anything a host did to them.
export function isNewsFor(entry: ActivityEntry, teamId: string | null | undefined): boolean {
  return entry.teamId !== teamId || HOST_INITIATED_TYPES.includes(entry.type);
}

// Material Design Icons names. The app renders them with @expo/vector-icons
// and the console with @mdi/js — the same set, so both sides match.
export type IconName = string;

const ICONS: Record<ActivityType, IconName> = {
  quest_solved: 'check-circle-outline',
  team_finished: 'trophy-outline',
  hint_revealed: 'lightbulb-outline',
  item_bought: 'compass-outline',
  coins_adjusted: 'circle-multiple-outline',
  game_started: 'flag-outline',
  game_paused: 'pause-circle-outline',
  game_resumed: 'play-circle-outline',
  game_ended: 'flag-checkered',
  admin_note: 'bullhorn-outline',
  admin_marked_solved: 'wrench-outline',
  admin_moved: 'wrench-outline',
  admin_finished: 'wrench-outline',
  admin_unfinished: 'wrench-outline',
  team_cursed: 'skull-outline',
  team_robbed: 'sack-percent',
  coins_donated: 'hand-coin-outline',
  attack_blocked: 'shield-check-outline',
};

const ITEM_ICONS: Record<string, IconName> = {
  compass: 'compass-outline',
  radar: 'radar',
  shield: 'shield-outline',
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
  const icon =
    (entry.type === 'item_bought' && entry.itemType && ITEM_ICONS[entry.itemType]) ||
    ICONS[entry.type] ||
    'circle-small';
  // Items one team uses on another name both: "You", "you" or the team's name
  const targetMine = !!viewerTeamId && entry.targetTeamId === viewerTeamId;
  const target = targetMine ? 'you' : entry.targetTeamName ?? 'a team';
  const coins = (n: number | undefined) => `${n ?? 0} coin${n === 1 ? '' : 's'}`;

  switch (entry.type) {
    case 'quest_solved': {
      // Solves are public, so they name the quest by number: a title like
      // "The Oldest Tree" would hand every other team their next hint
      if (entry.questTitle) {
        const number = entry.questNumber ? ` (quest ${entry.questNumber})` : '';
        return { icon, text: `${team} solved “${entry.questTitle}”${number}` };
      }
      return {
        icon,
        text: entry.questNumber ? `${team} solved quest ${entry.questNumber}` : `${team} solved a quest`,
      };
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
    case 'item_bought':
      return { icon, text: `${team} bought ${entry.itemName ?? 'an item'} for ${entry.amount ?? 0} coins` };
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
    case 'team_cursed': {
      const time = entry.durationMinutes ? ` for ${entry.durationMinutes} min` : '';
      return { icon, text: `${team} cursed ${target}${time}` };
    }
    case 'team_robbed':
      return { icon, text: `${team} robbed ${target} of ${coins(entry.amount)}` };
    case 'coins_donated':
      return { icon, text: `${team} gave ${target} ${coins(entry.amount)}` };
    case 'attack_blocked': {
      const owner = targetMine ? 'Your' : `${entry.targetTeamName ?? 'A team'}’s`;
      const attacker = mine ? 'your' : `${entry.teamName ?? 'a team'}’s`;
      const what = entry.itemType === 'robbery' ? 'robbery' : 'curse';
      return { icon, text: `${owner} shield blocked ${attacker} ${what}` };
    }
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
