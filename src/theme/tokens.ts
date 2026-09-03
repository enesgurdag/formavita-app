/**
 * FormaVita — porselen zemin, indigo sis, violet vurgu.
 * Logo (midnight + violet + beyaz çiçek) ile uyumlu; krem/lila çatışması yok.
 */
import { Platform, TextStyle } from 'react-native';

export const colors = {
  brand: {
    midnight: '#11104A',
    violet: '#6C3CF0',
    /** Logo çiçeği / kart yüzeyi */
    paper: '#FFFFFF',
    /** İnce marka sis (chip, banner) */
    lilac: '#EDE9FA',
  },
  /** Porselen canvas — soğuk, temiz, logo indigo’suna yaslanır */
  background: '#EEEBF7',
  /** Üst atmosfer (Screen wash) */
  wash: 'rgba(108, 60, 240, 0.10)',
  washDeep: 'rgba(17, 16, 74, 0.07)',
  /** Kart / tab / input */
  surface: '#FFFFFF',
  /** Stat, segmented, ikincil dolgu */
  surfaceMuted: '#EEEBF8',
  surfaceElevated: '#FFFFFF',
  border: '#E4DFF3',
  borderStrong: '#D0C9E6',
  text: {
    primary: '#11104A',
    secondary: '#4A4768',
    muted: '#7A7693',
    inverse: '#FFFFFF',
    danger: '#B42318',
    success: '#0F6B4D',
  },
  diet: {
    main: '#0B7C74',
    soft: '#E6F5F3',
    border: '#BFE3DE',
  },
  pilates: {
    main: '#6C3CF0',
    soft: '#EFE8FF',
    border: '#D4C4F8',
  },
  warning: {
    main: '#B45309',
    soft: '#FEF3C7',
  },
  danger: {
    main: '#B42318',
    soft: '#FEE4E2',
  },
  overlay: 'rgba(17, 16, 74, 0.48)',
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 3,
  },
  soft: {
    shadowColor: '#11104A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
} as const;

export const touchTarget = 48;
