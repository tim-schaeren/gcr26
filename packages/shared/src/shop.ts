import type { Game, Team } from './types';

// Items a team can buy with coins. Hosts turn each one on or off per game and
// set its price, so one race can run without a shop while another leans on it.
export type ShopItemType = 'compass';

export interface ShopItemConfig {
  enabled: boolean;
  price: number;
  durationMinutes: number;
}

export interface ShopItemDefinition {
  type: ShopItemType;
  name: string;
  icon: string;
  description: string;   // shown to hosts and players, so the wording can't drift
  hasDuration: boolean;
  defaults: ShopItemConfig;
}

// Adding an item later means adding an entry here and teaching the app what it does
export const SHOP_ITEMS: ShopItemDefinition[] = [
  {
    type: 'compass',
    name: 'Compass',
    icon: '🧭',
    description:
      'Shows the direction to the next quest and how far away it is, for a while.',
    hasDuration: true,
    defaults: { enabled: true, price: 25, durationMinutes: 5 },
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
    };
    return config;
  }, {} as ShopConfig);
}

// The compass runs for the whole team, not per device
export function compassMsLeft(team: Partial<Team> | null | undefined, now: number): number {
  const until = team?.activeCompassUntil;
  return typeof until === 'number' && until > now ? until - now : 0;
}
