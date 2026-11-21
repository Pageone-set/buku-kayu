export const COLORS = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  border: '#CBD5E1',
  borderStrong: '#94A3B8',
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textOnDark: '#FFFFFF',
  amber: '#B45309',
  amberDark: '#92400E',
  amberLight: '#FEF3C7',
  amberBorder: '#F59E0B',
  green: '#15803D',
  greenLight: '#DCFCE7',
  greenBorder: '#86EFAC',
  red: '#B91C1C',
  redLight: '#FEE2E2',
  redBorder: '#FCA5A5',
  blue: '#1D4ED8',
  blueLight: '#DBEAFE',
} as const;

export const TYPOGRAPHY = {
  title: 24,
  heading: 20,
  subhead: 18,
  body: 16,
  label: 14,
  caption: 13,
  amountLg: 26,
  amountMd: 20,
} as const;

export const SIZING = {
  buttonMinHeight: 54,
  ctaMinHeight: 60,
  chipMinHeight: 48,
  inputMinHeight: 52,
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  spacingXs: 6,
  spacingSm: 10,
  spacingMd: 16,
  spacingLg: 20,
} as const;

export const SHADOWS = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;
