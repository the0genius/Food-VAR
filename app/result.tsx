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
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { apiRequest, getApiUrl } from "@/lib/query-client";
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

function ScoreGauge({ score, isAllergenAlert }: { score: number; isAllergenAlert: boolean }) {
  const progress = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 12, stiffness: 100 });
    progress.value = withDelay(
      300,
      withTiming(score / 100, {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [score]);

  const scoreColor = isAllergenAlert
    ? Colors.danger
    : score <= 30
      ? Colors.scoreRed
      : score <= 60
        ? Colors.scoreAmber
        : Colors.scoreGreen;

  const circleStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const fillStyle = useAnimatedStyle(() => {
    const angle = progress.value * 360;
    return {
      transform: [{ rotate: `${angle}deg` }],
    };
  });

  return (
    <Animated.View style={[styles.gaugeContainer, circleStyle]}>
      <View style={styles.gaugeOuter}>
        <View style={[styles.gaugeTrack, { borderColor: Colors.lightGray }]} />
        <Animated.View
          style={[styles.gaugeFillContainer, fillStyle]}
        >
          <View
            style={[
              styles.gaugeFillHalf,
              { borderColor: scoreColor, borderLeftColor: "transparent", borderBottomColor: "transparent" },
            ]}
          />
        </Animated.View>
        <View style={styles.gaugeInner}>
          <Text style={[styles.gaugeScore, { color: scoreColor }]}>{score}</Text>
          <Text style={styles.gaugeMax}>/100</Text>
        </View>
      </View>
    </Animated.View>
  );
}

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
  const scoreColor = data.isAllergenAlert
    ? Colors.danger
    : data.score <= 30
      ? Colors.scoreRed
      : data.score <= 60
        ? Colors.scoreAmber
        : Colors.scoreGreen;

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
    backgroundColor: Colors.white,
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
    backgroundColor: Colors.softWhite,
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: 16,
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
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  productName: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.charcoal,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  productBrand: {
    fontSize: 14,
    color: Colors.mediumGray,
    marginTop: 4,
    fontWeight: "500",
  },
  gaugeContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  gaugeOuter: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeTrack: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
    borderColor: Colors.lightGray,
  },
  gaugeFillContainer: {
    position: "absolute",
    width: 160,
    height: 160,
  },
  gaugeFillHalf: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
  },
  gaugeInner: {
    alignItems: "center",
  },
  gaugeScore: {
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: -2,
  },
  gaugeMax: {
    fontSize: 14,
    color: Colors.mediumGray,
    fontWeight: "600",
    marginTop: -4,
  },
  labelWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  labelBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  labelText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },
  adviceCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 18,
    borderRadius: 16,
    backgroundColor: Colors.primaryPale,
  },
  adviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
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
    padding: 18,
    borderRadius: 16,
    backgroundColor: Colors.softWhite,
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
    paddingVertical: 10,
    borderBottomWidth: 0.5,
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
    padding: 18,
    borderRadius: 16,
    backgroundColor: Colors.dangerPale,
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
    backgroundColor: Colors.white,
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
