// ─── Users ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;           // Firebase Auth UID
  name: string;
  email: string;
  isAdmin: boolean;
  teamId: string | null;
  pushToken: string | null;   // Expo push token for notifications
  createdAt: number;          // Unix timestamp
  lastLocation: { lat: number; lng: number; updatedAt: number } | null;
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  color: string;             // hex color chosen by admin, used on map
  gameId: string;
  memberIds: string[];
  score: number;
  currentQuestId: string | null;
  completedQuestIds: string[];
  finishedAt: number | null;
  questProgress: QuestProgress | null;
  coins?: number;                            // team purse; absent means the game's startingCoins
  hintsRevealed?: Record<string, number>;    // questId -> how many hints the team has paid for
}

// Admin adjustments to a balance, stored under teams/{teamId}/coinLedger
export interface CoinLedgerEntry {
  id: string;
  delta: number;
  reason: string;
  balanceAfter: number;
  byName: string;
  at: number;
}

// Shared progress on the current quest, so every team member sees the same state
export interface QuestProgress {
  questId: string;              // progress is ignored if this doesn't match the current quest
  unlockedAt: number | null;    // when the trigger was first satisfied
  pausedMsAtUnlock: number;     // game.totalPausedMs at unlock; later pauses don't count toward timers
  distanceMeters: number;       // distance trigger: furthest distance reported by any member
}

// ─── Quests ───────────────────────────────────────────────────────────────────

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; url: string; caption?: string }
  | { type: 'youtube'; videoId: string };

export type QuestTrigger =
  | 'location'  // unlocks inside the geofence
  | 'distance'  // unlocks after the team has moved a set distance
  | 'none';     // unlocked immediately

export type QuestTask =
  | 'answer'    // type a valid answer
  | 'timer'     // wait for a countdown (e.g. mandatory break)
  | 'continue'; // read and tap continue (info)

// Fields not relevant to the chosen trigger/task are omitted from the document.
// Legacy quests have no trigger/task and plain-string content — see normalizeQuest().
export interface Quest {
  id: string;
  title: string;
  trigger: QuestTrigger;
  task: QuestTask;
  description: ContentBlock[];
  navigationHint: ContentBlock[]; // location/distance: shown before the quest unlocks
  fenceRadius?: number;           // location: meters; player must be within this radius
  location?: GeoPoint;            // location
  distanceMeters?: number;        // distance: meters to travel after the quest starts
  answers?: string[];             // answer: trimmed; multiple valid answers allowed
  hints?: string[];               // answer
  durationSeconds?: number;       // timer
  isActive: boolean;              // admin can hide without deleting
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

// ─── Items / Shop ─────────────────────────────────────────────────────────────

export type ItemType = 'compass' | 'curse' | 'immunity' | 'robbery';

export interface ShopItem {
  id: string;
  type: ItemType;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;   // admin can toggle
}

export interface InventoryItem {
  type: ItemType;
  acquiredAt: number;
}

export interface ActiveCurse {
  fromTeamId: string;
  appliedAt: number;
  durationSeconds: number;
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

// Lives in games/{gameId}/messages. One thread per team: that team and the
// game's hosts. Teams never see each other's threads.
export interface ChatMessage {
  id: string;
  teamId: string;
  authorId: string;
  authorName: string;
  fromHost: boolean;
  text: string;
  sentAt: number;
}

// ─── Broadcast Notifications (admin → all teams) ──────────────────────────────

export interface Broadcast {
  id: string;
  title: string;
  body: string;
  sentAt: number;
}

// ─── Games ────────────────────────────────────────────────────────────────────

export interface Game {
  id: string;
  name: string;
  startDateTime: number;    // Unix timestamp
  city: string;
  cityCoordinates: GeoPoint;
  questOrder: string[];     // ordered list of quest IDs (subcollection)
  hostIds?: string[];       // users who may run this game; platform admins can run every game
  hotlineNumber?: string;   // phone number teams can call when something goes wrong
  maxTeamSize?: number;     // optional soft limit shown in admin UI
  maxTeamSpreadMeters: number | null; // null = unlimited; blocks answer submission if exceeded
  startingCoins?: number;   // coins each team begins with (default 0)
  coinsPerQuest?: number;   // coins paid for each solved quest (default 10)
  hintCost?: number;        // flat price of revealing one hint (default 10)
  pausedAt: number | null;  // timestamp when game was paused; null = not paused
  totalPausedMs: number;    // accumulated pause duration in ms (updated on resume)
  endedAt: number | null;   // timestamp when admin ended the game; null = not ended
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface GameSettings {
  signUpOpen: boolean;
}

// ─── Event Registration ───────────────────────────────────────────────────────

export interface Registration {
  id: string;
  name: string;
  email: string;
  registeredAt: number;
  approved: boolean;
}
