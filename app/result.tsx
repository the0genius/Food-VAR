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
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { apiRequest, getApiUrl, queryClient } from "@/lib/query-client";
import { fetch } from "expo/fetch";

interface ScoreData {
  score: number;
  label: string;
  isAllergenAlert: boolean;
  matchedAllergens: string[];
  advice: string;
  highlights: string[];
  product: any;
}

const GAUGE_SIZE = 200;
const DOT_COUNT = 60;
const DOT_RADIUS = 88;
const DOT_SIZE_ACTIVE = 5;
const DOT_SIZE_INACTIVE = 3;

function getScoreColor(score: number, isAllergenAlert: boolean): string {
  if (isAllergenAlert) return Colors.danger;
  if (score <= 30) return Colors.scoreRed;
  if (score <= 60) return Colors.scoreAmber;
  return Colors.scoreGreen;
}

function GaugeDot({
  index,
  totalDots,
  progress,
  scoreColor,
}: {
  index: number;
  totalDots: number;
  progress: Animated.SharedValue<number>;
  scoreColor: string;
}) {
  const angle = (index / totalDots) * 360 - 90;
  const radians = (angle * Math.PI) / 180;
  const x = GAUGE_SIZE / 2 + DOT_RADIUS * Math.cos(radians);
  const y = GAUGE_SIZE / 2 + DOT_RADIUS * Math.sin(radians);
  const dotThreshold = index / totalDots;

  const animatedStyle = useAnimatedStyle(() => {
    const isActive = progress.value >= dotThreshold;
    return {
      width: isActive ? DOT_SIZE_ACTIVE : DOT_SIZE_INACTIVE,
      height: isActive ? DOT_SIZE_ACTIVE : DOT_SIZE_INACTIVE,
      borderRadius: isActive ? DOT_SIZE_ACTIVE / 2 : DOT_SIZE_INACTIVE / 2,
      backgroundColor: isActive ? scoreColor : Colors.lightGray,
      opacity: isActive ? 1 : 0.4,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute" as const,
          left: x - DOT_SIZE_ACTIVE / 2,
          top: y - DOT_SIZE_ACTIVE / 2,
          alignItems: "center" as const,
          justifyContent: "center" as const,
          width: DOT_SIZE_ACTIVE,
          height: DOT_SIZE_ACTIVE,
        },
        animatedStyle,
      ]}
    />
  );
}

function AnimatedScoreText({
  progress,
  score,
  scoreColor,
}: {
  progress: Animated.SharedValue<number>;
  score: number;
  scoreColor: string;
}) {
  const displayScore = useDerivedValue(() => {
    return Math.round(progress.value * score);
  });

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: 1,
  }));

  const [displayedNumber, setDisplayedNumber] = useState(0);

  useEffect(() => {
    let frame: number;
    const startTime = Date.now();
    const duration = 1500;
    const delay = 400;

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

  return (
    <View style={gaugeStyles.scoreTextContainer}>
      <Text style={[gaugeStyles.scoreNumber, { color: scoreColor }]}>
        {displayedNumber}
      </Text>
      <Text style={gaugeStyles.scoreOutOf}>out of 100</Text>
    </View>
  );
}

function ScoreGauge({
  score,
  isAllergenAlert,
}: {
  score: number;
  isAllergenAlert: boolean;
}) {
  const progress = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  const scoreColor = getScoreColor(score, isAllergenAlert);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withSpring(1, { damping: 14, stiffness: 90 });
    progress.value = withDelay(
      400,
      withTiming(score / 100, {
        duration: 1500,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [score]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.3,
    transform: [{ scale: 0.9 + progress.value * 0.1 }],
  }));

  const dots = Array.from({ length: DOT_COUNT }, (_, i) => i);

  return (
    <Animated.View style={[gaugeStyles.container, containerStyle]}>
      <Animated.View
        style={[
          gaugeStyles.glowCircle,
          { backgroundColor: scoreColor },
          glowStyle,
        ]}
      />

      <View style={gaugeStyles.gaugeWrap}>
        <View style={gaugeStyles.innerCircle}>
          <View
            style={[gaugeStyles.innerCircleBorder, { borderColor: scoreColor + "15" }]}
          />
        </View>

        {dots.map((i) => (
          <GaugeDot
            key={i}
            index={i}
            totalDots={DOT_COUNT}
            progress={progress}
            scoreColor={scoreColor}
          />
        ))}

        <AnimatedScoreText
          progress={progress}
          score={score}
          scoreColor={scoreColor}
        />
      </View>
    </Animated.View>
  );
}

const gaugeStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  glowCircle: {
    position: "absolute",
    width: GAUGE_SIZE - 20,
    height: GAUGE_SIZE - 20,
    borderRadius: (GAUGE_SIZE - 20) / 2,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
      },
      android: {
        elevation: 12,
      },
      web: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
      },
    }),
  },
  gaugeWrap: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  innerCircle: {
    position: "absolute",
    width: GAUGE_SIZE - 40,
    height: GAUGE_SIZE - 40,
    borderRadius: (GAUGE_SIZE - 40) / 2,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
    }),
  },
  innerCircleBorder: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: (GAUGE_SIZE - 40) / 2,
    borderWidth: 2,
  },
  scoreTextContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  scoreNumber: {
    fontSize: 52,
    fontWeight: "800",
    letterSpacing: -2,
  },
  scoreOutOf: {
    fontSize: 13,
    color: Colors.mediumGray,
    fontWeight: "600",
    marginTop: -2,
    letterSpacing: 0.5,
  },
});

function NutrientRow({
  label,
  value,
  unit,
  index,
}: {
  label: string;
  value: number | null;
  unit: string;
  index: number;
}) {
  if (value === null || value === undefined) return null;
  return (
    <Animated.View
      entering={FadeInDown.delay(600 + index * 60).duration(300)}
      style={styles.nutrientRow}
    >
      <Text style={styles.nutrientLabel}>{label}</Text>
      <Text style={styles.nutrientValue}>
        {typeof value === "number" ? value.toFixed(1) : value}
        {unit}
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

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      if (params.historyId) {
        const baseUrl = getApiUrl();
        const url = new URL(`/api/history/entry/${params.historyId}`, baseUrl);
        const res = await fetch(url.toString());
        if (res.ok) {
          const entry = await res.json();
          setData({
            score: entry.score,
            label: getLabel(entry.score),
            isAllergenAlert: entry.score === 0,
            matchedAllergens: [],
            advice: entry.adviceText || "",
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
            },
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        setError(
          "You've used all 10 free scans today. Upgrade to Pro for unlimited access!"
        );
      } else {
        setError("Something went wrong. Please try again.");
      }
      console.error(e);
    }
    setLoading(false);
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
        <Text style={styles.loadingText}>Analyzing for your profile...</Text>
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

  return (
    <View style={styles.container}>
      <View
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={Colors.charcoal} />
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

        <Animated.View entering={FadeInDown.duration(400)} style={styles.productHeader}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productBrand}>
            {product.brand || "Unknown Brand"}
            {product.category ? ` \u00B7 ${product.category}` : ""}
          </Text>
        </Animated.View>

        <ScoreGauge
          score={data.score}
          isAllergenAlert={data.isAllergenAlert}
        />

        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.labelWrap}
        >
          <View style={[styles.labelBadge, { backgroundColor: scoreColor }]}>
            <Text style={styles.labelText}>{data.label}</Text>
          </View>
        </Animated.View>

        {data.advice ? (
          <Animated.View
            entering={FadeInDown.delay(400).duration(400)}
            style={styles.adviceCard}
          >
            <View style={styles.adviceHeader}>
              <Ionicons
                name="sparkles"
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.adviceTitle}>Personalized Advice</Text>
            </View>
            <Text style={styles.adviceText}>{data.advice}</Text>

            {data.highlights && data.highlights.length > 0 && (
              <View style={styles.highlightsList}>
                {data.highlights.map((h: string, i: number) => (
                  <View key={i} style={styles.highlightItem}>
                    <View style={styles.highlightDot} />
                    <Text style={styles.highlightText}>{h}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        ) : null}

        <Animated.View
          entering={FadeInDown.delay(500).duration(400)}
          style={styles.nutritionCard}
        >
          <Text style={styles.nutritionTitle}>
            Nutrition Facts
            {product.servingSize ? ` (per ${product.servingSize})` : ""}
          </Text>
          <View style={styles.nutritionGrid}>
            <NutrientRow label="Calories" value={product.calories} unit="" index={0} />
            <NutrientRow label="Protein" value={product.protein} unit="g" index={1} />
            <NutrientRow label="Carbs" value={product.carbohydrates} unit="g" index={2} />
            <NutrientRow label="Sugar" value={product.sugar} unit="g" index={3} />
            <NutrientRow label="Fat" value={product.fat} unit="g" index={4} />
            <NutrientRow label="Sat. Fat" value={product.saturatedFat} unit="g" index={5} />
            <NutrientRow label="Fiber" value={product.fiber} unit="g" index={6} />
            <NutrientRow label="Sodium" value={product.sodium} unit="mg" index={7} />
          </View>
        </Animated.View>

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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softWhite,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
      web: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
    }),
  },
  loadingText: {
    fontSize: 15,
    color: Colors.mediumGray,
    marginTop: 16,
    fontWeight: "500",
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
    fontWeight: "500",
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
    fontWeight: "600",
    color: Colors.white,
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
    fontWeight: "700",
    color: Colors.white,
  },
  allergenText: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
  productHeader: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  productName: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.charcoal,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  productBrand: {
    fontSize: 14,
    color: Colors.mediumGray,
    marginTop: 6,
    fontWeight: "500",
  },
  labelWrap: {
    alignItems: "center",
    marginBottom: 24,
  },
  labelBadge: {
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 20,
  },
  labelText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
    letterSpacing: 0.3,
  },
  adviceCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primaryPale,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      web: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
    }),
  },
  adviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  adviceTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.primary,
  },
  adviceText: {
    fontSize: 14,
    color: Colors.charcoal,
    lineHeight: 22,
  },
  highlightsList: {
    marginTop: 14,
    gap: 8,
  },
  highlightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  highlightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 7,
  },
  highlightText: {
    fontSize: 13,
    color: Colors.charcoal,
    flex: 1,
    lineHeight: 20,
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
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
      web: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
    }),
  },
  nutritionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.charcoal,
    marginBottom: 14,
  },
  nutritionGrid: {
    gap: 0,
  },
  nutrientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.lightGray,
  },
  nutrientLabel: {
    fontSize: 14,
    color: Colors.mediumGray,
    fontWeight: "500",
  },
  nutrientValue: {
    fontSize: 15,
    color: Colors.charcoal,
    fontWeight: "600",
  },
  allergensCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.dangerPale,
  },
  allergensHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  allergensTitle: {
    fontSize: 14,
    fontWeight: "700",
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
    fontWeight: "600",
    color: Colors.danger,
    textTransform: "capitalize",
  },
});
