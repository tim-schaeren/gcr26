// One palette for both apps, long enough that every team in a game can have a
// colour of its own — so it must not be shorter than MAX_TEAMS_PER_GAME.
export const TEAM_COLORS = [
  '#e11d48', // rose
  '#2563eb', // blue
  '#16a34a', // green
  '#d97706', // amber
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#be185d', // pink
  '#ea580c', // orange
  '#4d7c0f', // olive
  '#0f766e', // teal
  '#4f46e5', // indigo
  '#b91c1c', // red
  '#a16207', // bronze
  '#15803d', // forest
  '#7e22ce', // purple
  '#0369a1', // steel
  '#c2410c', // rust
  '#334155', // slate
  '#9d174d', // berry
  '#065f46', // pine
];

export const MAX_TEAMS_PER_GAME = 20;

// Colours already taken in a game are offered last, so a new team gets a
// distinct one without blocking a host who wants a repeat
export function availableTeamColors(takenColors: string[]): string[] {
  const taken = new Set(takenColors.filter(Boolean));
  return [
    ...TEAM_COLORS.filter(c => !taken.has(c)),
    ...TEAM_COLORS.filter(c => taken.has(c)),
  ];
}
