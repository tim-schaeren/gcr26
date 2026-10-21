import { copy } from './copy';

// Visual themes a host picks per game. Each is designed as a whole, which is
// why hosts choose a preset rather than free colours: every role below was
// chosen to stay legible against that theme's own background.

export type ThemeId = 'basic' | 'retro' | 'night' | 'arcade' | 'bern';

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
  onDanger: string;     // text on a danger-coloured button
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
    // Headings are sized for an average face; a very wide one (a pixel font)
    // or a condensed one is scaled to take up about the same room
    scale: number;
  };
  // Dark themes need the status bar's clock and icons drawn light
  dark: boolean;
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
    onDanger: '#ffffff',
    success: '#15803d',
    highlight: '#fffbeb',
    onHighlight: '#92400e',
    shadow: 'transparent',
  },
  fonts: { display: undefined, scale: 1 },
  dark: false,
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
    onDanger: '#ffffff',
    success: '#1E4D2B',
    highlight: '#D7EFFF',
    onHighlight: '#351E28',
    shadow: '#351E28',
  },
  fonts: { display: 'Righteous', scale: 1 },
  dark: false,
  shape: { radius: 6, borderWidth: 3, shadowOffset: 4 },
  uppercaseHeadings: true,
  headingShadow: true,
};

// For races after dark: deep navy, easy on eyes adjusted to the night, with
// taxi-yellow headings and buttons. Every pair is 6.7:1 or better.
const NIGHT: Theme = {
  id: 'night',
  name: copy.themes.night.name,
  description: copy.themes.night.description,
  colors: {
    background: '#10142B',
    heading: '#FFD23F',
    text: '#EDEFF7',
    muted: '#A3ABCB',
    border: '#2E3768',
    surface: '#1C2245',
    onSurface: '#EDEFF7',
    mutedOnSurface: '#A3ABCB',
    accent: '#FFD23F',
    onAccent: '#10142B',
    danger: '#FF8A80',
    onDanger: '#10142B',
    success: '#7BE495',
    highlight: '#2A3266',
    onHighlight: '#FFD23F',
    shadow: 'transparent',
  },
  // Bebas Neue is condensed, so its headings run a little larger
  fonts: { display: 'BebasNeue', scale: 1.15 },
  dark: true,
  shape: { radius: 14, borderWidth: 1.5, shadowOffset: 0 },
  uppercaseHeadings: false, // the face is capitals only
  headingShadow: false,
};

// An 8-bit arcade cabinet: black, neon-green lettering with a magenta drop,
// yellow buttons, green frames and square corners. Every pair is 5.4:1 or better.
const ARCADE: Theme = {
  id: 'arcade',
  name: copy.themes.arcade.name,
  description: copy.themes.arcade.description,
  colors: {
    background: '#0B0B0F',
    heading: '#39FF14',
    text: '#FFFFFF',
    muted: '#B9B9CC',
    border: '#39FF14',
    surface: '#17171F',
    onSurface: '#FFFFFF',
    mutedOnSurface: '#B9B9CC',
    accent: '#FFE600',
    onAccent: '#0B0B0F',
    danger: '#FF5470',
    onDanger: '#0B0B0F',
    success: '#39FF14',
    highlight: '#2A0F2E',
    onHighlight: '#FF2BD6',
    shadow: '#FF2BD6',
  },
  // Press Start 2P is very wide: every letter is a full square
  fonts: { display: 'PressStart2P', scale: 0.55 },
  dark: true,
  shape: { radius: 0, borderWidth: 3, shadowOffset: 4 },
  uppercaseHeadings: true,
  headingShadow: true,
};

// The old town: warm sandstone, the red of the city's flag for headings, the
// Aare's blue-green for buttons, and a Frutiger-style sans like Swiss road
// signs. Every pair is 3.3:1 (buttons against the stone) or better; text is
// 4.5:1 or better.
const BERN: Theme = {
  id: 'bern',
  name: copy.themes.bern.name,
  description: copy.themes.bern.description,
  colors: {
    background: '#D8D3C3',
    heading: '#B5121B',
    text: '#1F2A26',
    muted: '#4F534C',
    border: '#A39D8C',
    surface: '#F4F1E8',
    onSurface: '#1F2A26',
    mutedOnSurface: '#55594F',
    accent: '#1E7C80',
    onAccent: '#FFFFFF',
    danger: '#9C1F17',
    onDanger: '#FFFFFF',
    success: '#2A6034',
    highlight: '#D3EDEB',
    onHighlight: '#0B4F52',
    shadow: 'transparent',
  },
  // A Frutiger-style sans, like Swiss road signs
  fonts: { display: 'Hind', scale: 1 },
  dark: false,
  shape: { radius: 6, borderWidth: 1.5, shadowOffset: 0 },
  uppercaseHeadings: true,
  headingShadow: false,
};

export const THEMES: Record<ThemeId, Theme> = { basic: BASIC, retro: RETRO, night: NIGHT, arcade: ARCADE, bern: BERN };
export const THEME_LIST: Theme[] = [BASIC, RETRO, NIGHT, ARCADE, BERN];
export const DEFAULT_THEME_ID: ThemeId = 'basic';

export function themeFor(themeId: string | null | undefined): Theme {
  return THEMES[themeId as ThemeId] ?? THEMES[DEFAULT_THEME_ID];
}
