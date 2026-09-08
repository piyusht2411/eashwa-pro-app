// Centralized design tokens — orange/white theme with Inter font.
// Import these instead of hardcoding hex/spacing/font values across screens.

import { Platform, TextStyle } from "react-native";

export const colors = {
  // Brand
  primary: "#F97316",
  primaryDark: "#EA580C",
  primaryDarker: "#C2410C",
  primaryLight: "#FB923C",
  primarySoft: "#FFEDD5",
  primarySofter: "#FFF7ED",
  primaryBorder: "#FED7AA",

  // Surfaces
  bg: "#FFFFFF",
  bgMuted: "#FAFAFA",
  bgSubtle: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F5F9",

  // Text
  text: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#64748B",
  textFaint: "#94A3B8",
  textOnPrimary: "#FFFFFF",

  // Borders
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  borderSoft: "#F1F5F9",

  // Status
  success: "#16A34A",
  successSoft: "#F0FDF4",
  successBorder: "#BBF7D0",
  warning: "#D97706",
  warningSoft: "#FFFBEB",
  warningBorder: "#FDE68A",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  dangerBorder: "#FECACA",
  info: "#2563EB",
  infoSoft: "#EFF6FF",
  infoBorder: "#BFDBFE",

  // Overlay
  overlay: "rgba(15, 23, 42, 0.45)",

  white: "#FFFFFF",
  black: "#0F172A",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 56,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  full: 999,
};

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
};

type T = TextStyle;

export const typography: Record<string, T> = {
  displayLg: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38, letterSpacing: -0.5, color: colors.text },
  display: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, letterSpacing: -0.3, color: colors.text },
  h1: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2, color: colors.text },
  h2: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.text },
  h3: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.text },
  bodyMd: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.text },
  bodySm: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.textMuted },
  overline: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.textFaint,
  },
  label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.textSecondary },
  button: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, letterSpacing: 0.2, color: colors.white },
};

export const shadow = {
  xs: Platform.select({
    ios: {
      shadowColor: "#0F172A",
      shadowOpacity: 0.04,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
    },
    android: { elevation: 1 },
    default: {},
  }) as object,
  sm: Platform.select({
    ios: {
      shadowColor: "#0F172A",
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    android: { elevation: 2 },
    default: {},
  }) as object,
  md: Platform.select({
    ios: {
      shadowColor: "#0F172A",
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 4 },
    default: {},
  }) as object,
  lg: Platform.select({
    ios: {
      shadowColor: "#F97316",
      shadowOpacity: 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 6 },
    default: {},
  }) as object,
  /** Warm brand-tinted lift, for primary CTAs and hero cards. */
  brand: Platform.select({
    ios: {
      shadowColor: "#EA580C",
      shadowOpacity: 0.28,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 8 },
    default: {},
  }) as object,
};

/**
 * Shared gradient ramps. Tuples are `as const` so they satisfy
 * expo-linear-gradient's readonly [string, string, ...string[]] colour prop.
 */
export const gradients = {
  brand: ["#FB923C", "#F97316", "#EA580C"] as const,
  brandDeep: ["#F97316", "#EA580C", "#C2410C"] as const,
  /** Subtle page header wash behind white cards. */
  headerWash: ["#FFFFFF", "#FFF7ED"] as const,
  slate: ["#334155", "#1E293B"] as const,
};

/** Accent ramp for metric tiles — keeps dashboards visually varied but on-brand. */
export const accents = {
  brand: { fg: colors.primaryDark, bg: colors.primarySofter, ring: colors.primaryBorder },
  info: { fg: colors.info, bg: colors.infoSoft, ring: colors.infoBorder },
  success: { fg: colors.success, bg: colors.successSoft, ring: colors.successBorder },
  warning: { fg: colors.warning, bg: colors.warningSoft, ring: colors.warningBorder },
  danger: { fg: colors.danger, bg: colors.dangerSoft, ring: colors.dangerBorder },
  neutral: { fg: colors.textSecondary, bg: colors.surfaceAlt, ring: colors.border },
};

export type AccentName = keyof typeof accents;

export const theme = { colors, spacing, radius, fonts, typography, shadow, gradients, accents };
export default theme;
