import type { Game, Team } from './types';

export const DEFAULT_ECONOMY = {
  startingCoins: 0,
  coinsPerQuest: 10,
  hintCost: 10,
};

export type Economy = typeof DEFAULT_ECONOMY;

function positiveOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

// Games created before the economy existed fall back to the defaults
export function gameEconomy(game: Partial<Game> | null | undefined): Economy {
  return {
    startingCoins: positiveOr(game?.startingCoins, DEFAULT_ECONOMY.startingCoins),
    coinsPerQuest: positiveOr(game?.coinsPerQuest, DEFAULT_ECONOMY.coinsPerQuest),
    hintCost: positiveOr(game?.hintCost, DEFAULT_ECONOMY.hintCost),
  };
}

// A team with no coins field yet is treated as holding the game's starting balance
export function teamCoins(team: Partial<Team> | null | undefined, economy: Economy): number {
  return typeof team?.coins === 'number' && Number.isFinite(team.coins) ? team.coins : economy.startingCoins;
}

export function hintsRevealedFor(team: Partial<Team> | null | undefined, questId: string): number {
  const count = team?.hintsRevealed?.[questId];
  return typeof count === 'number' && count > 0 ? count : 0;
}
