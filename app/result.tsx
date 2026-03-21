import { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
  Share,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { X, ShareNetwork, ArrowLeft, Lock, WarningCircle, Warning, ShieldWarning, Robot, Barcode, ArrowsClockwise, CaretRight, ShieldCheck, CheckCircle } from "phosphor-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  useDerivedValue,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolateColor,
} from "react-native-reanimated";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import Colors, { C, cardShadow, coloredShadow, getScoreShortLabel, getScoreLabel as getScoreLabelFull, useThemeColors, type ThemeColors } from "@/constants/colors";
import { apiRequest, getApiUrl, queryClient } from "@/lib/query-client";
import { fetch } from "expo/fetch";

interface ScoreData {
  score: number;
  label: string;
  isAllergenAlert: boolean;
  matchedAllergens: string[];
  inferredAllergenWarnings?: string[];
  allergenDisplayState?: "hard_alert" | "product_contains_nonmatching" | "possible_risk" | "none";
  productDeclaredAllergens?: string[];
  productInferredAllergens?: string[];
  advice: string;
  headline: string;
  coachTip: string;
  highlights: string[];
  product: any;
}

const GAUGE_SIZE = 240;
const STROKE_WIDTH = 20;
const GLOW_STROKE_WIDTH = 32;
const RADIUS = (GAUGE_SIZE - GLOW_STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getScoreColor(score: number, isAllergenAlert: boolean, t: ThemeColors = C): string {
  if (isAllergenAlert) return t.danger;
  if (score <= 15) return t.darkRed;
  if (score <= 35) return t.danger;
  if (score <= 50) return t.amber;
  if (score <= 74) return t.tealScore;
  return t.green;
}

function getScoreGradient(score: number, isAllergenAlert: boolean): [string, string] {
  if (isAllergenAlert) return ["#E53935", "#C62828"];
  if (score <= 15) return ["#D32F2F", "#B71C1C"];
  if (score <= 35) return ["#EF5350", "#C62828"];
  if (score <= 50) return ["#FFA726", "#EF6C00"];
  if (score <= 74) return ["#2EC4B6", "#26A69A"];
  return ["#3DD68C", "#2EC4B6"];
}

function getScoreTrackColor(t: ThemeColors): string {
  return t.skeleton;
}

function getScoreBg(score: number, isAllergenAlert: boolean, t: ThemeColors): string {
  if (isAllergenAlert) return t.scoreBgAllergen;
  if (score <= 35) return t.scoreBgPoor;
  if (score <= 50) return t.scoreBgCaution;
  return t.scoreBgGood;
}

function getAdviceBorderColor(score: number, isAllergenAlert: boolean, t: ThemeColors): string {
  if (isAllergenAlert) return t.scoreChipAllergen;
  if (score <= 35) return t.scoreChipPoor;
  if (score <= 50) return t.scoreChipCaution;
  return t.scoreChipGood;
}

function getPersonalizedHeadline(score: number, label: string, headline: string, isAllergenAlert: boolean, adviceText?: string): string {
  if (isAllergenAlert) return "Allergen detected";
  if (headline) return headline;

  if (adviceText && score > 50 && score <= 74) {
    const adviceLower = adviceText.toLowerCase();
    const hasConcern = ["diabetes", "blood sugar", "cholesterol", "carbs", "keep an eye", "not ideal", "concern", "could affect"]
      .some(w => adviceLower.includes(w));
    if (hasConcern) return "A few things to watch";
  }

  if (score <= 25) return "Not a great fit for you";
  if (score <= 50) return "A few things to watch";
  if (score <= 74) return "Solid choice overall";
  return "Great pick for you";
}

const CAUTION_WORDS = [
  "watch", "attention", "risk", "alert", "careful",
  "caution", "warning", "spike", "concern", "avoid",
  "hidden", "overload", "heavy", "excess", "too much",
  "mind", "carb", "sugar", "sodium", "limit", "moderate",
  "tricky", "sneaky", "loaded", "packed", "high",
];

function getHeadlineColor(score: number, isAllergenAlert: boolean, headline: string, adviceText?: string, t: ThemeColors = C): string {
  if (isAllergenAlert) return t.danger;
  if (score <= 35) return t.danger;
  const headlineLower = (headline || "").toLowerCase();
  const isCautionaryHeadline = CAUTION_WORDS.some(w => headlineLower.includes(w));
  if (isCautionaryHeadline) return t.amber;

  if (adviceText && score <= 70) {
    const adviceLower = adviceText.toLowerCase();
    const conditionConcerns = [
      "diabetes", "blood sugar", "cholesterol", "carbs",
      "keep an eye", "watch out", "be careful", "not ideal",
      "concern", "tricky", "affects your", "spike",
      "could affect", "could impact",
    ];
    const hasConcern = conditionConcerns.some(w => adviceLower.includes(w));
    if (hasConcern) return t.amber;
  }

  return t.text;
}

function getHighlightSeverity(text: string): "warning" | "neutral" | "positive" {
  const lower = text.toLowerCase();
  const positivePatterns = [
    "good source", "good amount", "great source", "rich in", "high fiber", "high protein", "high in fiber", "high in protein",
    "vitamin", "healthy", "natural", "organic", "excellent",
    "decent", "solid", "beneficial",
    "low calorie", "low sugar", "low sodium", "low fat",
    "low in sugar", "low in sodium", "low in fat", "low in calories", "low in carbs",
    "zero sugar", "zero sodium", "no sugar", "no sodium",
    "very low", "minimal", "moderate sugar", "moderate sodium", "moderate fat",
    "source of", "plenty", "balanced", "reasonable",
    "not too high", "within range", "good fiber", "adequate",
    "plant based", "plant-based", "whole grain", "whole-grain",
    "heart healthy", "heart-healthy",
  ];
  if (positivePatterns.some(w => lower.includes(w))) return "positive";

  const warningPatterns = [
    "high in sugar", "high in sodium", "high in fat", "high in carbs", "high in calories",
    "high sugar", "high sodium", "high fat", "high carbs", "high calories",
    "too much", "excess", "excessive", "added sugar", "added sugars",
    "low protein", "low fiber", "low in protein", "low in fiber",
    "saturated fat", "trans fat",
    "calorie dense", "calorie heavy",
    "sugar heavy", "sodium heavy",
    "contains gluten", "contains allergen",
  ];
  if (warningPatterns.some(w => lower.includes(w))) return "warning";

  return "neutral";
}

function getHighlightDotColor(severity: "warning" | "neutral" | "positive", tierColor: string, t: ThemeColors = C): string {
  if (severity === "warning") return t.amber;
  if (severity === "positive") return t.green;
  return tierColor;
}

const DAILY_VALUES: Record<string, number> = {
  calories: 2000,
  protein: 50,
  carbohydrates: 275,
  sugar: 50,
  fat: 78,
  saturatedFat: 20,
  fiber: 28,
  sodium: 2300,
};

function formatNutrientValue(value: number | null): string {
  if (value === null || value === undefined) return "—";
  if (Number.isInteger(value)) return String(value);
  if (value >= 100) return Math.round(value).toString();
  const s = value.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

const NUTRITION_LABEL_MAP: Record<string, { label: string; unit: string }> = {
  transFat: { label: "Trans Fat", unit: "g" },
  cholesterol: { label: "Cholesterol", unit: "mg" },
  potassium: { label: "Potassium", unit: "mg" },
  calcium: { label: "Calcium", unit: "mg" },
  iron: { label: "Iron", unit: "mg" },
  vitaminA: { label: "Vitamin A", unit: "mcg" },
  vitaminC: { label: "Vitamin C", unit: "mg" },
  vitaminD: { label: "Vitamin D", unit: "mcg" },
  vitaminB12: { label: "Vitamin B12", unit: "mcg" },
  vitaminB6: { label: "Vitamin B6", unit: "mg" },
  addedSugars: { label: "Added Sugars", unit: "g" },
  sugarAlcohols: { label: "Sugar Alcohols", unit: "g" },
  magnesium: { label: "Magnesium", unit: "mg" },
  zinc: { label: "Zinc", unit: "mg" },
  folate: { label: "Folate", unit: "mcg" },
  phosphorus: { label: "Phosphorus", unit: "mg" },
};

function formatNutrientKey(key: string): string {
  const mapped = NUTRITION_LABEL_MAP[key];
  if (mapped) return mapped.label;
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/Pct$/, " %")
    .trim();
}

function getNutrientUnit(key: string): string {
  const mapped = NUTRITION_LABEL_MAP[key];
  if (mapped) return mapped.unit;
  if (key.endsWith("Pct")) return "%";
  return "";
}

function getNutrientBarColor(key: string, value: number, t: ThemeColors = C): string {
  const dailyVal = DAILY_VALUES[key];
  if (!dailyVal) return t.muted;
  const pct = value / dailyVal;
  if (pct > 0.4) return t.danger;
  if (pct > 0.2) return t.amber;
  return t.green;
}

function ScoreRing({
  score,
  isAllergenAlert,
}: {
  score: number;
  isAllergenAlert: boolean;
}) {
  const progress = useSharedValue(0);
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  const t = useThemeColors();
  const [gradientColors] = useState(getScoreGradient(score, isAllergenAlert));
  const scoreColor = getScoreColor(score, isAllergenAlert);
  const trackColor = getScoreTrackColor(t);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withSpring(1, { damping: 16, stiffness: 100 });
    progress.value = withDelay(
      300,
      withTiming(score / 100, {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [score]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const [displayedNumber, setDisplayedNumber] = useState(0);

  useEffect(() => {
    let frame: number;
    const startTime = Date.now();
    const duration = 1000;
    const delay = 300;

    const timeout = setTimeout(() => {
      const animate = () => {
        const elapsed = Date.now() - startTime - delay;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplayedNumber(Math.round(eased * score));
        if (t < 1) {
          frame = requestAnimationFrame(animate);
        }
      };
      frame = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [score]);

  const strokeDashoffset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <Animated.View
      style={[ringStyles.container, containerStyle]}
      accessibilityLabel={`Health score ${score} out of 100, ${getScoreShortLabel(score, isAllergenAlert)}`}
      accessibilityRole="text"
    >
      <Svg width={GAUGE_SIZE} height={GAUGE_SIZE}>
        <Defs>
          <SvgGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradientColors[0]} />
            <Stop offset="1" stopColor={gradientColors[1]} />
          </SvgGradient>
        </Defs>
        <Circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={RADIUS}
          stroke={trackColor}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <Circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={RADIUS}
          stroke={scoreColor}
          strokeWidth={GLOW_STROKE_WIDTH}
          fill="none"
          opacity={0.2}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90, ${GAUGE_SIZE / 2}, ${GAUGE_SIZE / 2})`}
        />
        <Circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={RADIUS}
          stroke="url(#scoreGrad)"
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90, ${GAUGE_SIZE / 2}, ${GAUGE_SIZE / 2})`}
        />
      </Svg>

      <View style={ringStyles.scoreCenter}>
        <Text style={[ringStyles.scoreNumber, { color: scoreColor }]}>
          {displayedNumber}
        </Text>
        <Text style={[ringStyles.scoreLabel, { color: scoreColor }]}>
          {getScoreShortLabel(score, isAllergenAlert)}
        </Text>
      </View>
    </Animated.View>
  );
}

const ringStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  scoreCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: "900" as const,
    letterSpacing: -2,
    lineHeight: 64,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: "800" as const,
    marginTop: 4,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
});

export default function ResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);

  function NutrientRow({
    label,
    value,
    unit,
    index,
    isIndented,
    nutrientKey,
  }: {
    label: string;
    value: number | null;
    unit: string;
    index: number;
    isIndented?: boolean;
    nutrientKey?: string;
  }) {
    if (value === null || value === undefined) return null;

    const barColor = nutrientKey ? getNutrientBarColor(nutrientKey, value, theme) : theme.green;
    const dailyVal = nutrientKey ? DAILY_VALUES[nutrientKey] : undefined;
    const barPct = dailyVal ? Math.min(value / dailyVal, 1) : 0;

    return (
      <View style={styles.nutrientRow}>
        <View style={styles.nutrientRowTop}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: isIndented ? ("400" as const) : ("600" as const),
              color: theme.text,
              paddingLeft: isIndented ? 24 : 0,
              flex: 1,
            }}
          >
            {label}
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700" as const,
              color: theme.text,
            }}
          >
            {formatNutrientValue(value)}
            <Text style={{ fontSize: 12, fontWeight: "400" as const, color: theme.muted }}>{unit ? ` ${unit}` : ""}</Text>
          </Text>
        </View>
        {dailyVal && barPct > 0 && (
          <View style={styles.nutrientBarTrack}>
            <View style={[styles.nutrientBarFill, { width: `${Math.round(barPct * 100)}%`, backgroundColor: barColor }]} />
          </View>
        )}
      </View>
    );
  }

  function HighlightItem({ text, index, tierColor }: { text: string; index: number; tierColor: string }) {
    const severity = getHighlightSeverity(text);
    const dotColor = getHighlightDotColor(severity, tierColor, theme);

    return (
      <Animated.View
        entering={FadeInDown.delay(400 + index * 80).duration(300)}
        style={styles.highlightItem}
      >
        <View style={[styles.highlightDot, { backgroundColor: dotColor }]} />
        <Text style={styles.highlightText} numberOfLines={3}>
          {text}
        </Text>
      </Animated.View>
    );
  }

  const params = useLocalSearchParams<{
    productId?: string;
    accessMethod?: string;
    historyId?: string;
  }>();

  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [reAnalyzed, setReAnalyzed] = useState(false);
  const [originalScore, setOriginalScore] = useState<number | null>(null);
  const [showFullNutrition, setShowFullNutrition] = useState(false);


  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const filteredHighlights = useMemo(() => {
    if (!data?.highlights || data.highlights.length === 0) return [];
    const vaguePatterns = [
      /^contains\s/i, /^critical\s?allergen/i, /^not\s?suitable/i,
      /^check\s?allergen/i, /^allergen/i, /^avoid/i, /^warning/i,
      /^caution/i, /^unsafe/i, /^dangerous/i,
    ];
    return data.highlights.filter((h: string) =>
      !vaguePatterns.some(p => p.test(h.trim()))
    );
  }, [data?.highlights]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      if (params.historyId) {
        const res = await apiRequest("GET", `/api/history/entry/${params.historyId}?checkProfile=true`);
        if (res.ok) {
          const entry = await res.json();
          const wasReAnalyzed = entry.reAnalyzed === true;
          setReAnalyzed(wasReAnalyzed);
          setData({
            score: entry.score,
            label: getScoreLabelFull(entry.score, entry.isAllergenAlert ?? false),
            isAllergenAlert: entry.isAllergenAlert ?? false,
            matchedAllergens: entry.matchedAllergens || [],
            inferredAllergenWarnings: entry.inferredAllergenWarnings || [],
            allergenDisplayState: entry.allergenDisplayState || "none",
            productDeclaredAllergens: entry.productDeclaredAllergens || [],
            productInferredAllergens: entry.productInferredAllergens || [],
            advice: entry.adviceText || "",
            headline: entry.headline || "",
            coachTip: entry.coachTip || "",
            highlights: (entry.highlights || []) as string[],
            product: {
              name: entry.productName,
              brand: entry.productBrand,
              category: entry.productCategory,
              calories: entry.productCalories,
              protein: entry.productProtein,
              carbohydrates: entry.productCarbs,
              sugar: entry.productSugar,
              fat: entry.productFat,
              saturatedFat: entry.productSaturatedFat,
              fiber: entry.productFiber,
              sodium: entry.productSodium,
              allergens: entry.productAllergens,
              servingSize: entry.productServingSize,
              ingredients: entry.productIngredients,
              nutritionFacts: entry.productNutritionFacts,
              source: entry.productSource,
            },
          });
          if (wasReAnalyzed) {
            if (entry.original?.score !== undefined) {
              setOriginalScore(entry.original.score);
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            queryClient.invalidateQueries({ queryKey: ["/api/history"] });
          }
        } else {
          setError("Could not load this result.");
        }
      } else if (params.productId) {
        const res = await apiRequest("POST", "/api/score", {
          productId: parseInt(params.productId),
          accessMethod: params.accessMethod || "browse",
        });
        const resData = await res.json();
        setData(resData);

        queryClient.invalidateQueries({ queryKey: ["/api/history"] });
        queryClient.invalidateQueries({ queryKey: ["/api/scans/today"] });

        if (resData.isAllergenAlert) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else if (resData.score >= 70) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    } catch (e: any) {
      if (e.message?.includes("429")) {
        setShowLimitModal(true);
      } else {
        setError("Something went wrong. Please try again.");
      }
      console.error(e);
    }
    setLoading(false);
  }

  async function handleShare() {
    if (!data) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const product = data.product;
    const headline = getPersonalizedHeadline(data.score, data.label, data.headline, data.isAllergenAlert, data.advice);
    const message = `${product.name}${product.brand ? ` by ${product.brand}` : ""} scored ${data.score}/100 on FoodVAR — "${headline}"`;
    try {
      await Share.share({ message });
    } catch (e) {
      console.error(e);
    }
  }



  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <MotiView
          from={{ opacity: 0.4 }}
          animate={{ opacity: 0.9 }}
          transition={{ loop: true, type: "timing", duration: 850 }}
          style={{ width: 200, height: 200, borderRadius: 100, backgroundColor: theme.skeleton }}
        />
        <MotiView
          from={{ opacity: 0.4 }}
          animate={{ opacity: 0.9 }}
          transition={{ loop: true, type: "timing", duration: 850 }}
          style={{ width: 180, height: 20, borderRadius: 10, backgroundColor: theme.skeleton, marginTop: 20 }}
        />
        <MotiView
          from={{ opacity: 0.4 }}
          animate={{ opacity: 0.9 }}
          transition={{ loop: true, type: "timing", duration: 850 }}
          style={{ width: 120, height: 14, borderRadius: 7, backgroundColor: theme.skeleton, marginTop: 10 }}
        />
        <Text style={styles.loadingText}>{params.historyId ? "Checking for profile updates..." : "Analyzing for your profile..."}</Text>
      </View>
    );
  }

  if (showLimitModal) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} accessibilityLabel="Go back" accessibilityRole="button">
            <X size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.limitCard}>
          <View style={styles.limitIconWrap}>
            <Lock size={36} color={theme.primary} />
          </View>
          <Text style={styles.limitTitle}>Daily limit reached</Text>
          <Text style={styles.limitSubtitle}>
            You've used all 10 free scans for today. Your scans reset at midnight.
          </Text>
          <View style={styles.limitDivider} />
          <Text style={styles.limitHint}>
            Upgrade to Pro for unlimited scans, priority AI advice, and more.
          </Text>
          <TouchableOpacity
            style={styles.limitBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ArrowLeft size={18} color={theme.onPrimary} />
            <Text style={styles.limitBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} accessibilityLabel="Go back" accessibilityRole="button">
            <X size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorState}>
          <WarningCircle size={48} color={theme.amber} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!data) return null;

  const product = data.product;
  const scoreColor = getScoreColor(data.score, data.isAllergenAlert, theme);
  const headlineText = getPersonalizedHeadline(data.score, data.label, data.headline, data.isAllergenAlert, data.advice);
  const headlineColor = getHeadlineColor(data.score, data.isAllergenAlert, headlineText, data.advice, theme);

  const hasAdditionalNutrition = product.nutritionFacts && Object.keys(product.nutritionFacts).filter(
    (k) => product.nutritionFacts[k] !== null && product.nutritionFacts[k] !== undefined
  ).length > 0;

  if (data.isAllergenAlert) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, styles.headerBtn]} accessibilityLabel="Close result" accessibilityRole="button">
            <X size={20} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerProductName, { color: theme.text }]} numberOfLines={1}>{product.name}</Text>
            <Text style={[styles.headerProductSub, { color: theme.muted }]} numberOfLines={1}>
              {[product.brand, product.category].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <TouchableOpacity onPress={handleShare} style={[styles.shareBtn, styles.headerBtn]} accessibilityLabel="Share result" accessibilityRole="button">
            <ShareNetwork size={18} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 20,
            gap: 16,
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(500)}>
            <LinearGradient
              colors={[theme.dangerBg, theme.card]}
              style={styles.scoreGradientCard}
            >
              <MotiView
                from={{ scale: 0.7 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" as const, damping: 10, delay: 200 }}
              >
                <ShieldWarning size={64} color={theme.danger} weight="fill" />
              </MotiView>
              <Text style={[styles.scoreHeadline, { color: theme.danger, marginTop: 12 }]}>Allergen Detected</Text>
              <Text style={[styles.scoreSubline, { color: theme.text, fontWeight: '600' as const }]}>
                Contains {data.matchedAllergens.join(", ")}
              </Text>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <View style={[styles.allergenPill, { backgroundColor: theme.dangerBg, borderColor: theme.scoreChipAllergen }]} accessible={true} accessibilityLabel={`Allergen alert: contains ${data.matchedAllergens.join(", ")}`} accessibilityRole="alert">
              <Warning size={18} color={theme.danger} weight="fill" />
              <Text style={[styles.allergenPillText, { color: theme.danger }]}>
                Allergen Alert — {data.matchedAllergens.join(", ")}
              </Text>
            </View>
          </Animated.View>

          {data.advice ? (
            <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.aiCoachCard}>
              <View style={[styles.aiCoachAccent, { backgroundColor: theme.danger }]} />
              <View style={styles.aiCoachContent}>
                <View style={styles.aiCoachHeader}>
                  <View style={[styles.aiCoachIconCircle, { backgroundColor: theme.tealBg }]}>
                    <Robot size={18} color={theme.tealScore} weight="fill" />
                  </View>
                  <Text style={[styles.aiCoachTitle, { color: theme.text }]}>AI Coach</Text>
                </View>
                <Text style={[styles.adviceText, { color: theme.text }]}>{data.advice}</Text>
              </View>
            </Animated.View>
          ) : null}

          <Animated.View
            entering={FadeInDown.delay(350).duration(400)}
            style={styles.ingredientsSection}
          >
            <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Ingredients</Text>
            <Text style={styles.ingredientsText}>
              {product.ingredients || "No ingredients listed for this product."}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(300)}>
            <Text style={styles.disclaimerText}>
              For informational purposes only — not medical advice.{'\n'}Always consult your healthcare provider.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(450).duration(400)} style={styles.scanAnotherWrap}>
            <TouchableOpacity
              style={styles.allergenCta}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.replace("/(tabs)/scan");
              }}
              activeOpacity={0.85}
              accessibilityLabel="Scan another product"
              accessibilityRole="button"
            >
              <Barcode size={20} color={theme.onPrimary} weight="bold" />
              <Text style={styles.scanAnotherText}>Scan Another</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  const allergenState = data.allergenDisplayState || "none";

  const allProductAllergens = [
    ...(data.productDeclaredAllergens || []),
    ...(data.productInferredAllergens || []).filter(
      (a: string) => !(data.productDeclaredAllergens || []).includes(a)
    ),
  ];

  function renderAllergenSection() {
    if (allergenState === "possible_risk") {
      return (
        <View style={[styles.allergenPill, {
          backgroundColor: theme.warningBg,
          borderColor: theme.warningBorder,
        }]} accessible={true} accessibilityLabel={`Possible allergen risk from ingredients: ${(data?.inferredAllergenWarnings || []).join(', ')}`}>
          <Warning size={18} color={theme.possibleRiskIcon} weight="fill" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.allergenPillText, { color: theme.possibleRiskText }]}>
              Possible allergen risk
            </Text>
            <Text style={[styles.allergenPillSubtext, { color: theme.possibleRiskText }]}>
              Ingredients suggest possible risk for: {(data?.inferredAllergenWarnings || []).join(', ')}
            </Text>
          </View>
        </View>
      );
    }

    if (allergenState === "product_contains_nonmatching") {
      return (
        <View style={[styles.allergenPill, {
          backgroundColor: theme.neutralBg,
          borderColor: theme.neutralBorder,
        }]} accessible={true} accessibilityLabel={`Product contains allergens not in your profile: ${allProductAllergens.join(', ')}`}>
          <ShieldCheck size={18} color={theme.neutralIcon} weight="fill" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.allergenPillText, { color: theme.neutralText }]}>
              Contains allergens not in your profile
            </Text>
            <Text style={[styles.allergenPillSubtext, { color: theme.neutralSubtext }]}>
              This product contains: {allProductAllergens.join(', ')}
            </Text>
          </View>
        </View>
      );
    }

    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, styles.headerBtn]} accessibilityLabel="Close result" accessibilityRole="button">
          <X size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerProductName, { color: theme.text }]} numberOfLines={1}>{product.name}</Text>
          <Text style={[styles.headerProductSub, { color: theme.muted }]} numberOfLines={1}>
            {[product.brand, product.category].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={[styles.shareBtn, styles.headerBtn]} accessibilityLabel="Share result" accessibilityRole="button">
          <ShareNetwork size={18} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 20,
          gap: 16,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {reAnalyzed && (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.reAnalyzedBanner}
          >
            <ArrowsClockwise size={18} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.reAnalyzedText}>
                Updated for your current profile
              </Text>
              {originalScore !== null && originalScore !== data.score && (
                <Text style={styles.reAnalyzedSubtext}>
                  Previously scored: {originalScore}/100
                </Text>
              )}
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(500)}>
          <LinearGradient
            colors={[theme.greenBg, theme.card]}
            style={styles.scoreGradientCard}
          >
            <ScoreRing
              score={data.score}
              isAllergenAlert={data.isAllergenAlert}
            />
            <Text style={[styles.scoreHeadline, { color: headlineColor }]}>{headlineText}</Text>
            {data.advice ? (
              <Text style={styles.scoreSubline}>
                {data.advice.split('.')[0]}.
              </Text>
            ) : null}
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          {renderAllergenSection()}
        </Animated.View>

        {product.source === "fatsecret" && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <View style={[styles.allergenPill, {
              backgroundColor: theme.neutralBg,
              borderColor: theme.neutralBorder,
            }]}>
              <WarningCircle size={16} color={theme.neutralIcon} weight="fill" />
              <Text style={[styles.allergenPillSubtext, { color: theme.neutralSubtext, flex: 1 }]}>
                Nutrition data from third-party database — verify package label for allergen certainty.
              </Text>
            </View>
          </Animated.View>
        )}

        {data.advice ? (
          <Animated.View
            entering={FadeInDown.delay(250).duration(400)}
            style={styles.aiCoachCard}
          >
            <View style={[styles.aiCoachAccent, { backgroundColor: theme.tealScore }]} />
            <View style={styles.aiCoachContent}>
              <View style={styles.aiCoachHeader}>
                <View style={[styles.aiCoachIconCircle, { backgroundColor: theme.tealBg }]}>
                  <Robot size={18} color={theme.tealScore} weight="fill" />
                </View>
                <Text style={[styles.aiCoachTitle, { color: theme.text }]}>AI Coach</Text>
              </View>
              <Text style={[styles.adviceText, { color: theme.text }]}>{data.advice}</Text>

              {data.coachTip ? (
                <View style={[styles.coachTipBox, { backgroundColor: theme.bg }]}>
                  <Text style={{ fontSize: 18, lineHeight: 22 }}>💡</Text>
                  <Text style={styles.coachTipBoxText}>
                    <Text style={{ fontWeight: '600' as const, color: theme.text }}>Tip: </Text>
                    {data.coachTip}
                  </Text>
                </View>
              ) : null}
            </View>
          </Animated.View>
        ) : null}

        {filteredHighlights.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.highlightsCard}>
            <Text style={[styles.highlightsCardTitle, { color: theme.text }]}>Key Highlights</Text>
            <View style={styles.highlightsList}>
              {filteredHighlights.map((h: string, i: number) => {
                const severity = getHighlightSeverity(h);
                return (
                  <View key={i} style={styles.highlightRow}>
                    {severity === 'positive' ? (
                      <CheckCircle size={18} color={theme.green} weight="fill" />
                    ) : severity === 'warning' ? (
                      <WarningCircle size={18} color={theme.amber} weight="fill" />
                    ) : (
                      <CheckCircle size={18} color={scoreColor} weight="fill" />
                    )}
                    <Text style={[styles.highlightRowText, { color: theme.text }]}>{h}</Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.delay(400).duration(400)}
        >
          <View style={[styles.nutritionCard, { backgroundColor: theme.card }]}>
            <View style={styles.nutritionHeader}>
              <Text style={[styles.nutritionTitle, { color: theme.text }]}>Nutrition Facts</Text>
              {product.servingSize ? (
                <Text style={styles.servingLabel}>per serving ({product.servingSize})</Text>
              ) : null}
            </View>
            <View style={styles.nutritionTable}>
              <NutrientRow label="Calories" value={product.calories} unit="kcal" index={0} nutrientKey="calories" />
              <NutrientRow label="Protein" value={product.protein} unit="g" index={1} nutrientKey="protein" />
              <NutrientRow label="Carbs" value={product.carbohydrates} unit="g" index={2} nutrientKey="carbohydrates" />
              <NutrientRow label="Sugar" value={product.sugar} unit="g" index={3} nutrientKey="sugar" />
              <NutrientRow label="Fat" value={product.fat} unit="g" index={4} nutrientKey="fat" />
              <NutrientRow label="Saturated Fat" value={product.saturatedFat} unit="g" index={5} nutrientKey="saturatedFat" />
              <NutrientRow label="Fiber" value={product.fiber} unit="g" index={6} nutrientKey="fiber" />
              <NutrientRow label="Sodium" value={product.sodium} unit="mg" index={7} nutrientKey="sodium" />
            </View>

            {hasAdditionalNutrition && (
              <>
                {showFullNutrition ? (
                  <View style={styles.nutritionTable}>
                    {Object.entries(product.nutritionFacts)
                      .filter(([k, v]) => v !== null && v !== undefined && typeof v === "number" && k !== "cholesterol")
                      .map(([key, val], i) => (
                        <NutrientRow
                          key={key}
                          label={formatNutrientKey(key)}
                          value={val as number}
                          unit={getNutrientUnit(key)}
                          index={i}
                        />
                      ))}
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.viewFullBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowFullNutrition(!showFullNutrition);
                  }}
                  accessibilityLabel={showFullNutrition ? "Hide nutrition details" : "View full nutrition label"}
                  accessibilityRole="button"
                >
                  <Text style={styles.viewFullBtnText}>
                    {showFullNutrition ? "HIDE DETAILS" : "VIEW FULL LABEL"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(450).duration(400)}
          style={styles.ingredientsSection}
        >
          <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Ingredients</Text>
          <Text style={styles.ingredientsText}>
            {product.ingredients || "No ingredients listed for this product."}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).duration(300)}>
          <Text style={styles.disclaimerText}>
            For informational purposes only — not medical advice.{'\n'}Always consult your healthcare provider.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  headerBtn: {
    backgroundColor: theme.card,
    ...cardShadow("subtle"),
  },
  headerCenter: {
    flex: 1,
    alignItems: "center" as const,
    paddingHorizontal: 8,
  },
  headerProductName: {
    fontSize: 18,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
    textAlign: "center" as const,
  },
  headerProductSub: {
    fontSize: 13,
    marginTop: 2,
    textAlign: "center" as const,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  loadingText: {
    fontSize: 15,
    color: theme.muted,
    marginTop: 16,
    fontWeight: "500" as const,
  },
  errorState: {
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 12,
    flex: 1,
    justifyContent: "center",
  },
  errorText: {
    fontSize: 16,
    color: theme.text,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "500" as const,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: theme.primary,
    marginTop: 8,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: theme.onPrimary,
  },
  limitCard: {
    backgroundColor: theme.card,
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 28,
    marginHorizontal: 24,
    alignItems: "center" as const,
    ...cardShadow("strong"),
  },
  limitIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.tinted,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 20,
  },
  limitTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: theme.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  limitSubtitle: {
    fontSize: 15,
    color: theme.muted,
    textAlign: "center" as const,
    lineHeight: 22,
    marginBottom: 16,
  },
  limitDivider: {
    width: "80%",
    height: 1,
    backgroundColor: theme.divider,
    marginBottom: 16,
  },
  limitHint: {
    fontSize: 14,
    color: theme.primary,
    textAlign: "center" as const,
    lineHeight: 20,
    fontWeight: "500" as const,
    marginBottom: 24,
  },
  limitBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    backgroundColor: theme.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  limitBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: theme.onPrimary,
  },
  reAnalyzedBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.tinted,
  },
  reAnalyzedText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: theme.primary,
  },
  reAnalyzedSubtext: {
    fontSize: 12,
    color: theme.muted,
    marginTop: 2,
  },
  disclaimerText: {
    fontSize: 12,
    color: theme.placeholder,
    textAlign: "center" as const,
    lineHeight: 18,
    marginTop: 4,
  },
  scoreGradientCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center" as const,
    borderWidth: 0.5,
    borderColor: theme.border,
    ...cardShadow("medium"),
  },
  scoreHeadline: {
    fontSize: 20,
    fontWeight: "700" as const,
    textAlign: "center" as const,
    marginTop: 4,
  },
  scoreSubline: {
    fontSize: 15,
    color: theme.muted,
    textAlign: "center" as const,
    marginTop: 4,
    lineHeight: 22,
  },
  allergenPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  allergenPillText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  allergenPillSubtext: {
    fontSize: 12,
    fontWeight: "400" as const,
    marginTop: 2,
  },
  aiCoachCard: {
    backgroundColor: theme.card,
    borderRadius: 24,
    overflow: "hidden" as const,
    borderWidth: 0.5,
    borderColor: theme.border,
    flexDirection: "row" as const,
    ...cardShadow("medium"),
  },
  aiCoachAccent: {
    width: 4,
  },
  aiCoachContent: {
    flex: 1,
    padding: 20,
    paddingLeft: 16,
  },
  aiCoachHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 12,
  },
  aiCoachIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  aiCoachTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
  coachTipBox: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 10,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  coachTipBoxText: {
    flex: 1,
    fontSize: 14,
    color: theme.muted,
    lineHeight: 20,
  },
  highlightsCard: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 0.5,
    borderColor: theme.border,
    ...cardShadow("medium"),
  },
  highlightsCardTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    marginBottom: 16,
  },
  highlightsList: {
    gap: 14,
  },
  highlightRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 10,
  },
  highlightRowText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  productName: {
    fontSize: 22,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
    color: theme.text,
  },
  productBrand: {
    fontSize: 14,
    color: theme.muted,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: "row" as const,
    marginTop: 8,
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: theme.tinted,
  },
  chipText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  chipNeutral: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: theme.divider,
  },
  chipNeutralText: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  adviceCard: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: theme.card,
    borderWidth: 0.5,
    borderColor: theme.border,
    ...cardShadow("medium"),
  },
  adviceHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 12,
  },
  adviceIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  adviceLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.2,
    color: theme.primary,
    textTransform: "uppercase" as const,
  },
  adviceDivider: {
    height: 0.5,
    backgroundColor: theme.divider,
    marginBottom: 12,
  },
  adviceHeadline: {
    fontSize: 16,
    fontWeight: "800" as const,
    marginBottom: 8,
  },
  adviceText: {
    fontSize: 14,
    color: theme.text,
    lineHeight: 23,
  },
  coachTipRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.divider,
  },
  coachTipDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: theme.amber,
    marginTop: 5,
  },
  coachTipText: {
    fontSize: 13,
    color: theme.muted,
    lineHeight: 20,
    flex: 1,
    fontStyle: "italic" as const,
  },
  highlightsInAdvice: {
    marginTop: 14,
    gap: 8,
  },
  highlightItem: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 10,
    paddingVertical: 6,
  },
  highlightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  highlightText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: theme.text,
    lineHeight: 20,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: theme.text,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  nutritionCard: {
    borderRadius: 24,
    overflow: "hidden" as const,
    borderWidth: 0.5,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  nutritionHeader: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    justifyContent: "space-between" as const,
  },
  nutritionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: theme.text,
  },
  servingLabel: {
    fontSize: 12,
    color: theme.muted,
    marginTop: 2,
  },
  nutritionTable: {
    paddingHorizontal: 16,
  },
  nutrientRow: {
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.divider,
  },
  nutrientRowTop: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  nutrientBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.divider,
    marginTop: 8,
    width: "100%" as const,
  },
  nutrientBarFill: {
    height: 4,
    borderRadius: 2,
  },
  viewFullBtn: {
    alignItems: "center" as const,
    paddingVertical: 14,
    borderTopWidth: 0.5,
    borderTopColor: theme.divider,
  },
  viewFullBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: theme.tealScore,
    letterSpacing: 0.5,
  },
  allergensSection: {
    marginBottom: 8,
  },
  allergensSectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 12,
  },
  allergensSectionTitle: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: theme.danger,
    textTransform: "uppercase" as const,
    letterSpacing: 1.5,
  },
  allergenChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  allergenChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.dangerBg,
  },
  allergenChipText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: theme.danger,
    textTransform: "capitalize" as const,
  },
  ingredientsSection: {
    marginBottom: 8,
  },
  ingredientsText: {
    fontSize: 14,
    color: theme.muted,
    lineHeight: 22,
  },
  scanAnotherWrap: {
    marginBottom: 8,
    marginTop: 4,
  },
  scanAnotherGradient: {
    borderRadius: 999,
    padding: 1,
  },
  scanAnotherInner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    paddingVertical: 15,
    borderRadius: 999,
  },
  scanAnotherText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: theme.onPrimary,
  },
  allergenTopBanner: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  allergenTopBannerText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: theme.onPrimary,
    flex: 1,
  },
  allergenAlertCard: {
    backgroundColor: theme.card,
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: theme.border,
    padding: 24,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
    alignItems: "center" as const,
  },
  allergenAlertLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: theme.danger,
    letterSpacing: 1.5,
    marginTop: 16,
  },
  allergenContainsText: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: theme.text,
    marginTop: 8,
    textAlign: "center" as const,
  },
  allergenProductInfo: {
    backgroundColor: theme.card,
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: theme.border,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  allergenCta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: theme.text,
  },
});
