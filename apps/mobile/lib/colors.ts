export interface Palette {
  primary: string;
  primaryDeep: string;
  primarySoft: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceHigh: string;
  text: string;
  textDim: string;
  subtle: string;
  border: string;
  borderStrong: string;
  danger: string;
  success: string;
  warning: string;
  primaryDark: string;
  primaryLight: string;
}

export const darkColors: Palette = {
  primary: '#E10600',
  primaryDeep: '#9A0500',
  primarySoft: '#2A0606',
  background: '#000000',
  surface: '#0B0B0B',
  surfaceElevated: '#141414',
  surfaceHigh: '#1C1C1C',
  text: '#FFFFFF',
  textDim: '#B5B5B5',
  subtle: '#6B6B6B',
  border: '#1A1A1A',
  borderStrong: '#262626',
  danger: '#FF4444',
  success: '#22C55E',
  warning: '#F59E0B',

  primaryDark: '#9A0500',
  primaryLight: '#2A0606',
};

export const lightColors: Palette = {
  primary: '#E10600',
  primaryDeep: '#9A0500',
  primarySoft: '#FFE7E5',
  background: '#FFFFFF',
  surface: '#F5F5F7',
  surfaceElevated: '#FFFFFF',
  surfaceHigh: '#ECECEF',
  text: '#0A0A0A',
  textDim: '#52525B',
  subtle: '#8A8A8E',
  border: '#E4E4E7',
  borderStrong: '#D1D1D6',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',

  primaryDark: '#9A0500',
  primaryLight: '#FFE7E5',
};

export interface Gradients {
  header: readonly [string, string, string];
  card: readonly [string, string];
  hero: readonly [string, string, string];
  redGlow: readonly [string, string, string];
}

export const darkGradient: Gradients = {
  header: ['#000000', '#1A0303', '#3D0606'],
  card: ['#0B0B0B', '#141414'],
  hero: ['#000000', '#2A0606', '#E10600'],
  redGlow: ['rgba(225,6,0,0.0)', 'rgba(225,6,0,0.25)', 'rgba(225,6,0,0.0)'],
};

export const lightGradient: Gradients = {
  header: ['#FFFFFF', '#FFF1F0', '#FFE0DD'],
  card: ['#FFFFFF', '#F5F5F7'],
  hero: ['#FFFFFF', '#FFD9D6', '#E10600'],
  redGlow: ['rgba(225,6,0,0.0)', 'rgba(225,6,0,0.18)', 'rgba(225,6,0,0.0)'],
};

export function makeTypography(c: Palette) {
  return {
    hero: { fontSize: 56, fontWeight: '900' as const, letterSpacing: -1.5, color: c.text },
    display: { fontSize: 40, fontWeight: '900' as const, letterSpacing: -1, color: c.text },
    h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5, color: c.text },
    h2: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.3, color: c.text },
    h3: { fontSize: 17, fontWeight: '700' as const, color: c.text },
    body: { fontSize: 15, fontWeight: '500' as const, color: c.text },
    bodyDim: { fontSize: 14, fontWeight: '500' as const, color: c.textDim },
    label: {
      fontSize: 11,
      fontWeight: '700' as const,
      letterSpacing: 1,
      color: c.subtle,
      textTransform: 'uppercase' as const,
    },
    caption: { fontSize: 12, fontWeight: '500' as const, color: c.subtle },
  };
}

export type Typography = ReturnType<typeof makeTypography>;

// Backwards-compatible default exports (dark palette). Prefer the theme-aware
// hooks in lib/theme.tsx (useTheme / useThemedStyles) for anything that should
// react to the light/dark toggle.
export const colors = darkColors;
export const gradient = darkGradient;
export const typography = makeTypography(darkColors);
