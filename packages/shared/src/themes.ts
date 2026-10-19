import { copy } from './copy';

// Visual themes a host picks per game. Each is designed as a whole, which is
// why hosts choose a preset rather than free colours: every role below was
// chosen to stay legible against that theme's own background.

export type ThemeId = 'basic' | 'retro';

export interface ThemeColors {
  background: string;   // the screen
  heading: string;      // large display text
  text: string;         // body text on the background
  muted: string;        // secondary text on the background
  border: string;       // hairlines and outlines on the background
  surface: string;      // cards, inputs, sheets, panels
  onSurface: string;    // text on a surface
  mutedOnSurface: string;
  accent: string;       // buttons and strong marks
  onAccent: string;     // text on accent
  danger: string;       // errors — always shown on a surface, where it passes contrast
  success: string;
  highlight: string;    // "new" rows and hint cards
  onHighlight: string;
  shadow: string;       // hard drop shadow, when the theme uses one
}

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  colors: ThemeColors;
  fonts: {
    display: string | undefined; // undefined = the platform's system font
  };
  shape: {
    radius: number;
    borderWidth: number;
    shadowOffset: number;        // 0 = no hard shadow
  };
  uppercaseHeadings: boolean;
  // Display text that fails contrast on its own gets a hard shadow behind each
  // letter, which outlines it — the printed-poster look, and legibility with it
  headingShadow: boolean;
}

const BASIC: Theme = {
  id: 'basic',
  name: copy.themes.basic.name,
  description: copy.themes.basic.description,
  colors: {
    background: '#ffffff',
    heading: '#111111',
    text: '#111111',
    muted: '#767676',
    border: '#e5e7eb',
    surface: '#f5f5f5',
    onSurface: '#111111',
    mutedOnSurface: '#666666',
    accent: '#111111',
    onAccent: '#ffffff',
    danger: '#b91c1c',
    success: '#15803d',
    highlight: '#fffbeb',
    onHighlight: '#92400e',
    shadow: 'transparent',
  },
  fonts: { display: undefined },
  shape: { radius: 12, borderWidth: 1.5, shadowOffset: 0 },
  uppercaseHeadings: false,
  headingShadow: false,
};

// Mid-century comic billboard: flat Tangerine, Cool Blue lettering outlined in
// Black Cherry, thick outlines and hard offset shadows. Cool Blue on Tangerine
// is only 2.6:1, so it is reserved for display type with its shadow; body text
// is Black Cherry (5.0:1), and panels flip to Cool Blue with Black Cherry
// text (12.9:1).
const RETRO: Theme = {
  id: 'retro',
  name: copy.themes.retro.name,
  description: copy.themes.retro.description,
  colors: {
    background: '#FF5C34',
    heading: '#D7EFFF',
    text: '#351E28',
    muted: '#4A1E2A',
    border: '#351E28',
    surface: '#D7EFFF',
    onSurface: '#351E28',
    mutedOnSurface: '#5E4A52',
    accent: '#351E28',
    onAccent: '#D7EFFF',
    danger: '#6B0F24',
    success: '#1E4D2B',
    highlight: '#D7EFFF',
    onHighlight: '#351E28',
    shadow: '#351E28',
  },
  fonts: { display: 'Righteous' },
  shape: { radius: 6, borderWidth: 3, shadowOffset: 4 },
  uppercaseHeadings: true,
  headingShadow: true,
};

export const THEMES: Record<ThemeId, Theme> = { basic: BASIC, retro: RETRO };
export const THEME_LIST: Theme[] = [BASIC, RETRO];
export const DEFAULT_THEME_ID: ThemeId = 'basic';

export function themeFor(themeId: string | null | undefined): Theme {
  return THEMES[themeId as ThemeId] ?? THEMES[DEFAULT_THEME_ID];
}
