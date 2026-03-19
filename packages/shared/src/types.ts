// ─── Users ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;           // Firebase Auth UID
  name: string;
  email: string;
  isAdmin: boolean;
  teamId: string | null;
  pushToken: string | null;   // Expo push token for notifications
  createdAt: number;          // Unix timestamp
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  memberIds: string[];
  score: number;
  currentQuestId: string | null;
  completedQuestIds: string[];
  inventory: InventoryItem[];   // active items the team holds
  activeCurse: ActiveCurse | null;
  currency: number;
  finishedAt: number | null;    // timestamp when team completed all quests
}

// ─── Quests ───────────────────────────────────────────────────────────────────

export type QuestType = 'location' | 'riddle' | 'photo' | 'trivia';

export interface Hint {
  text: string;
  cost: number;   // currency cost to unlock
}

export interface Quest {
  id: string;
  order: number;          // determines the sequence teams race through
  type: QuestType;
  title: string;
  description: string;
  answer: string;         // normalised lowercase for comparison
  location: GeoPoint | null;    // for location-based quests
  radiusMeters: number | null;  // proximity check radius
  hints: Hint[];
  mediaUrl: string | null;      // image or video clue
  points: number;
  isActive: boolean;      // admin can toggle off without deleting
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

export type MessageChannel = 'global' | 'team';

export interface Message {
  id: string;
  channel: MessageChannel;
  teamId: string | null;    // null for global
  authorId: string;
  authorName: string;
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

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface GameSettings {
  signUpOpen: boolean;
  gameActive: boolean;
  hotlineNumber: string;
}

// ─── Event Registration ───────────────────────────────────────────────────────

export interface Registration {
  id: string;
  name: string;
  email: string;
  registeredAt: number;
  approved: boolean;
}
