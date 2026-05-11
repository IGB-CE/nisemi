export const colors = {
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

export const gradient = {
  header: ['#000000', '#1A0303', '#3D0606'] as const,
  card: ['#0B0B0B', '#141414'] as const,
  hero: ['#000000', '#2A0606', '#E10600'] as const,
  redGlow: ['rgba(225,6,0,0.0)', 'rgba(225,6,0,0.25)', 'rgba(225,6,0,0.0)'] as const,
};

export const typography = {
  hero: { fontSize: 56, fontWeight: '900' as const, letterSpacing: -1.5, color: colors.text },
  display: { fontSize: 40, fontWeight: '900' as const, letterSpacing: -1, color: colors.text },
  h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5, color: colors.text },
  h2: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.3, color: colors.text },
  h3: { fontSize: 17, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, fontWeight: '500' as const, color: colors.text },
  bodyDim: { fontSize: 14, fontWeight: '500' as const, color: colors.textDim },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1, color: colors.subtle, textTransform: 'uppercase' as const },
  caption: { fontSize: 12, fontWeight: '500' as const, color: colors.subtle },
};
