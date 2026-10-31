const WHITE = '#FFFFFF';
const WARM_INK = '#241A12';

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function parseHexColor(input) {
  if (typeof input !== 'string') return null;
  const hex = input.trim().replace('#', '');
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(hex)) return null;
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16)
  };
}

export function relativeLuminance(input) {
  const rgb = parseHexColor(input);
  if (!rgb) return null;
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/** Pick the label colour (white or warm ink) with the higher contrast on a fill. */
export function contrastInk(fill) {
  const light = contrastRatio(fill, WHITE);
  const dark = contrastRatio(fill, WARM_INK);
  if (light === null || dark === null) return WHITE;
  return dark >= light ? WARM_INK : WHITE;
}

/** True when a colour is legible enough to be used as text on the given surface. */
export function isLegibleOn(color, surface, minimum = 4.5) {
  const ratio = contrastRatio(color, surface);
  return ratio !== null && ratio >= minimum;
}
