import type { Game, Team } from './types';

// Items a team can buy with coins. Hosts turn each one on or off per game and
// set its price, so one race can run without a shop while another leans on it.
export type ShopItemType = 'compass' | 'radar' | 'shield' | 'curse' | 'robbery' | 'donate';

export interface ShopItemConfig {
  enabled: boolean;
  price: number;
  durationMinutes: number; // how long it lasts, or for robbery the cooldown
  percent: number;         // robbery: share of the target's coins taken
  cap: number;             // robbery: most coins one robbery can take
}

// The settings a host sees for an item, beyond on/off and price
export type ShopItemSetting = 'durationMinutes' | 'percent' | 'cap';

export interface ShopItemDefinition {
  type: ShopItemType;
  name: string;
  icon: string;          // Material Design Icons name
  description: string;   // shown to hosts and players, so the wording can't drift
  // Aimed at another team. These are applied by the server, since a team's
  // app may only ever change its own team.
  targetsTeam: boolean;
  // An attack a Shield stops
  isAttack: boolean;
  settings: Partial<Record<ShopItemSetting, string>>; // setting -> label for hosts
  defaults: ShopItemConfig;
}

const NO_EXTRAS = { durationMinutes: 0, percent: 0, cap: 0 };

// Adding an item means adding an entry here and teaching the app what it does.
// New items start switched off, so games already set up don't change under
// their hosts.
export const SHOP_ITEMS: ShopItemDefinition[] = [
  {
    type: 'compass',
    name: 'Compass',
    icon: 'compass-outline',
    description:
      'Shows the direction to the next quest and how far away it is, for a while.',
    targetsTeam: false,
    isAttack: false,
    settings: { durationMinutes: 'Lasts (minutes)' },
    defaults: { ...NO_EXTRAS, enabled: true, price: 25, durationMinutes: 5 },
  },
  {
    type: 'radar',
    name: 'Radar',
    icon: 'radar',
    description:
      'Pings faster the closer you get to the next quest, and shows how far away it is, but not which way. For a while.',
    targetsTeam: false,
    isAttack: false,
    settings: { durationMinutes: 'Lasts (minutes)' },
    defaults: { ...NO_EXTRAS, enabled: false, price: 15, durationMinutes: 5 },
  },
  {
    type: 'shield',
    name: 'Shield',
    icon: 'shield-outline',
    description:
      'Blocks the next curse or robbery against your team, then it is used up. Other teams can’t see you have one.',
    targetsTeam: false,
    isAttack: false,
    settings: {},
    defaults: { ...NO_EXTRAS, enabled: false, price: 30 },
  },
  {
    type: 'curse',
    name: 'Curse',
    icon: 'skull-outline',
    description:
      'Freezes another team for a while: no answers, no navigation hint, no shopping, and walking doesn’t count.',
    targetsTeam: true,
    isAttack: true,
    settings: { durationMinutes: 'Lasts (minutes)' },
    defaults: { ...NO_EXTRAS, enabled: false, price: 40, durationMinutes: 2 },
  },
  {
    type: 'robbery',
    name: 'Robbery',
    icon: 'sack-percent',
    description:
      'Steals a share of another team’s coins. The price is gone even if they have nothing, or a shield. A team just robbed can’t be robbed again for a while.',
    targetsTeam: true,
    isAttack: true,
    settings: { percent: 'Share taken (%)', cap: 'At most (coins)', durationMinutes: 'Cooldown (minutes)' },
    defaults: { ...NO_EXTRAS, enabled: false, price: 30, percent: 25, cap: 30, durationMinutes: 15 },
  },
  {
    type: 'donate',
    name: 'Donate',
    icon: 'hand-coin-outline',
    description: 'Give some of your coins to another team. Alliances, deals, or a peace offering.',
    targetsTeam: true,
    isAttack: false,
    settings: {},
    defaults: { ...NO_EXTRAS, enabled: false, price: 0 },
  },
];

export const SHOP_ITEMS_BY_TYPE: Record<ShopItemType, ShopItemDefinition> = SHOP_ITEMS.reduce(
  (map, item) => ({ ...map, [item.type]: item }),
  {} as Record<ShopItemType, ShopItemDefinition>,
);

export type ShopConfig = Record<ShopItemType, ShopItemConfig>;

function positiveOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

// Games configured before an item existed fall back to its defaults
export function shopConfig(game: Partial<Game> | null | undefined): ShopConfig {
  const stored = (game?.shop ?? {}) as Record<string, Partial<ShopItemConfig> | undefined>;
  return SHOP_ITEMS.reduce((config, item) => {
    const saved = stored[item.type];
    config[item.type] = {
      enabled: typeof saved?.enabled === 'boolean' ? saved.enabled : item.defaults.enabled,
      price: positiveOr(saved?.price, item.defaults.price),
      durationMinutes: positiveOr(saved?.durationMinutes, item.defaults.durationMinutes),
      percent: Math.min(100, positiveOr(saved?.percent, item.defaults.percent)),
      cap: positiveOr(saved?.cap, item.defaults.cap),
    };
    return config;
  }, {} as ShopConfig);
}

function msLeft(until: unknown, now: number): number {
  return typeof until === 'number' && until > now ? until - now : 0;
}

// Timed items run for the whole team, not per device
export function compassMsLeft(team: Partial<Team> | null | undefined, now: number): number {
  return msLeft(team?.activeCompassUntil, now);
}

export function radarMsLeft(team: Partial<Team> | null | undefined, now: number): number {
  return msLeft(team?.activeRadarUntil, now);
}

export function curseMsLeft(team: Partial<Team> | null | undefined, now: number): number {
  return msLeft(team?.cursedUntil, now);
}

// What a robbery takes from a team with this many coins
export function robberyTake(targetCoins: number, config: ShopItemConfig): number {
  return Math.max(0, Math.min(config.cap, Math.floor((targetCoins * config.percent) / 100)));
}
