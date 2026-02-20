import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import Colors, { cardShadow, coloredShadow } from "@/constants/colors";
import { apiRequest, getApiUrl, queryClient } from "@/lib/query-client";
import { fetch } from "expo/fetch";

interface ScoreData {
  score: number;
  label: string;
  isAllergenAlert: boolean;
  matchedAllergens: string[];
  advice: string;
  headline: string;
  coachTip: string;
  highlights: string[];
  product: any;
}

const GAUGE_SIZE = 180;
const STROKE_WIDTH = 10;
const RADIUS = (GAUGE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getScoreColor(score: number, isAllergenAlert: boolean): string {
  if (isAllergenAlert) return Colors.danger;
  if (score <= 30) return Colors.scoreRed;
  if (score <= 60) return Colors.scoreAmber;
  return Colors.primary;
}

function getScoreGradient(score: number, isAllergenAlert: boolean): [string, string] {
  if (isAllergenAlert) return ["#E53935", "#C62828"];
  if (score <= 30) return ["#EF5350", "#C62828"];
  if (score <= 60) return ["#FFA726", "#EF6C00"];
  return [Colors.primaryLight, Colors.primary];
}

function getScoreColorLight(score: number, isAllergenAlert: boolean): string {
  if (isAllergenAlert) return "#FFEBEE";
  if (score <= 30) return "#FFF0F0";
  if (score <= 60) return "#FFF8F0";
  return Colors.primaryPale;
}

function getScoreBg(score: number, isAllergenAlert: boolean): string {
  if (isAllergenAlert) return "#FFF5F5";
  if (score <= 30) return "#FFF8F8";
  if (score <= 60) return "#FFFBF5";
  return "#F0F9F0";
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

function getHeadlineColor(score: number, isAllergenAlert: boolean, headline: string, adviceText?: string): string {
  if (isAllergenAlert) return Colors.danger;
  if (score <= 30) return Colors.scoreRed;
  const headlineLower = (headline || "").toLowerCase();
  const isCautionaryHeadline = CAUTION_WORDS.some(w => headlineLower.includes(w));
  if (isCautionaryHeadline) return Colors.scoreAmber;

  if (adviceText && score <= 70) {
    const adviceLower = adviceText.toLowerCase();
    const conditionConcerns = [
      "diabetes", "blood sugar", "cholesterol", "carbs",
      "keep an eye", "watch out", "be careful", "not ideal",
      "concern", "tricky", "affects your", "spike",
      "could affect", "could impact",
    ];
    const hasConcern = conditionConcerns.some(w => adviceLower.includes(w));
    if (hasConcern) return Colors.scoreAmber;
  }

  return getScoreColor(score, false);
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
  ];
  if (warningPatterns.some(w => lower.includes(w))) return "warning";

  return "neutral";
}

function getHighlightIcon(text: string, severity: "warning" | "neutral" | "positive"): string {
  const lower = text.toLowerCase();
  if (lower.includes("fiber")) return "leaf";
  if (lower.includes("sodium") || lower.includes("salt")) return "heart";
  if (lower.includes("sugar")) return "cafe";
  if (lower.includes("protein")) return "barbell";
  if (lower.includes("fat")) return "water";
  if (lower.includes("calorie")) return "flame";
  if (lower.includes("plant") || lower.includes("vegan") || lower.includes("vegetarian")) return "leaf";
  if (lower.includes("vitamin") || lower.includes("mineral")) return "sparkles";
  if (lower.includes("carb")) return "nutrition";
  if (lower.includes("cholesterol")) return "heart";
  if (severity === "positive") return "checkmark-circle";
  if (severity === "warning") return "alert-circle";
  return "information-circle";
}

function getHighlightColor(severity: "warning" | "neutral" | "positive"): { bg: string; color: string } {
  if (severity === "warning") return { bg: "#FFF3E0", color: "#E65100" };
  if (severity === "positive") return { bg: Colors.primaryPale, color: Colors.primary };
  return { bg: "#F5F5F5", color: Colors.mediumGray };
}

function getHighlightSubtitle(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("fiber")) return "Digestive health";
  if (lower.includes("sodium") && (lower.includes("low") || lower.includes("good"))) return "Heart healthy";
  if (lower.includes("sugar") && (lower.includes("low") || lower.includes("no") || lower.includes("zero"))) return "Blood sugar friendly";
  if (lower.includes("sugar") && (lower.includes("high") || lower.includes("added"))) return "Watch intake";
  if (lower.includes("protein") && (lower.includes("high") || lower.includes("good"))) return "Muscle support";
  if (lower.includes("fat") && (lower.includes("low") || lower.includes("good"))) return "Heart friendly";
  if (lower.includes("plant") || lower.includes("vegan")) return "100% Plant based";
  if (lower.includes("calorie") && lower.includes("low")) return "Light choice";
  if (lower.includes("vitamin") || lower.includes("mineral")) return "Essential nutrients";
  return "";
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

  const [gradientColors] = useState(getScoreGradient(score, isAllergenAlert));
  const scoreColor = getScoreColor(score, isAllergenAlert);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withSpring(1, { damping: 16, stiffness: 100 });
    progress.value = withDelay(
      300,
      withTiming(score / 100, {
        duration: 1400,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [score]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const [displayedNumber, setDisplayedNumber] = useState(0);

  useEffect(() => {
    let frame: number;
    const startTime = Date.now();
    const duration = 1400;
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
    <Animated.View style={[ringStyles.container, containerStyle]}>
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
          stroke={scoreColor + "18"}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <Circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={RADIUS}
          stroke="url(#scoreGrad)"
          strokeWidth={STROKE_WIDTH + 1}
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
          {score <= 30 ? "POOR" : score <= 60 ? "FAIR" : score <= 80 ? "GOOD" : "GREAT"}
        </Text>
      </View>
    </Animated.View>
  );
}

const ringStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  scoreCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNumber: {
    fontSize: 52,
    fontWeight: "800" as const,
    letterSpacing: -2,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    marginTop: -2,
    letterSpacing: 3,
  },
});

function NutrientRow({
  label,
  value,
  unit,
  index,
  isIndented,
}: {
  label: string;
  value: number | null;
  unit: string;
  index: number;
  isIndented?: boolean;
}) {
  if (value === null || value === undefined) return null;

  return (
    <View style={[styles.nutrientRow, isIndented && styles.nutrientRowIndented]}>
      <Text style={[styles.nutrientLabel, isIndented && styles.nutrientLabelIndented]}>
        {label}
      </Text>
      <Text style={styles.nutrientValue}>
        {formatNutrientValue(value)}
        <Text style={styles.nutrientUnit}>{unit}</Text>
      </Text>
    </View>
  );
}

function HighlightCard({ text, index }: { text: string; index: number }) {
  const severity = getHighlightSeverity(text);
  const colors = getHighlightColor(severity);
  const icon = getHighlightIcon(text, severity);
  const subtitle = getHighlightSubtitle(text);

  const shortTitle = text.length > 30 ? text.substring(0, 28) + "…" : text;

  return (
    <Animated.View
      entering={FadeInDown.delay(400 + index * 80).duration(300)}
      style={[styles.highlightCard, { backgroundColor: colors.bg }]}
    >
      <View style={[styles.highlightIconWrap, { backgroundColor: colors.color + "18" }]}>
        <Ionicons name={icon as any} size={18} color={colors.color} />
      </View>
      <Text style={[styles.highlightTitle, { color: Colors.charcoal }]} numberOfLines={2}>
        {shortTitle}
      </Text>
      {subtitle ? (
        <Text style={[styles.highlightSubtitle, { color: colors.color }]}>
          {subtitle}
        </Text>
      ) : null}
    </Animated.View>
  );
}

export default function ResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    productId?: string;
    userId?: string;
    accessMethod?: string;
    historyId?: string;
  }>();

  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [reAnalyzed, setReAnalyzed] = useState(false);
  const [showFullNutrition, setShowFullNutrition] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      if (params.historyId) {
        const baseUrl = getApiUrl();
        const url = new URL(`/api/history/entry/${params.historyId}`, baseUrl);
        url.searchParams.set("checkProfile", "true");
        const res = await fetch(url.toString());
        if (res.ok) {
          const entry = await res.json();
          const wasReAnalyzed = entry.reAnalyzed === true;
          setReAnalyzed(wasReAnalyzed);
          setData({
            score: entry.score,
            label: getLabel(entry.score),
            isAllergenAlert: entry.isAllergenAlert ?? entry.score === 0,
            matchedAllergens: entry.matchedAllergens || [],
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
            },
          });
          if (wasReAnalyzed) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            queryClient.invalidateQueries({ queryKey: ["/api/history"] });
          }
        } else {
          setError("Could not load this result.");
        }
      } else if (params.productId && params.userId) {
        const res = await apiRequest("POST", "/api/score", {
          userId: parseInt(params.userId),
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

  function getLabel(score: number): string {
    if (score === 0) return "Allergen Alert";
    if (score <= 30) return "Strongly Avoid";
    if (score <= 60) return "Consume with Caution";
    if (score <= 80) return "Generally Good";
    return "Excellent Fit";
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{params.historyId ? "Checking for profile updates..." : "Analyzing for your profile..."}</Text>
      </View>
    );
  }

  if (showLimitModal) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.charcoal} />
          </TouchableOpacity>
        </View>
        <View style={styles.limitCard}>
          <View style={styles.limitIconWrap}>
            <Ionicons name="lock-closed" size={36} color={Colors.primary} />
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
          >
            <Ionicons name="arrow-back" size={18} color={Colors.white} />
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
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.charcoal} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorState}>
          <Ionicons name="alert-circle" size={48} color={Colors.scoreAmber} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!data) return null;

  const product = data.product;
  const scoreColor = getScoreColor(data.score, data.isAllergenAlert);
  const headlineText = getPersonalizedHeadline(data.score, data.label, data.headline, data.isAllergenAlert, data.advice);

  const hasAdditionalNutrition = product.nutritionFacts && Object.keys(product.nutritionFacts).filter(
    (k) => product.nutritionFacts[k] !== null && product.nutritionFacts[k] !== undefined
  ).length > 0;

  return (
    <View style={styles.container}>
      <View
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={Colors.charcoal} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={20} color={Colors.charcoal} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {data.isAllergenAlert && (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.allergenBanner}
          >
            <Ionicons name="warning" size={22} color={Colors.white} />
            <View style={{ flex: 1 }}>
              <Text style={styles.allergenTitle}>Allergen Alert</Text>
              <Text style={styles.allergenText}>
                Contains: {data.matchedAllergens.join(", ")}
              </Text>
            </View>
          </Animated.View>
        )}

        {reAnalyzed && (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.reAnalyzedBanner}
          >
            <Ionicons name="refresh-circle" size={18} color={Colors.primary} />
            <Text style={styles.reAnalyzedText}>
              Updated for your latest health profile
            </Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(500)} style={styles.scoreSection}>
          <ScoreRing
            score={data.score}
            isAllergenAlert={data.isAllergenAlert}
          />

          <Text style={styles.headlineText}>{headlineText}</Text>
          <Text style={styles.productInfoText}>
            {product.name}
            {product.brand ? ` · ${product.brand}` : ""}
            {product.servingSize ? ` · ${product.servingSize}` : ""}
          </Text>
        </Animated.View>

        {data.advice ? (
          <Animated.View
            entering={FadeInDown.delay(250).duration(400)}
            style={[styles.adviceCard, { backgroundColor: getScoreBg(data.score, data.isAllergenAlert) }]}
          >
            <View style={styles.adviceTitleRow}>
              <Ionicons name="sparkles" size={16} color={scoreColor} />
              <Text style={[styles.adviceTitleText, { color: scoreColor }]}>
                WHAT THIS MEANS FOR YOU
              </Text>
            </View>
            <Text style={styles.adviceText}>{data.advice}</Text>

            {data.coachTip ? (
              <View style={styles.coachTipRow}>
                <Ionicons name="bulb-outline" size={14} color={scoreColor} />
                <Text style={styles.coachTipText}>{data.coachTip}</Text>
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        {data.highlights && data.highlights.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(350).duration(400)}
            style={styles.highlightsSection}
          >
            <Text style={styles.sectionTitle}>Key Highlights</Text>
            <View style={styles.highlightsGrid}>
              {data.highlights.map((h: string, i: number) => (
                <HighlightCard key={i} text={h} index={i} />
              ))}
            </View>
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.delay(450).duration(400)}
          style={styles.nutritionSection}
        >
          <Text style={styles.sectionTitle}>Nutrition Facts</Text>
          {product.servingSize ? (
            <Text style={styles.servingLabel}>Per {product.servingSize}</Text>
          ) : null}
          <View style={styles.nutritionTable}>
            <NutrientRow label="Calories" value={product.calories} unit="" index={0} />
            <NutrientRow label="Total Fat" value={product.fat} unit="g" index={1} />
            <NutrientRow label="Saturated Fat" value={product.saturatedFat} unit="g" index={2} isIndented />
            <NutrientRow label="Cholesterol" value={product.nutritionFacts?.cholesterol ?? null} unit="mg" index={3} />
            <NutrientRow label="Sodium" value={product.sodium} unit="mg" index={4} />
            <NutrientRow label="Total Carbohydrate" value={product.carbohydrates} unit="g" index={5} />
            <NutrientRow label="Dietary Fiber" value={product.fiber} unit="g" index={6} isIndented />
            <NutrientRow label="Total Sugars" value={product.sugar} unit="g" index={7} isIndented />
            <NutrientRow label="Protein" value={product.protein} unit="g" index={8} />
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
              >
                <Text style={styles.viewFullBtnText}>
                  {showFullNutrition ? "HIDE DETAILS" : "VIEW FULL LABEL"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        {product.allergens && product.allergens.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(500).duration(400)}
            style={styles.allergensSection}
          >
            <View style={styles.allergensSectionHeader}>
              <Ionicons name="warning-outline" size={16} color={Colors.danger} />
              <Text style={styles.allergensSectionTitle}>Allergens</Text>
            </View>
            <View style={styles.allergenChips}>
              {product.allergens.map((a: string, i: number) => (
                <View key={i} style={styles.allergenChip}>
                  <Text style={styles.allergenChipText}>{a}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {product.ingredients ? (
          <Animated.View
            entering={FadeInDown.delay(550).duration(400)}
            style={styles.ingredientsSection}
          >
            <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Ingredients</Text>
            <Text style={styles.ingredientsText}>{product.ingredients}</Text>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.scanAnotherWrap}>
          <TouchableOpacity
            style={styles.scanAnotherBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.replace("/(tabs)/scan");
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="scan-outline" size={20} color={Colors.white} />
            <Text style={styles.scanAnotherText}>Scan Another</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.screenBg,
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
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
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
    color: Colors.mediumGray,
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
    color: Colors.charcoal,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "500" as const,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    marginTop: 8,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.white,
  },
  limitCard: {
    backgroundColor: Colors.white,
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
    backgroundColor: Colors.primaryPale,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 20,
  },
  limitTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.charcoal,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  limitSubtitle: {
    fontSize: 15,
    color: Colors.mediumGray,
    textAlign: "center" as const,
    lineHeight: 22,
    marginBottom: 16,
  },
  limitDivider: {
    width: "80%" as any,
    height: 1,
    backgroundColor: Colors.lightGray,
    marginBottom: 16,
  },
  limitHint: {
    fontSize: 14,
    color: Colors.primary,
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
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  limitBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.white,
  },
  reAnalyzedBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginHorizontal: 24,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primaryPale,
  },
  reAnalyzedText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.primary,
    flex: 1,
  },
  allergenBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.danger,
  },
  allergenTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  allergenText: {
    fontSize: 13,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
  scoreSection: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 24,
  },
  headlineText: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.charcoal,
    textAlign: "center",
    letterSpacing: -0.5,
    marginTop: 12,
  },
  productInfoText: {
    fontSize: 14,
    color: Colors.mediumGray,
    textAlign: "center",
    marginTop: 6,
    fontWeight: "400" as const,
  },
  adviceCard: {
    marginHorizontal: 24,
    marginBottom: 28,
    padding: 20,
    borderRadius: 16,
  },
  adviceTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 10,
  },
  adviceTitleText: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 1.2,
  },
  adviceText: {
    fontSize: 14,
    color: Colors.charcoal,
    lineHeight: 22,
  },
  coachTipRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
  },
  coachTipText: {
    fontSize: 13,
    color: Colors.charcoal,
    lineHeight: 20,
    flex: 1,
    fontStyle: "italic" as const,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.charcoal,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  highlightsSection: {
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  highlightsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  highlightCard: {
    width: "47%" as any,
    borderRadius: 14,
    padding: 14,
    minHeight: 100,
  },
  highlightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 10,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    lineHeight: 18,
    marginBottom: 3,
  },
  highlightSubtitle: {
    fontSize: 12,
    fontWeight: "500" as const,
  },
  nutritionSection: {
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  servingLabel: {
    fontSize: 13,
    color: Colors.mediumGray,
    marginTop: -10,
    marginBottom: 12,
  },
  nutritionTable: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E8E8E8",
  },
  nutrientRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8E8E8",
  },
  nutrientRowIndented: {
    paddingLeft: 16,
  },
  nutrientLabel: {
    fontSize: 15,
    color: Colors.charcoal,
    fontWeight: "500" as const,
  },
  nutrientLabelIndented: {
    color: Colors.mediumGray,
    fontWeight: "400" as const,
  },
  nutrientValue: {
    fontSize: 15,
    color: Colors.charcoal,
    fontWeight: "500" as const,
  },
  nutrientUnit: {
    fontSize: 15,
    fontWeight: "400" as const,
    color: Colors.mediumGray,
  },
  viewFullBtn: {
    alignItems: "center" as const,
    paddingVertical: 16,
  },
  viewFullBtnText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  allergensSection: {
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  allergensSectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 12,
  },
  allergensSectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.danger,
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
    backgroundColor: Colors.dangerPale,
  },
  allergenChipText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.danger,
    textTransform: "capitalize" as const,
  },
  ingredientsSection: {
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  ingredientsText: {
    fontSize: 14,
    color: Colors.mediumGray,
    lineHeight: 22,
  },
  scanAnotherWrap: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  scanAnotherBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 28,
  },
  scanAnotherText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
});
