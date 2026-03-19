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
  gameId: string;
  memberIds: string[];
  score: number;
  currentQuestId: string | null;
  completedQuestIds: string[];
  finishedAt: number | null;
}

// ─── Quests ───────────────────────────────────────────────────────────────────

export interface Quest {
  id: string;
  title: string;
  description: string;
  navigationHint: string; // shown to players outside the fence to guide them to the location
  fenceRadius: number;    // meters; player must be within this radius to see the quest
  location: GeoPoint;
  answers: string[];      // trimmed; multiple valid answers allowed
  hints: string[];
  isActive: boolean;      // admin can hide without deleting
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

// ─── Games ────────────────────────────────────────────────────────────────────

export interface Game {
  id: string;
  name: string;
  startDateTime: number;    // Unix timestamp
  city: string;
  cityCoordinates: GeoPoint;
  questOrder: string[];     // ordered list of quest IDs (subcollection)
  maxTeamSize?: number;     // optional soft limit shown in admin UI
  maxTeamSpreadMeters: number | null; // null = unlimited; blocks answer submission if exceeded
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface GameSettings {
  signUpOpen: boolean;
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
