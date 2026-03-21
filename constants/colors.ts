import { Platform } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

export const C = {
  bg: '#F5F5F7',
  card: '#FFFFFF',
  tinted: '#E8F5E9',

  primary: '#2E7D32',
  mint: '#3DD68C',
  teal: '#2EC4B6',

  text: '#1B1B1B',
  muted: '#666666',
  placeholder: '#999999',

  border: 'rgba(0,0,0,0.07)',
  divider: '#F0F0F0',

  danger: '#E53935',
  dangerBg: '#FFEBEE',
  darkRed: '#D32F2F',
  amber: '#FB8C00',
  amberBg: '#FFF3E0',
  tealScore: '#2EC4B6',
  tealBg: '#E0F7FA',
  green: '#43A047',
  greenBg: '#E8F5E9',
  skeleton: '#EBEBEB',
  mutedIcon: '#CCCCCC',
  scoreBgGood: '#F2FAF6',
  scoreBgCaution: '#FFFBF5',
  scoreBgPoor: '#FFF8F8',
  scoreBgAllergen: '#FFF5F5',
  scoreChipGood: '#D4F0E0',
  scoreChipCaution: '#FFE0B2',
  scoreChipPoor: '#FFCDD2',
  scoreChipAllergen: '#FFCDD2',
  infoBg: '#EBF4FF',
  info: '#1976D2',
  warningBg: '#FFF8E1',
  warningBorder: '#FFA726',
  warningText: '#5D4037',
  neutralBg: '#F0F4F8',
  neutralBorder: '#CFD8DC',
  neutralIcon: '#546E7A',
  neutralText: '#37474F',
  neutralSubtext: '#546E7A',
  possibleRiskIcon: '#F57C00',
  possibleRiskText: '#E65100',
  chipBg: '#F0F0F0',
  cardRaised: '#FFFFFF',
  tealTint: 'rgba(46,196,182,0.1)',
  mintTint: 'rgba(61,214,140,0.1)',
  mintTintStrong: 'rgba(61,214,140,0.15)',
  amberTint: 'rgba(251,140,0,0.1)',
  progressTrack: 'rgba(0,0,0,0.04)',
  subtleBorder: 'rgba(0,0,0,0.05)',
  purple: '#7C4DFF',
  purpleTint: '#F3E8FF',
  toggleTrack: '#D1D5DB',
  onPrimary: '#FFFFFF',
  onDark: '#FFFFFF',
  brandGold: '#FFD700',
  overlayBtn: 'rgba(255,255,255,0.5)',
  shadow: '#000000',
  cameraBlack: '#000000',
  brandGoogle: '#4285F4',
  brandApple: '#000000',
  overlayDark: 'rgba(0,0,0,0.72)',
  overlayLight: 'rgba(255,255,255,0.15)',
  onPrimaryMuted: 'rgba(255,255,255,0.9)',
  gradAllergen: ['#E53935', '#C62828'] as [string, string],
  gradPoor: ['#D32F2F', '#B71C1C'] as [string, string],
  gradLow: ['#EF5350', '#C62828'] as [string, string],
  gradCaution: ['#FFA726', '#EF6C00'] as [string, string],
  gradModerate: ['#2EC4B6', '#26A69A'] as [string, string],
  gradGood: ['#3DD68C', '#2EC4B6'] as [string, string],
};

const darkTokens = {
  bg: '#121212',
  card: '#1E1E1E',
  tinted: '#1B3A1D',

  primary: '#66BB6A',
  mint: '#3DD68C',
  teal: '#4DD0C8',

  text: '#E8E8E8',
  muted: '#A0A0A0',
  placeholder: '#787878',

  border: 'rgba(255,255,255,0.1)',
  divider: '#2C2C2C',

  danger: '#EF5350',
  dangerBg: '#3D1515',
  darkRed: '#EF5350',
  amber: '#FFB74D',
  amberBg: '#3D2E15',
  tealScore: '#4DD0C8',
  tealBg: '#153D3A',
  green: '#66BB6A',
  greenBg: '#1B3A1D',
  skeleton: '#2C2C2C',
  mutedIcon: '#555555',
  scoreBgGood: '#1B3A1D',
  scoreBgCaution: '#3D2E15',
  scoreBgPoor: '#3D1515',
  scoreBgAllergen: '#3D1515',
  scoreChipGood: '#1B3A1D',
  scoreChipCaution: '#3D2E15',
  scoreChipPoor: '#3D1515',
  scoreChipAllergen: '#3D1515',
  infoBg: '#152A3D',
  info: '#64B5F6',
  warningBg: '#3D2E15',
  warningBorder: '#FFB74D',
  warningText: '#FFE0B2',
  neutralBg: '#1E2A35',
  neutralBorder: 'rgba(144,164,183,0.3)',
  neutralIcon: '#90A4AE',
  neutralText: '#B0BEC5',
  neutralSubtext: '#90A4AE',
  possibleRiskIcon: '#FFB74D',
  possibleRiskText: '#FFB74D',
  chipBg: '#2C2C2C',
  cardRaised: '#3A3A3A',
  tealTint: 'rgba(77,208,200,0.15)',
  mintTint: 'rgba(61,214,140,0.15)',
  mintTintStrong: 'rgba(61,214,140,0.2)',
  amberTint: 'rgba(255,183,77,0.15)',
  progressTrack: 'rgba(255,255,255,0.06)',
  subtleBorder: 'rgba(255,255,255,0.1)',
  purple: '#7C4DFF',
  purpleTint: 'rgba(124,77,255,0.15)',
  toggleTrack: '#555555',
  onPrimary: '#FFFFFF',
  onDark: '#FFFFFF',
  brandGold: '#FFD700',
  overlayBtn: 'rgba(255,255,255,0.1)',
  shadow: '#000000',
  cameraBlack: '#000000',
  brandGoogle: '#4285F4',
  brandApple: '#000000',
  overlayDark: 'rgba(0,0,0,0.72)',
  overlayLight: 'rgba(255,255,255,0.15)',
  onPrimaryMuted: 'rgba(255,255,255,0.9)',
  gradAllergen: ['#E53935', '#C62828'] as [string, string],
  gradPoor: ['#D32F2F', '#B71C1C'] as [string, string],
  gradLow: ['#EF5350', '#C62828'] as [string, string],
  gradCaution: ['#FFA726', '#EF6C00'] as [string, string],
  gradModerate: ['#2EC4B6', '#26A69A'] as [string, string],
  gradGood: ['#3DD68C', '#2EC4B6'] as [string, string],
};

export type ThemeColors = typeof C & { isDark: boolean };

export function useThemeColors(): ThemeColors {
  const { resolved } = useTheme();
  if (resolved === 'dark') return { ...darkTokens, isDark: true };
  return { ...C, isDark: false };
}

const Colors = {
  primary: C.primary,
  primaryDark: "#1B5E20",
  primaryLight: "#66BB6A",
  primaryPale: C.tinted,
  primaryMist: "#F1F8F1",

  accent: "#FF8A65",
  accentLight: "#FFCCBC",
  accentPale: "#FFF3E0",

  white: C.card,
  softWhite: "#F5FAF5",
  warmWhite: "#FAFAF7",
  charcoal: C.text,
  darkGray: "#333333",
  mediumGray: C.muted,
  softGray: C.placeholder,
  lightGray: "#E0E0E0",
  faintGray: C.divider,

  scoreRed: C.danger,
  scoreAmber: C.amber,
  scoreGreen: C.green,
  danger: C.danger,
  dangerPale: C.dangerBg,
  info: "#1976D2",
  infoPale: "#E3F2FD",

  cardBg: C.card,
  cardBgElevated: C.card,
  cardBgSubtle: "#F5FAF5",
  screenBg: C.bg,

  gradientGreen: ["#2E7D32", "#43A047", "#66BB6A"] as const,
  gradientGreenSoft: ["#EDF2EF", "#F1F5F3", "#F6F8F7"] as const,
  gradientHeader: ["#2E7D32", "#388E3C", "#43A047"] as const,
  mintCTA: C.mint,
  mintTeal: C.teal,
  gradientCTA: ["#3DD68C", "#2EC4B6"] as const,

  light: {
    text: C.text,
    textSecondary: C.muted,
    background: C.bg,
    backgroundSecondary: "#F5FAF5",
    tint: C.primary,
    tabIconDefault: "#BDBDBD",
    tabIconSelected: C.primary,
    border: "#DCE8DC",
    card: C.card,
  },
};

export function cardShadow(intensity: "subtle" | "medium" | "strong" = "medium") {
  const shadows = {
    subtle: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
    },
    medium: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    strong: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
  };

  const shadow = shadows[intensity];
  return Platform.select({
    ios: shadow,
    android: { elevation: intensity === "subtle" ? 1 : intensity === "medium" ? 3 : 6 } as any,
    web: shadow,
  });
}

export function coloredShadow(color: string, intensity: "subtle" | "medium" | "strong" = "medium") {
  const opacities = { subtle: 0.15, medium: 0.25, strong: 0.35 };
  const shadow = {
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: opacities[intensity],
    shadowRadius: intensity === "subtle" ? 6 : intensity === "medium" ? 10 : 16,
  };
  return Platform.select({
    ios: shadow,
    android: { elevation: intensity === "subtle" ? 2 : intensity === "medium" ? 4 : 8 } as any,
    web: shadow,
  });
}

const defaultTheme: ThemeColors = { ...C, isDark: false };

export function getScoreColor(score: number, t: ThemeColors = defaultTheme): string {
  if (score === 0) return t.danger;
  if (score <= 15) return t.darkRed;
  if (score <= 35) return t.danger;
  if (score <= 50) return t.amber;
  if (score <= 74) return t.tealScore;
  return t.green;
}

export function getScoreBgColor(score: number, t: ThemeColors = defaultTheme): string {
  if (score === 0) return t.dangerBg;
  if (score <= 15) return t.dangerBg;
  if (score <= 35) return t.dangerBg;
  if (score <= 50) return t.amberBg;
  if (score <= 74) return t.tealBg;
  return t.greenBg;
}

export {
  getScoreLabel,
  getScoreShortLabel,
  getScoreTier,
  SCORE_LABELS,
  SCORE_SHORT_LABELS,
} from "@shared/score-labels";

export default Colors;
