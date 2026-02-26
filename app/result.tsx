import { useEffect, useState, useRef } from "react";
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
import { X, ShareNetwork, ArrowLeft, Lock, WarningCircle, Warning, ShieldWarning, Robot, Barcode, ArrowsClockwise, CaretRight } from "phosphor-react-native";
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
import Colors, { C, cardShadow, coloredShadow } from "@/constants/colors";
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

const GAUGE_SIZE = 200;
const STROKE_WIDTH = 16;
const GLOW_STROKE_WIDTH = 28;
const RADIUS = (GAUGE_SIZE - GLOW_STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getScoreColor(score: number, isAllergenAlert: boolean): string {
  if (isAllergenAlert) return C.danger;
  if (score <= 15) return C.darkRed;
  if (score <= 35) return C.danger;
  if (score <= 50) return C.amber;
  if (score <= 74) return C.tealScore;
  return C.green;
}

function getScoreGradient(score: number, isAllergenAlert: boolean): [string, string] {
  if (isAllergenAlert) return ["#E53935", "#C62828"];
  if (score <= 15) return ["#D32F2F", "#B71C1C"];
  if (score <= 35) return ["#EF5350", "#C62828"];
  if (score <= 50) return ["#FFA726", "#EF6C00"];
  if (score <= 74) return ["#2EC4B6", "#26A69A"];
  return ["#3DD68C", "#2EC4B6"];
}

function getScoreTrackColor(score: number, isAllergenAlert: boolean): string {
  return "#F0F0F0";
}

function getScoreBg(score: number, isAllergenAlert: boolean): string {
  if (isAllergenAlert) return "#FFF5F5";
  if (score <= 35) return "#FFF8F8";
  if (score <= 50) return "#FFFBF5";
  return "#F2FAF6";
}

function getAdviceBorderColor(score: number, isAllergenAlert: boolean): string {
  if (isAllergenAlert) return "#FFCDD2";
  if (score <= 35) return "#FFCDD2";
  if (score <= 50) return "#FFE0B2";
  return "#D4F0E0";
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
  if (isAllergenAlert) return C.danger;
  if (score <= 35) return C.danger;
  const headlineLower = (headline || "").toLowerCase();
  const isCautionaryHeadline = CAUTION_WORDS.some(w => headlineLower.includes(w));
  if (isCautionaryHeadline) return C.amber;

  if (adviceText && score <= 70) {
    const adviceLower = adviceText.toLowerCase();
    const conditionConcerns = [
      "diabetes", "blood sugar", "cholesterol", "carbs",
      "keep an eye", "watch out", "be careful", "not ideal",
      "concern", "tricky", "affects your", "spike",
      "could affect", "could impact",
    ];
    const hasConcern = conditionConcerns.some(w => adviceLower.includes(w));
    if (hasConcern) return C.amber;
  }

  return C.text;
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

function getHighlightDotColor(severity: "warning" | "neutral" | "positive", tierColor: string): string {
  if (severity === "warning") return C.amber;
  if (severity === "positive") return C.green;
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

function getNutrientBarColor(key: string, value: number): string {
  const dailyVal = DAILY_VALUES[key];
  if (!dailyVal) return C.green;
  const pct = value / dailyVal;
  if (pct > 0.4) return C.danger;
  if (pct > 0.2) return C.amber;
  return C.green;
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
  const trackColor = getScoreTrackColor(score, isAllergenAlert);

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
          opacity={0.12}
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
          {isAllergenAlert ? "DANGER" : score <= 15 ? "AVOID" : score <= 35 ? "RISKY" : score <= 50 ? "FAIR" : score <= 74 ? "GOOD" : "GREAT"}
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
    fontSize: 54,
    fontWeight: "900" as const,
    letterSpacing: -2,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    marginTop: 4,
    letterSpacing: 1.8,
    textTransform: "uppercase" as const,
  },
});

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

  const barColor = nutrientKey ? getNutrientBarColor(nutrientKey, value) : C.green;
  const dailyVal = nutrientKey ? DAILY_VALUES[nutrientKey] : undefined;
  const barPct = dailyVal ? Math.min(value / dailyVal, 1) : 0;

  return (
    <View style={styles.nutrientRow}>
      <View style={styles.nutrientRowTop}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: isIndented ? ("400" as const) : ("600" as const),
            color: C.text,
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
            color: C.text,
          }}
        >
          {formatNutrientValue(value)}
          <Text style={{ fontSize: 12, fontWeight: "400" as const, color: C.muted }}>{unit ? ` ${unit}` : ""}</Text>
        </Text>
      </View>
      {dailyVal && barPct > 0 && (
        <View style={styles.nutrientBarTrack}>
          <View style={[styles.nutrientBarFill, { width: `${barPct * 100}%` as any, backgroundColor: barColor }]} />
        </View>
      )}
    </View>
  );
}

function HighlightItem({ text, index, tierColor }: { text: string; index: number; tierColor: string }) {
  const severity = getHighlightSeverity(text);
  const dotColor = getHighlightDotColor(severity, tierColor);

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
    if (score <= 15) return "Strongly Avoid";
    if (score <= 35) return "High Risk";
    if (score <= 50) return "Consume with Caution";
    if (score <= 74) return "Generally Good";
    return "Excellent Fit";
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <MotiView
          from={{ opacity: 0.4 }}
          animate={{ opacity: 0.9 }}
          transition={{ loop: true, type: "timing", duration: 850 }}
          style={{ width: 200, height: 200, borderRadius: 100, backgroundColor: "#EBEBEB" }}
        />
        <MotiView
          from={{ opacity: 0.4 }}
          animate={{ opacity: 0.9 }}
          transition={{ loop: true, type: "timing", duration: 850 }}
          style={{ width: 180, height: 20, borderRadius: 10, backgroundColor: "#EBEBEB", marginTop: 20 }}
        />
        <MotiView
          from={{ opacity: 0.4 }}
          animate={{ opacity: 0.9 }}
          transition={{ loop: true, type: "timing", duration: 850 }}
          style={{ width: 120, height: 14, borderRadius: 7, backgroundColor: "#EBEBEB", marginTop: 10 }}
        />
        <Text style={styles.loadingText}>{params.historyId ? "Checking for profile updates..." : "Analyzing for your profile..."}</Text>
      </View>
    );
  }

  if (showLimitModal) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={22} color={C.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.limitCard}>
          <View style={styles.limitIconWrap}>
            <Lock size={36} color={C.primary} />
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
            <ArrowLeft size={18} color="white" />
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
            <X size={22} color={C.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorState}>
          <WarningCircle size={48} color={C.amber} />
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
  const headlineColor = getHeadlineColor(data.score, data.isAllergenAlert, headlineText, data.advice);

  const hasAdditionalNutrition = product.nutritionFacts && Object.keys(product.nutritionFacts).filter(
    (k) => product.nutritionFacts[k] !== null && product.nutritionFacts[k] !== undefined
  ).length > 0;

  if (data.isAllergenAlert) {
    return (
      <View style={[styles.container, { backgroundColor: C.dangerBg }]}>
        <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={22} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
            <ShareNetwork size={20} color={C.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={["#E53935", "#C62828"]}
            style={styles.allergenTopBanner}
          >
            <Warning size={22} color="white" weight="fill" />
            <Text style={styles.allergenTopBannerText}>
              Allergen Alert — Contains: {data.matchedAllergens.join(", ")}
            </Text>
          </LinearGradient>

          <View style={styles.allergenCenterContent}>
            <MotiView
              from={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" as const, damping: 10, delay: 200 }}
              style={styles.allergenIconWrap}
            >
              <ShieldWarning size={90} color={C.danger} weight="fill" />
            </MotiView>

            <Text style={styles.allergenAlertLabel}>ALLERGEN ALERT</Text>
            <Text style={styles.allergenContainsText}>
              Contains {data.matchedAllergens.join(", ")}
            </Text>
            <Text style={styles.allergenNotSafe}>Not safe for you</Text>
          </View>

          <View style={styles.allergenScoreWrap}>
            <View style={[styles.scoreRingContainer, { ...cardShadow("medium") }]}>
              <ScoreRing score={data.score} isAllergenAlert={data.isAllergenAlert} />
            </View>
          </View>

          <View style={styles.allergenProductInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            {product.brand ? <Text style={styles.productBrand}>{product.brand}</Text> : null}
            <View style={styles.chipRow}>
              {product.category ? (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{product.category}</Text>
                </View>
              ) : null}
              {params.accessMethod ? (
                <View style={styles.chipNeutral}>
                  <Text style={styles.chipNeutralText}>
                    {params.accessMethod === "scan" ? "Scanned" : "Searched"}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {data.advice ? (
            <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.adviceCard}>
              <View style={styles.adviceHeader}>
                <LinearGradient
                  colors={[C.tinted, "#D4EDDA"]}
                  style={styles.adviceIconBox}
                >
                  <Robot size={16} color={C.primary} weight="fill" />
                </LinearGradient>
                <Text style={styles.adviceLabel}>FOODVAR VERDICT</Text>
              </View>
              <View style={styles.adviceDivider} />
              <Text style={[styles.adviceHeadline, { color: scoreColor }]}>{headlineText}</Text>
              <Text style={styles.adviceText}>{data.advice}</Text>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.scanAnotherWrap}>
            <LinearGradient
              colors={["#3DD68C", "#2E7D32"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scanAnotherGradient}
            >
              <TouchableOpacity
                style={styles.scanAnotherInner}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.replace("/(tabs)/scan");
                }}
                activeOpacity={0.85}
              >
                <Barcode size={20} color="white" weight="bold" />
                <Text style={styles.scanAnotherText}>Scan Another</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <X size={22} color={C.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <ShareNetwork size={20} color={C.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {reAnalyzed && (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.reAnalyzedBanner}
          >
            <ArrowsClockwise size={18} color={C.primary} />
            <Text style={styles.reAnalyzedText}>
              Updated for your latest health profile
            </Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(500)}>
          <View style={[styles.scoreRingContainer, { ...cardShadow("medium") }]}>
            <ScoreRing
              score={data.score}
              isAllergenAlert={data.isAllergenAlert}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.productInfoSection}>
          <Text style={styles.productName}>{product.name}</Text>
          {product.brand ? <Text style={styles.productBrand}>{product.brand}</Text> : null}
          <View style={styles.chipRow}>
            {product.category ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{product.category}</Text>
              </View>
            ) : null}
            {params.accessMethod ? (
              <View style={styles.chipNeutral}>
                <Text style={styles.chipNeutralText}>
                  {params.accessMethod === "scan" ? "Scanned" : "Searched"}
                </Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {data.advice ? (
          <Animated.View
            entering={FadeInDown.delay(250).duration(400)}
            style={styles.adviceCard}
          >
            <View style={styles.adviceHeader}>
              <LinearGradient
                colors={[C.tinted, "#D4EDDA"]}
                style={styles.adviceIconBox}
              >
                <Robot size={16} color={C.primary} weight="fill" />
              </LinearGradient>
              <Text style={styles.adviceLabel}>FOODVAR VERDICT</Text>
            </View>
            <View style={styles.adviceDivider} />
            <Text style={[styles.adviceHeadline, { color: headlineColor }]}>{headlineText}</Text>
            <Text style={styles.adviceText}>{data.advice}</Text>

            {data.coachTip ? (
              <View style={styles.coachTipRow}>
                <View style={styles.coachTipDot} />
                <Text style={styles.coachTipText}>{data.coachTip}</Text>
              </View>
            ) : null}

            {data.highlights && data.highlights.length > 0 && (() => {
              const vaguePatterns = [
                /^contains\s/i,
                /^critical\s?allergen/i,
                /^not\s?suitable/i,
                /^check\s?allergen/i,
                /^allergen/i,
                /^avoid/i,
                /^warning/i,
                /^caution/i,
                /^unsafe/i,
                /^dangerous/i,
              ];
              const filtered = data.highlights.filter((h: string) =>
                !vaguePatterns.some(p => p.test(h.trim()))
              );
              return filtered.length > 0 ? (
                <View style={styles.highlightsInAdvice}>
                  {filtered.map((h: string, i: number) => (
                    <HighlightItem key={i} text={h} index={i} tierColor={scoreColor} />
                  ))}
                </View>
              ) : null;
            })()}
          </Animated.View>
        ) : null}

        <Animated.View
          entering={FadeInDown.delay(450).duration(400)}
          style={styles.nutritionSection}
        >
          <View style={styles.nutritionCard}>
            <View style={styles.nutritionHeader}>
              <Text style={styles.nutritionTitle}>Nutrition Facts</Text>
              {product.servingSize ? (
                <Text style={styles.servingLabel}>Per {product.servingSize}</Text>
              ) : null}
            </View>
            <View style={styles.nutritionTable}>
              <NutrientRow label="Calories" value={product.calories} unit="" index={0} nutrientKey="calories" />
              <NutrientRow label="Total Fat" value={product.fat} unit="g" index={1} nutrientKey="fat" />
              <NutrientRow label="Saturated Fat" value={product.saturatedFat} unit="g" index={2} isIndented nutrientKey="saturatedFat" />
              <NutrientRow label="Cholesterol" value={product.nutritionFacts?.cholesterol ?? null} unit="mg" index={3} />
              <NutrientRow label="Sodium" value={product.sodium} unit="mg" index={4} nutrientKey="sodium" />
              <NutrientRow label="Total Carbohydrate" value={product.carbohydrates} unit="g" index={5} nutrientKey="carbohydrates" />
              <NutrientRow label="Dietary Fiber" value={product.fiber} unit="g" index={6} isIndented nutrientKey="fiber" />
              <NutrientRow label="Total Sugars" value={product.sugar} unit="g" index={7} isIndented nutrientKey="sugar" />
              <NutrientRow label="Protein" value={product.protein} unit="g" index={8} nutrientKey="protein" />
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
          </View>
        </Animated.View>

        {product.allergens && product.allergens.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(500).duration(400)}
            style={styles.allergensSection}
          >
            <View style={styles.allergensSectionHeader}>
              <Warning size={16} color={C.danger} weight="fill" />
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
          <LinearGradient
            colors={["#3DD68C", "#2E7D32"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.scanAnotherGradient}
          >
            <TouchableOpacity
              style={styles.scanAnotherInner}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.replace("/(tabs)/scan");
              }}
              activeOpacity={0.85}
            >
              <Barcode size={20} color="white" weight="bold" />
              <Text style={styles.scanAnotherText}>Scan Another</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
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
    color: C.muted,
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
    color: C.text,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "500" as const,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: C.primary,
    marginTop: 8,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "white",
  },
  limitCard: {
    backgroundColor: C.card,
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
    backgroundColor: C.tinted,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 20,
  },
  limitTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: C.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  limitSubtitle: {
    fontSize: 15,
    color: C.muted,
    textAlign: "center" as const,
    lineHeight: 22,
    marginBottom: 16,
  },
  limitDivider: {
    width: "80%" as any,
    height: 1,
    backgroundColor: C.divider,
    marginBottom: 16,
  },
  limitHint: {
    fontSize: 14,
    color: C.primary,
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
    backgroundColor: C.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  limitBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "white",
  },
  reAnalyzedBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.tinted,
  },
  reAnalyzedText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: C.primary,
    flex: 1,
  },
  scoreRingContainer: {
    backgroundColor: C.card,
    borderRadius: 28,
    padding: 28,
    marginHorizontal: 20,
    marginTop: 16,
    alignItems: "center" as const,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  productInfoSection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  productName: {
    fontSize: 22,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
    color: C.text,
  },
  productBrand: {
    fontSize: 14,
    color: C.muted,
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
    backgroundColor: C.tinted,
  },
  chipText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  chipNeutral: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  chipNeutralText: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  adviceCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 18,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.border,
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
    color: C.primary,
    textTransform: "uppercase" as const,
  },
  adviceDivider: {
    height: 0.5,
    backgroundColor: C.divider,
    marginBottom: 12,
  },
  adviceHeadline: {
    fontSize: 16,
    fontWeight: "700" as const,
    marginBottom: 8,
  },
  adviceText: {
    fontSize: 14,
    color: C.text,
    lineHeight: 23,
  },
  coachTipRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.divider,
  },
  coachTipDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: C.amber,
    marginTop: 5,
  },
  coachTipText: {
    fontSize: 13,
    color: C.muted,
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
    backgroundColor: C.bg,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  highlightDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginTop: 5,
  },
  highlightText: {
    fontSize: 13,
    color: C.text,
    lineHeight: 20,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: C.text,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  nutritionSection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  nutritionCard: {
    borderRadius: 20,
    overflow: "hidden" as const,
    borderWidth: 0.5,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  nutritionHeader: {
    backgroundColor: C.text,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  nutritionTitle: {
    fontSize: 17,
    fontWeight: "900" as const,
    color: "white",
  },
  servingLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  nutritionTable: {
    paddingHorizontal: 16,
  },
  nutrientRow: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: C.divider,
  },
  nutrientRowTop: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  nutrientBarTrack: {
    height: 3,
    borderRadius: 999,
    backgroundColor: C.bg,
    marginTop: 6,
  },
  nutrientBarFill: {
    height: 3,
    borderRadius: 999,
  },
  viewFullBtn: {
    alignItems: "center" as const,
    paddingVertical: 14,
    borderTopWidth: 0.5,
    borderTopColor: C.divider,
  },
  viewFullBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: C.tealScore,
    letterSpacing: 0.5,
  },
  allergensSection: {
    paddingHorizontal: 20,
    marginTop: 16,
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
    color: C.danger,
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
    backgroundColor: C.dangerBg,
  },
  allergenChipText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: C.danger,
    textTransform: "capitalize" as const,
  },
  ingredientsSection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  ingredientsText: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 22,
  },
  scanAnotherWrap: {
    paddingHorizontal: 20,
    marginBottom: 8,
    marginTop: 20,
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
    color: "white",
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
    color: "white",
    flex: 1,
  },
  allergenCenterContent: {
    alignItems: "center" as const,
    paddingHorizontal: 20,
  },
  allergenIconWrap: {
    marginTop: 40,
  },
  allergenAlertLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: C.danger,
    letterSpacing: 1.5,
    marginTop: 16,
  },
  allergenContainsText: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: C.text,
    marginTop: 8,
    textAlign: "center" as const,
  },
  allergenNotSafe: {
    fontSize: 15,
    color: C.muted,
    marginTop: 4,
  },
  allergenScoreWrap: {
    marginTop: 24,
  },
  allergenProductInfo: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
});
