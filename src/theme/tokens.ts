/**
 * FormaVita marka rehberi — Midnight Indigo, Violet, Warm Paper, Soft Lilac
 */
import { Platform, TextStyle } from 'react-native';

export const colors = {
  brand: {
    midnight: '#11104A',
    violet: '#6C3CF0',
    paper: '#FFF9ED',
    lilac: '#F4F1FF',
  },
  /** Soft Lilac — uygulama zemini */
  background: '#F4F1FF',
  /** Warm Paper / beyaz yüzeyler */
  surface: '#FFFFFF',
  surfaceMuted: '#EDE8FA',
  surfaceElevated: '#FFF9ED',
  border: '#E3DDF2',
  borderStrong: '#CDC4E4',
  text: {
    primary: '#11104A',
    secondary: '#5A5674',
    muted: '#8E8AA3',
    inverse: '#FFF9ED',
    danger: '#B42318',
    success: '#0F6B4D',
  },
  diet: {
    main: '#0D9488',
    soft: '#E7F7F4',
    border: '#B5E2DB',
  },
  pilates: {
    main: '#6C3CF0',
    soft: '#F1E9FF',
    border: '#D4C2F7',
  },
  warning: {
    main: '#B45309',
    soft: '#FEF3C7',
  },
  danger: {
    main: '#B42318',
    soft: '#FEE4E2',
  },
  overlay: 'rgba(17, 16, 74, 0.45)',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 999,
} as const;

/** iOS: SF Pro Rounded hissi için sistem fontu */
export const fontRounded: TextStyle = Platform.select({
  ios: { fontFamily: 'System' },
  default: {},
}) as TextStyle;

export const typography = {
  hero: {
    ...fontRounded,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  title: {
    ...fontRounded,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  heading: {
    ...fontRounded,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400' as const,
    letterSpacing: -0.1,
  },
  bodyMedium: {
    ...fontRounded,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    letterSpacing: -0.05,
  },
  captionMedium: {
    ...fontRounded,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.05,
  },
  small: {
    ...fontRounded,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
  money: {
    ...fontRounded,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  button: {
    ...fontRounded,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
  },
} as const;

export const shadows = {
  card: {
    shadowColor: '#11104A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  soft: {
    shadowColor: '#11104A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
} as const;

export const touchTarget = 48;
