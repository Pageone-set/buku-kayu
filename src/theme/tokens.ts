export const COLORS = {
  // Financial Stability Ultra-Clean Minimalist Canvas & Surfaces
  bg: '#F7F9FB',
  surface: '#FFFFFF',
  surfaceSubtle: '#EFF3F7',
  surfaceMuted: '#E5EBF1',
  border: '#E6ECF2',
  borderStrong: '#CBD5E1',

  // High-Contrast Charcoal Ink & Floating Pill Surface
  charcoal: '#333333',
  navBarBg: '#333333',
  textPrimary: '#222831',
  textSecondary: '#5A6675',
  textMuted: '#8B97A6',
  textOnDark: '#FFFFFF',

  // Brand Primary: Deep Navy (#0A3C6E) + compatibility aliases
  navy: '#0A3C6E',
  navyDark: '#072A4E',
  navyLight: '#EAF2FA',
  navyBorder: '#BDD6EE',

  walnut: '#0A3C6E',
  walnutDark: '#072A4E',
  walnutLight: '#EAF2FA',
  walnutBorder: '#BDD6EE',

  amber: '#0A3C6E',
  amberDark: '#072A4E',
  amberLight: '#EAF2FA',
  amberBorder: '#BDD6EE',

  // Brand Secondary: Ocean Blue (#1783C1)
  ocean: '#1783C1',
  oceanDark: '#12689B',
  oceanLight: '#E8F4FC',
  oceanBorder: '#AED8F2',

  blue: '#1783C1',
  blueLight: '#E8F4FC',

  // Semantic Status: Green (Uang Masuk / Lunas)
  green: '#15803D',
  greenLight: '#EAF7EF',
  greenBorder: '#B7E4C7',

  // Semantic Status: Red (Uang Keluar / Kasbon)
  red: '#C0392B',
  redLight: '#FDECEC',
  redBorder: '#F5C2BE',
} as const;

export const WOOD_SWATCHES: Record<string, string> = {
  jati: '#8B5A2B',
  mahoni: '#7A3528',
  sengon: '#D7BC91',
  kamper: '#B57C4A',
  meranti: '#9E5438',
  bengkirai: '#A66F2E',
  ulin: '#4E3629',
};

export function getWoodSwatchColor(woodType: string): string {
  const key = woodType.trim().toLowerCase();
  for (const [name, hex] of Object.entries(WOOD_SWATCHES)) {
    if (key.includes(name)) {
      return hex;
    }
  }
  return '#9C8F82';
}

export const FONTS = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const TYPOGRAPHY = {
  hero: 28,
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
  chipMinHeight: 46,
  inputMinHeight: 52,
  radiusSm: 10,
  radiusMd: 14,
  radiusLg: 18,
  radiusXl: 22,
  radiusPill: 999,
  spacingXs: 6,
  spacingSm: 10,
  spacingMd: 16,
  spacingLg: 20,
} as const;

export const SHADOWS = {
  card: {
    shadowColor: '#0A3C6E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  floating: {
    shadowColor: '#0A3C6E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
  navPill: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;
