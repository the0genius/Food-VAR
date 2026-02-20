import { Platform } from "react-native";

const Colors = {
  primary: "#2E7D32",
  primaryDark: "#1B5E20",
  primaryLight: "#66BB6A",
  primaryPale: "#E8F5E9",
  primaryMist: "#F1F8F1",

  accent: "#FF8A65",
  accentLight: "#FFCCBC",
  accentPale: "#FFF3E0",

  white: "#FFFFFF",
  softWhite: "#F5FAF5",
  warmWhite: "#FAFAF7",
  charcoal: "#1B1B1B",
  darkGray: "#333333",
  mediumGray: "#666666",
  softGray: "#999999",
  lightGray: "#E0E0E0",
  faintGray: "#F0F0F0",

  scoreRed: "#E53935",
  scoreAmber: "#FB8C00",
  scoreGreen: "#43A047",
  danger: "#E53935",
  dangerPale: "#FFEBEE",
  info: "#1976D2",
  infoPale: "#E3F2FD",

  cardBg: "#FFFFFF",
  cardBgElevated: "#FFFFFF",
  cardBgSubtle: "#F5FAF5",
  screenBg: "#EEF6EE",

  gradientGreen: ["#2E7D32", "#43A047", "#66BB6A"] as const,
  gradientGreenSoft: ["#E8F5E9", "#F1F8F1", "#EEF6EE"] as const,
  gradientHeader: ["#2E7D32", "#388E3C", "#43A047"] as const,
  mintCTA: "#3DD68C",
  mintTeal: "#2EC4B6",
  gradientCTA: ["#3DD68C", "#2EC4B6"] as const,

  light: {
    text: "#1B1B1B",
    textSecondary: "#666666",
    background: "#EEF6EE",
    backgroundSecondary: "#F5FAF5",
    tint: "#2E7D32",
    tabIconDefault: "#BDBDBD",
    tabIconSelected: "#2E7D32",
    border: "#DCE8DC",
    card: "#FFFFFF",
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

export default Colors;
