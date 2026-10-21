// A player theme on the web: the game form's previews and the recap use it.
// The app names fonts without spaces; Google Fonts, loaded in index.html,
// names them with.
const WEB_FONT = { BebasNeue: 'Bebas Neue', PressStart2P: 'Press Start 2P' };

export function displayFont(theme) {
  return theme.fonts.display
    ? `'${WEB_FONT[theme.fonts.display] ?? theme.fonts.display}', system-ui, sans-serif`
    : undefined;
}

// Large display text, as the app's heading() draws it
export function headingStyle(theme, size) {
  const display = displayFont(theme);
  return {
    color: theme.colors.heading,
    fontFamily: display,
    fontWeight: display ? 400 : 700,
    fontSize: `${size * theme.fonts.scale}px`,
    lineHeight: 1.15,
    textTransform: theme.uppercaseHeadings ? 'uppercase' : 'none',
    textShadow: theme.headingShadow ? `2px 2px 0 ${theme.colors.shadow}` : 'none',
  };
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

// Large text on a card. Most themes' heading colour reads on their cards;
// where it doesn't (Retro's light blue headings on light blue cards), the
// background colour does, and keeps the heading in the theme's colours.
export function headingOnSurface(theme) {
  const { heading, background, surface, onSurface } = theme.colors;
  if (contrast(heading, surface) >= 3) return heading;
  if (contrast(background, surface) >= 2.5) return background;
  return onSurface;
}

// A card, with the theme's hard offset edge where it has one
export function panelStyle(theme) {
  const { borderWidth, shadowOffset, radius } = theme.shape;
  return {
    background: theme.colors.surface,
    color: theme.colors.onSurface,
    borderStyle: 'solid',
    borderColor: shadowOffset ? theme.colors.border : theme.colors.surface,
    borderRadius: radius,
    borderWidth,
    borderRightWidth: borderWidth + shadowOffset,
    borderBottomWidth: borderWidth + shadowOffset,
  };
}

export function buttonStyle(theme) {
  const { borderWidth, shadowOffset, radius } = theme.shape;
  const display = displayFont(theme);
  return {
    background: theme.colors.accent,
    color: theme.colors.onAccent,
    borderStyle: 'solid',
    borderColor: shadowOffset ? theme.colors.shadow : theme.colors.accent,
    borderRadius: radius,
    borderWidth,
    borderRightWidth: borderWidth + shadowOffset,
    borderBottomWidth: borderWidth + shadowOffset,
    fontFamily: display,
    fontWeight: display ? 400 : 600,
    textTransform: theme.uppercaseHeadings ? 'uppercase' : 'none',
    letterSpacing: theme.uppercaseHeadings ? 1 : 0,
  };
}
