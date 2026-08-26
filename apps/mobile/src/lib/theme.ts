/** Addis Tiggena design tokens - mirrors the web design system v3 ("app-first"). */

export const C = {
  navy: '#0b1e3f',
  navySoft: '#12294f',
  navyBlack: '#071429',
  blue: '#0072ce',
  blueDeep: '#005ba6',
  blueSoft: '#e8f1fb',
  ink: '#16233a',
  muted: '#5b6b83',
  line: '#e3e9f2',
  bg: '#f4f7fb',
  card: '#ffffff',
  teal: '#0072ce',
  amber: '#d9912c',
  red: '#cf4444',
  green: '#1d9e6f',
  warnBg: '#fdf6e8',
  warnFg: '#8a5f14',
  warnLine: '#f0dcb0',
  okBg: '#e9f7f1',
  okFg: '#166b4a',
};

export const R = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const F = {
  /** Montserrat - display / headings */
  display: 'Montserrat_800ExtraBold',
  displayBold: 'Montserrat_700Bold',
  /** Inter - body */
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  /** Noto Sans Ethiopic - Amharic */
  am: 'NotoSansEthiopic_400Regular',
  amBold: 'NotoSansEthiopic_700Bold',
};

export const SHADOW = {
  card: {
    shadowColor: C.navyBlack,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  navy: {
    shadowColor: C.navyBlack,
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
};
