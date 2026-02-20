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
import Colors from "@/constants/colors";
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
const STROKE_WIDTH = 10;
const RADIUS = (GAUGE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CATEGORY_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  snacks: { icon: "cafe-outline", color: "#E65100", bg: "#FFF3E0" },
  beverages: { icon: "water-outline", color: "#0277BD", bg: "#E1F5FE" },
  dairy: { icon: "snow-outline", color: "#6A1B9A", bg: "#F3E5F5" },
  bakery: { icon: "pizza-outline", color: "#BF360C", bg: "#FBE9E7" },
  cereal: { icon: "sunny-outline", color: "#F9A825", bg: "#FFFDE7" },
  grains: { icon: "leaf-outline", color: "#558B2F", bg: "#F1F8E9" },
  meat: { icon: "flame-outline", color: "#C62828", bg: "#FFEBEE" },
  seafood: { icon: "fish-outline", color: "#00838F", bg: "#E0F7FA" },
  fruits: { icon: "nutrition-outline", color: "#AD1457", bg: "#FCE4EC" },
  vegetables: { icon: "leaf-outline", color: "#2E7D32", bg: "#E8F5E9" },
  frozen: { icon: "snow-outline", color: "#1565C0", bg: "#E3F2FD" },
  condiments: { icon: "color-fill-outline", color: "#EF6C00", bg: "#FFF3E0" },
  sauces: { icon: "color-fill-outline", color: "#EF6C00", bg: "#FFF3E0" },
  pasta: { icon: "restaurant-outline", color: "#D84315", bg: "#FBE9E7" },
  noodles: { icon: "restaurant-outline", color: "#D84315", bg: "#FBE9E7" },
  candy: { icon: "heart-outline", color: "#C2185B", bg: "#FCE4EC" },
  chocolate: { icon: "heart-outline", color: "#4E342E", bg: "#EFEBE9" },
  supplements: { icon: "medkit-outline", color: "#00695C", bg: "#E0F2F1" },
  spreads: { icon: "layers-outline", color: "#F57F17", bg: "#FFFDE7" },
  oils: { icon: "water-outline", color: "#827717", bg: "#F9FBE7" },
  default: { icon: "cube-outline", color: Colors.primary, bg: Colors.primaryPale },
};

function getCategoryConfig(category?: string): { icon: string; color: string; bg: string } {
  if (!category) return CATEGORY_ICONS.default;
  const key = category.toLowerCase().trim();
  for (const [k, v] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return CATEGORY_ICONS.default;
}

function getScoreColor(score: number, isAllergenAlert: boolean): string {
  if (isAllergenAlert) return Colors.danger;
  if (score <= 30) return Colors.scoreRed;
  if (score <= 60) return Colors.scoreAmber;
  return Colors.scoreGreen;
}

function getScoreGradient(score: number, isAllergenAlert: boolean): [string, string] {
  if (isAllergenAlert) return ["#E53935", "#C62828"];
  if (score <= 30) return ["#EF5350", "#C62828"];
  if (score <= 60) return ["#FFA726", "#EF6C00"];
  return ["#66BB6A", "#2E7D32"];
}

function getScoreColorLight(score: number, isAllergenAlert: boolean): string {
  if (isAllergenAlert) return "#FFEBEE";
  if (score <= 30) return "#FFF0F0";
  if (score <= 60) return "#FFF8F0";
  return "#F0FFF0";
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
    "good", "great", "rich", "high fiber", "high protein",
    "vitamin", "healthy", "natural", "organic", "excellent",
    "decent", "solid", "beneficial", "low calorie", "low sugar",
    "low sodium", "low fat", "zero sugar", "zero sodium",
    "very low", "no sugar", "no sodium", "minimal",
    "source of", "plenty", "balanced",
  ];
  if (positivePatterns.some(w => lower.includes(w))) return "positive";
  const warningWords = ["high", "sugar", "sodium", "fat", "low protein", "calorie", "excess", "added", "low fiber"];
  if (warningWords.some(w => lower.includes(w))) return "warning";
  return "neutral";
}

function getHighlightStyle(severity: "warning" | "neutral" | "positive"): { bg: string; color: string; icon: string } {
  if (severity === "warning") return { bg: "#FFF3E0", color: "#E65100", icon: "alert-circle" };
  if (severity === "positive") return { bg: "#E8F5E9", color: "#2E7D32", icon: "checkmark-circle" };
  return { bg: "#F5F5F5", color: Colors.mediumGray, icon: "information-circle" };
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
  const bgCircleColor = getScoreColorLight(score, isAllergenAlert);

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
      <View style={[ringStyles.glowOuter, { backgroundColor: scoreColor + "10", shadowColor: scoreColor }]} />
      <View style={[ringStyles.glowInner, { backgroundColor: scoreColor + "08" }]} />

      <Svg width={GAUGE_SIZE} height={GAUGE_SIZE} style={ringStyles.svg}>
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
          stroke={scoreColor + "15"}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <Circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={RADIUS}
          stroke="url(#scoreGrad)"
          strokeWidth={STROKE_WIDTH + 2}
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
        <Text style={[ringStyles.scoreLabel, { color: scoreColor + "90" }]}>
          {score <= 30 ? "poor" : score <= 60 ? "fair" : score <= 80 ? "good" : "great"}
        </Text>
      </View>
    </Animated.View>
  );
}

const ringStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  glowOuter: {
    position: "absolute",
    width: GAUGE_SIZE + 60,
    height: GAUGE_SIZE + 60,
    borderRadius: (GAUGE_SIZE + 60) / 2,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 40,
      },
      android: { elevation: 0 },
      web: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 40,
      },
    }),
  },
  glowInner: {
    position: "absolute",
    width: GAUGE_SIZE + 20,
    height: GAUGE_SIZE + 20,
    borderRadius: (GAUGE_SIZE + 20) / 2,
  },
  svg: {
    transform: [{ rotate: "0deg" }],
  },
  scoreCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: "800" as const,
    letterSpacing: -3,
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
    marginTop: -2,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
});

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

function NutrientRow({
  label,
  value,
  unit,
  index,
  dailyValueKey,
}: {
  label: string;
  value: number | null;
  unit: string;
  index: number;
  dailyValueKey?: string;
}) {
  if (value === null || value === undefined) return null;

  const dvKey = dailyValueKey || label.toLowerCase().replace(/\s/g, "").replace("sat.fat", "saturatedFat");
  const dailyValue = DAILY_VALUES[dvKey];
  const dvPercent = dailyValue ? Math.min((value / dailyValue) * 100, 100) : 0;
  const dvColor = dvPercent > 75 ? Colors.scoreRed : dvPercent > 40 ? Colors.scoreAmber : Colors.scoreGreen;

  return (
    <Animated.View
      entering={FadeInDown.delay(600 + index * 60).duration(300)}
      style={styles.nutrientRow}
    >
      <Text style={styles.nutrientLabel}>{label}</Text>
      <View style={styles.nutrientRight}>
        {dailyValue ? (
          <View style={styles.nutrientBarWrap}>
            <View style={styles.nutrientBarTrack}>
              <View
                style={[
                  styles.nutrientBarFill,
                  { width: `${Math.max(dvPercent, 2)}%`, backgroundColor: dvColor },
                ]}
              />
            </View>
          </View>
        ) : null}
        <Text style={[styles.nutrientValue, dailyValue && dvPercent > 60 ? { color: dvColor } : null]}>
          {formatNutrientValue(value)}
          <Text style={styles.nutrientUnit}>{unit}</Text>
        </Text>
      </View>
    </Animated.View>
  );
}

function CategoryIcon({ category }: { category?: string }) {
  const config = getCategoryConfig(category);
  return (
    <View style={[styles.categoryIconWrap, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon as any} size={28} color={config.color} />
    </View>
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
            <Ionicons name="close" size={24} color={Colors.charcoal} />
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
            <Ionicons name="close" size={24} color={Colors.charcoal} />
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
  const headlineColor = getHeadlineColor(data.score, data.isAllergenAlert, headlineText, data.advice);

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
          paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {data.isAllergenAlert && (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.allergenBanner}
          >
            <Ionicons name="warning" size={24} color={Colors.white} />
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
            <Ionicons name="refresh-circle" size={20} color={Colors.primary} />
            <Text style={styles.reAnalyzedText}>
              Updated for your latest health profile
            </Text>
          </Animated.View>
        )}

        <LinearGradient
          colors={[getScoreColorLight(data.score, data.isAllergenAlert), "#F6F8F600"]}
          style={styles.heroGradient}
        >
          <Animated.View entering={FadeInDown.duration(400)} style={styles.productHeader}>
            <CategoryIcon category={product.category} />
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productBrand}>
              {product.brand || "Unknown Brand"}
              {product.category ? ` · ${product.category}` : ""}
            </Text>
          </Animated.View>

          <ScoreRing
            score={data.score}
            isAllergenAlert={data.isAllergenAlert}
          />

          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            style={styles.headlineWrap}
          >
            <View style={[styles.headlinePill, { backgroundColor: scoreColor + "12", borderColor: scoreColor + "25" }]}>
              <Ionicons
                name={data.score > 60 ? "checkmark-circle" : data.score > 30 ? "alert-circle" : "close-circle"}
                size={16}
                color={headlineColor}
              />
              <Text style={[styles.headlineText, { color: headlineColor }]}>
                {headlineText}
              </Text>
            </View>
          </Animated.View>
        </LinearGradient>

        {data.advice ? (
          <Animated.View
            entering={FadeInDown.delay(350).duration(400)}
            style={styles.adviceCard}
          >
            <View style={styles.adviceTitleRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.primary} />
              <Text style={styles.adviceTitleText}>What this means for you</Text>
            </View>
            <Text style={styles.adviceText}>{data.advice}</Text>

            {data.coachTip ? (
              <View style={[styles.coachTipCard, { backgroundColor: getScoreColorLight(data.score, data.isAllergenAlert), borderColor: scoreColor + "20" }]}>
                <View style={styles.coachTipHeader}>
                  <Ionicons name="bulb-outline" size={15} color={scoreColor} />
                  <Text style={[styles.coachTipLabel, { color: scoreColor }]}>Quick tip</Text>
                </View>
                <Text style={styles.coachTipText}>{data.coachTip}</Text>
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        {data.highlights && data.highlights.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(450).duration(400)}
            style={styles.highlightsCard}
          >
            <View style={styles.sectionTitleRow}>
              <Ionicons name="flag-outline" size={15} color={Colors.primary} />
              <Text style={styles.sectionTitleText}>Key Highlights</Text>
            </View>
            {data.highlights.map((h: string, i: number) => {
              const severity = getHighlightSeverity(h);
              const hs = getHighlightStyle(severity);
              return (
                <View key={i} style={[styles.highlightRow, i < data.highlights.length - 1 && styles.highlightRowBorder]}>
                  <View style={[styles.highlightIconWrap, { backgroundColor: hs.bg }]}>
                    <Ionicons name={hs.icon as any} size={14} color={hs.color} />
                  </View>
                  <Text style={[styles.highlightText, { color: hs.color }]}>{h}</Text>
                </View>
              );
            })}
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.delay(500).duration(400)}
          style={styles.nutritionCard}
        >
          <View style={styles.nutritionTitleRow}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="nutrition-outline" size={15} color={Colors.primary} />
              <Text style={styles.sectionTitleText}>Nutrition Facts</Text>
            </View>
            {product.servingSize ? (
              <Text style={styles.servingSizeLabel}>per {product.servingSize}</Text>
            ) : null}
          </View>
          <View style={styles.nutritionGrid}>
            <NutrientRow label="Calories" value={product.calories} unit="" index={0} dailyValueKey="calories" />
            <NutrientRow label="Protein" value={product.protein} unit="g" index={1} dailyValueKey="protein" />
            <NutrientRow label="Carbs" value={product.carbohydrates} unit="g" index={2} dailyValueKey="carbohydrates" />
            <NutrientRow label="Sugar" value={product.sugar} unit="g" index={3} dailyValueKey="sugar" />
            <NutrientRow label="Fat" value={product.fat} unit="g" index={4} dailyValueKey="fat" />
            <NutrientRow label="Sat. Fat" value={product.saturatedFat} unit="g" index={5} dailyValueKey="saturatedFat" />
            <NutrientRow label="Fiber" value={product.fiber} unit="g" index={6} dailyValueKey="fiber" />
            <NutrientRow label="Sodium" value={product.sodium} unit="mg" index={7} dailyValueKey="sodium" />
          </View>
        </Animated.View>

        {product.nutritionFacts && Object.keys(product.nutritionFacts).filter(
          (k) => product.nutritionFacts[k] !== null && product.nutritionFacts[k] !== undefined
        ).length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(550).duration(400)}
            style={styles.nutritionCard}
          >
            <Text style={styles.nutritionTitle}>Additional Nutrition</Text>
            <View style={styles.nutritionGrid}>
              {Object.entries(product.nutritionFacts)
                .filter(([_, v]) => v !== null && v !== undefined && typeof v === "number")
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
          </Animated.View>
        )}

        {product.allergens && product.allergens.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(600).duration(400)}
            style={styles.allergensCard}
          >
            <View style={styles.allergensHeader}>
              <Ionicons name="warning-outline" size={16} color={Colors.danger} />
              <Text style={styles.allergensTitle}>Allergens</Text>
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
            entering={FadeInDown.delay(650).duration(400)}
            style={styles.ingredientsCard}
          >
            <View style={styles.ingredientsHeader}>
              <Ionicons name="list-outline" size={16} color={Colors.primary} />
              <Text style={styles.ingredientsTitle}>Ingredients</Text>
            </View>
            <Text style={styles.ingredientsText}>{product.ingredients}</Text>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(700).duration(400)} style={styles.scanAnotherWrap}>
          <TouchableOpacity
            style={styles.scanAnotherBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.replace("/(tabs)/scan");
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.primary, "#1B5E20"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scanAnotherGradient}
            >
              <Ionicons name="scan-outline" size={18} color={Colors.white} />
              <Text style={styles.scanAnotherText}>Scan Another</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F8F6",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
      web: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
    }),
  },
  shareBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.white,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
      web: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
    }),
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
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
      web: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
    }),
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
    marginHorizontal: 20,
    marginBottom: 12,
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
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.danger,
  },
  allergenTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  allergenText: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
  heroGradient: {
    paddingBottom: 8,
  },
  categoryIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 10,
  },
  productHeader: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 0,
    paddingTop: 4,
  },
  productName: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.charcoal,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  productBrand: {
    fontSize: 13,
    color: Colors.mediumGray,
    marginTop: 4,
    fontWeight: "500" as const,
    letterSpacing: 0.2,
  },
  headlineWrap: {
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  headlinePill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  headlineText: {
    fontSize: 14,
    fontWeight: "700" as const,
    textAlign: "center",
    letterSpacing: -0.1,
  },
  sectionTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 12,
  },
  sectionTitleText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.charcoal,
    letterSpacing: -0.1,
  },
  adviceCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: Colors.white,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
      web: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
    }),
  },
  adviceTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 10,
  },
  adviceTitleText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.charcoal,
    letterSpacing: -0.1,
  },
  adviceText: {
    fontSize: 14,
    color: "#444444",
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  coachTipCard: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  coachTipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  coachTipLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
  },
  coachTipText: {
    fontSize: 13,
    color: "#444444",
    lineHeight: 20,
  },
  highlightsCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    paddingTop: 18,
    borderRadius: 20,
    backgroundColor: Colors.white,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
      web: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
    }),
  },
  highlightRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 9,
  },
  highlightRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EEEEEE",
  },
  highlightIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  highlightText: {
    fontSize: 13,
    fontWeight: "600" as const,
    flex: 1,
  },
  nutritionCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: Colors.white,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
      web: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
    }),
  },
  nutritionTitleRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 4,
  },
  servingSizeLabel: {
    fontSize: 12,
    color: Colors.mediumGray,
    fontWeight: "500" as const,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  nutritionTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.charcoal,
    marginBottom: 14,
  },
  nutritionGrid: {
    gap: 0,
  },
  nutrientRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0F0F0",
  },
  nutrientRight: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  nutrientLabel: {
    fontSize: 14,
    color: "#555555",
    fontWeight: "500" as const,
    flex: 1,
  },
  nutrientBarWrap: {
    width: 60,
  },
  nutrientBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#F0F0F0",
    overflow: "hidden" as const,
  },
  nutrientBarFill: {
    height: 4,
    borderRadius: 2,
  },
  nutrientValue: {
    fontSize: 14,
    color: Colors.charcoal,
    fontWeight: "700" as const,
    minWidth: 40,
    textAlign: "right" as const,
  },
  nutrientUnit: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.mediumGray,
  },
  allergensCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.dangerPale,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
      web: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
    }),
  },
  allergensHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  allergensTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.danger,
  },
  allergenChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  allergenChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.dangerPale,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  allergenChipText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.danger,
    textTransform: "capitalize" as const,
  },
  ingredientsCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primaryPale,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
      web: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
    }),
  },
  ingredientsHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 10,
  },
  ingredientsTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  ingredientsText: {
    fontSize: 13,
    color: Colors.charcoal,
    lineHeight: 20,
  },
  scanAnotherWrap: {
    paddingHorizontal: 40,
    marginTop: 12,
    marginBottom: 16,
    alignItems: "center" as const,
  },
  scanAnotherBtn: {
    borderRadius: 24,
    overflow: "hidden" as const,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
      web: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
    }),
  },
  scanAnotherGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  scanAnotherText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.white,
    letterSpacing: 0.2,
  },
});
