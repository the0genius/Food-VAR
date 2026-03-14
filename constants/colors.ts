import { Platform, useColorScheme } from "react-native";

export const C = {
  bg: '#F6F8F7',
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
};

export type ThemeColors = typeof C;

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  if (scheme === 'dark') return darkTokens;
  return C;
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

export function getScoreColor(score: number): string {
  if (score === 0) return C.danger;
  if (score <= 15) return C.darkRed;
  if (score <= 35) return C.danger;
  if (score <= 50) return C.amber;
  if (score <= 74) return C.tealScore;
  return C.green;
}

export function getScoreBgColor(score: number): string {
  if (score === 0) return C.dangerBg;
  if (score <= 15) return '#FFE8E8';
  if (score <= 35) return C.dangerBg;
  if (score <= 50) return C.amberBg;
  if (score <= 74) return C.tealBg;
  return C.greenBg;
}

export {
  getScoreLabel,
  getScoreShortLabel,
  getScoreTier,
  SCORE_LABELS,
  SCORE_SHORT_LABELS,
} from "@shared/score-labels";

export default Colors;
