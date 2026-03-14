import { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, FlatList, RefreshControl, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { C } from "@/constants/colors";
import Colors, { cardShadow, coloredShadow } from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { MotiView } from "moti";
import {
  Barcode,
  CaretRight,
  Lightbulb,
  ScanSmiley,
  ChartLineUp,
  Package,
  Crown,
  Info,
} from "phosphor-react-native";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";

function SkeletonBlock({ width, height, borderRadius = 12, style }: { width: number | string; height: number; borderRadius?: number; style?: any }) {
  return (
    <MotiView
      from={{ opacity: 0.4 }}
      animate={{ opacity: 0.9 }}
      transition={{ loop: true, type: "timing" as const, duration: 850 }}
      style={[{ backgroundColor: "#EBEBEB", borderRadius, width: width as any, height }, style]}
    />
  );
}

function SkeletonProductCard() {
  return (
    <View style={styles.popularCard}>
      <View style={styles.popularDot} />
      <View style={styles.popularIconCircle}>
        <SkeletonBlock width={48} height={48} borderRadius={24} />
      </View>
      <View style={{ flex: 1 }}>
        <SkeletonBlock width="65%" height={14} borderRadius={6} />
        <SkeletonBlock width="45%" height={12} borderRadius={6} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

function SkeletonRecentCard() {
  return (
    <View style={styles.recentCard}>
      <View style={styles.recentCardInner}>
        <SkeletonBlock width={32} height={32} borderRadius={16} />
        <SkeletonBlock width="100%" height={14} borderRadius={6} style={{ marginTop: 10 }} />
        <SkeletonBlock width="60%" height={11} borderRadius={6} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

function getScoreColor(score: number): string {
  if (score === 0) return C.danger;
  if (score <= 15) return C.darkRed;
  if (score <= 35) return C.danger;
  if (score <= 50) return C.amber;
  if (score <= 74) return C.tealScore;
  return C.green;
}

function getScoreColorLight(score: number): string {
  if (score === 0) return C.dangerBg;
  if (score <= 15) return "#FFE8E8";
  if (score <= 35) return C.dangerBg;
  if (score <= 50) return C.amberBg;
  if (score <= 74) return C.tealBg;
  return C.greenBg;
}

function getScoreLabel(score: number): string {
  if (score === 0) return "Allergen";
  if (score <= 15) return "Avoid";
  if (score <= 35) return "Risky";
  if (score <= 50) return "Caution";
  if (score <= 74) return "Good";
  return "Great";
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dedupeScans(scans: any[]): any[] {
  const seen = new Set<number>();
  return scans.filter((s) => {
    if (seen.has(s.productId)) return false;
    seen.add(s.productId);
    return true;
  });
}

function getInsightText(avgScore: number, weeklyScans: number, totalScans: number): string {
  if (totalScans === 0) {
    return "Scan your first product to get personalized insights";
  }
  if (avgScore >= 75) {
    return "Your choices are looking great! Keep making smart picks.";
  }
  if (avgScore >= 55) {
    return `Avg score: ${Math.round(avgScore)} — try swapping a few items for better picks.`;
  }
  if (avgScore >= 35) {
    return `Avg score: ${Math.round(avgScore)} — check out your Top Picks in Profile for ideas.`;
  }
  return `Avg score: ${Math.round(avgScore)} — every scan helps you learn what works for you.`;
}

function ScoreBadgeCircle({ score }: { score: number }) {
  return (
    <View style={[styles.scoreBadgeCircle, { backgroundColor: getScoreColorLight(score) }]}>
      <Text style={[styles.scoreBadgeCircleText, { color: getScoreColor(score) }]}>{score}</Text>
    </View>
  );
}

function SectionAccentLine() {
  return <View style={styles.sectionAccentLine} />;
}

function RecentScanCard({
  item,
  index,
  onPress,
}: {
  item: any;
  index: number;
  onPress: () => void;
}) {
  const ribbonColor = getScoreColor(item.score);

  return (
    <MotiView
      from={{ opacity: 0, translateX: 20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ delay: index * 70, type: "timing" as const }}
    >
      <TouchableOpacity
        style={styles.recentCard}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.recentCardInner}>
          <View style={{ alignItems: "flex-end" }}>
            <ScoreBadgeCircle score={item.score} />
          </View>
          <View style={{ marginTop: "auto" as any }}>
            <Text style={styles.recentName} numberOfLines={2}>
              {item.productName}
            </Text>
            <Text style={styles.recentBrand} numberOfLines={1}>
              {item.productBrand || "Unknown"}
            </Text>
          </View>
        </View>
        <View style={[styles.recentRibbon, { backgroundColor: ribbonColor }]} />
      </TouchableOpacity>
    </MotiView>
  );
}

function PopularProductCard({
  item,
  index,
  totalCount,
  onPress,
}: {
  item: any;
  index: number;
  totalCount: number;
  onPress: () => void;
}) {
  const dotColor = getScoreColor(item.score || 50);

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
      <TouchableOpacity
        style={styles.popularCard}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.popularDot, { backgroundColor: dotColor }]} />
        <LinearGradient
          colors={[C.tinted, "#D0EDD1"]}
          style={styles.popularIconCircle}
        >
          <Package size={20} color={C.primary} />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.popularName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.popularMetaRow}>
            <Text style={styles.popularBrand} numberOfLines={1}>
              {item.brand || "Unknown brand"}
            </Text>
            {item.calories ? (
              <>
                <Text style={styles.popularDotSeparator}>•</Text>
                <Text style={styles.popularCalories}>{Math.round(item.calories)} kcal</Text>
              </>
            ) : null}
          </View>
        </View>
        <View style={styles.popularChevronCircle}>
          <CaretRight size={16} color={C.placeholder} />
        </View>
      </TouchableOpacity>
      {index < totalCount - 1 && <View style={styles.popularDivider} />}
    </Animated.View>
  );
}

function AnimatedProgressBar({ used, total }: { used: number; total: number }) {
  const ratio = Math.min(used / total, 1);
  const animWidth = useSharedValue(0);

  useEffect(() => {
    animWidth.value = withTiming(ratio * 100, { duration: 800 });
  }, [ratio]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animWidth.value}%` as any,
    height: 3,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  }));

  return (
    <View style={styles.progressBarTrack}>
      <Animated.View style={fillStyle}>
        <LinearGradient
          colors={["#3DD68C", "#2EC4B6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, borderTopRightRadius: 999, borderBottomRightRadius: 999 }}
        />
      </Animated.View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const popularQuery = useQuery({
    queryKey: ["/api/products/popular"],
  });

  const historyQuery = useQuery({
    queryKey: ["/api/history"],
    enabled: !!user,
  });

  const scansQuery = useQuery({
    queryKey: ["/api/scans/today"],
    enabled: !!user,
  });

  const statsQuery = useQuery({
    queryKey: ["/api/stats"],
    enabled: !!user,
  });

  const popular = (popularQuery.data || []) as any[];
  const allScans = (historyQuery.data || []) as any[];
  const recentScans = dedupeScans(allScans).slice(0, 5);
  const scansToday = (scansQuery.data as any)?.count || 0;
  const stats = statsQuery.data as any;

  async function handleRefresh() {
    await Promise.all([
      popularQuery.refetch(),
      historyQuery.refetch(),
      scansQuery.refetch(),
      statsQuery.refetch(),
    ]);
  }

  async function handleProductPress(product: any) {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/result",
      params: { productId: product.id, accessMethod: "browse" },
    });
  }

  function handleScanPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push("/(tabs)/scan");
  }

  const insightText = getInsightText(
    stats?.avgScore || 0,
    stats?.weeklyScans || 0,
    stats?.totalScans || 0
  );

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "?";

  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        renderItem={null}
        refreshControl={
          <RefreshControl
            refreshing={!!popularQuery.isRefetching || !!historyQuery.isRefetching || !!scansQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
        ListHeaderComponent={
          <>
            <View>
              <LinearGradient
                colors={["#F0FAF4", "#F6F8F7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[
                  styles.headerGradient,
                  { paddingTop: (insets.top || webTopInset) + 16 },
                ]}
              >
                <MotiView
                  from={{ opacity: 0, translateY: -4 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: "timing" as const, duration: 500 }}
                  style={styles.headerRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.greetingSmall}>
                      {getGreeting()},
                    </Text>
                    <Text style={styles.greetingName}>
                      {user?.name ? user.name.split(" ")[0] : "there"}
                    </Text>
                  </View>
                  <View>
                    <LinearGradient
                      colors={["#3DD68C", "#2E7D32"]}
                      style={styles.avatarCircle}
                    >
                      <Text style={styles.avatarInitial}>{userInitial}</Text>
                    </LinearGradient>
                    <View style={styles.avatarBadge}>
                      <Text style={styles.avatarBadgeText}>
                        {scansToday}/{user?.isPro ? "∞" : "10"}
                      </Text>
                    </View>
                  </View>
                </MotiView>

                {user?.isPro && (
                  <LinearGradient
                    colors={["#3DD68C", "#2E7D32"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.proBadge}
                  >
                    <Crown size={12} color="#FFD700" weight="fill" />
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </LinearGradient>
                )}
              </LinearGradient>

              {!user?.isPro && (
                <AnimatedProgressBar used={scansToday} total={10} />
              )}
            </View>

            {user && !user.emailVerifiedAt && (
              <EmailVerificationBanner />
            )}

            <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
              <MotiView
                from={{ opacity: 0, translateY: -10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing" as const, duration: 500, delay: 100 }}
                style={styles.heroBanner}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.heroLine1}>Scan Smart.</Text>
                  <Text style={styles.heroLine2}>Eat Right.</Text>
                  <Text style={styles.heroSub}>Discover the truth about your food in seconds.</Text>
                  <TouchableOpacity
                    onPress={handleScanPress}
                    activeOpacity={0.8}
                    accessibilityLabel="Scan a product"
                    accessibilityRole="button"
                  >
                    <LinearGradient
                      colors={["#3DD68C", "#2E7D32"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.heroCTA}
                    >
                      <Barcode size={14} color="white" weight="bold" />
                      <Text style={styles.heroCTAText}>Scan Product</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                <View style={styles.heroGraphic}>
                  <LinearGradient
                    colors={["rgba(61,214,140,0.12)", "transparent"]}
                    style={styles.heroGraphicCircle}
                  />
                  <Barcode size={40} color={C.mint} style={{ opacity: 0.9 }} />
                </View>
              </MotiView>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <LinearGradient
                    colors={[C.tinted, "#D4EDDA"]}
                    style={styles.statIconBg}
                  >
                    <ChartLineUp size={16} color={C.primary} />
                  </LinearGradient>
                  <Text style={styles.statLabel}>Avg Score</Text>
                </View>
                <View style={styles.statValueRow}>
                  <Text style={[styles.statNumber, { color: stats?.avgScore != null ? getScoreColor(stats.avgScore) : C.text }]}>
                    {stats?.avgScore != null ? Math.round(stats.avgScore) : "--"}
                  </Text>
                  <Text style={styles.statSuffix}>/100</Text>
                </View>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <LinearGradient
                    colors={[C.tinted, "#D4EDDA"]}
                    style={styles.statIconBg}
                  >
                    <ScanSmiley size={16} color={C.primary} />
                  </LinearGradient>
                  <Text style={styles.statLabel}>Today</Text>
                </View>
                <View style={styles.statValueRow}>
                  <Text style={styles.statNumber}>{scansToday}</Text>
                  <Text style={styles.statSuffix}>items</Text>
                </View>
              </View>
            </View>

            {!statsQuery.isLoading && (
              <View style={styles.insightCard}>
                <Lightbulb size={16} color="#FB8C00" weight="fill" style={{ marginTop: 2 }} />
                <Text style={styles.insightText}>{insightText}</Text>
              </View>
            )}

            {recentScans.length === 0 && !historyQuery.isLoading && (
              <Animated.View entering={FadeInDown.duration(400)} style={styles.welcomeCard}>
                <View style={styles.welcomeIconWrap}>
                  <Barcode size={36} color={C.primary} />
                </View>
                <Text style={styles.welcomeTitle}>Welcome to FoodVAR</Text>
                <Text style={styles.welcomeSubtitle}>
                  Scan your first product to get a personalized health score based on your profile.
                </Text>
                <TouchableOpacity onPress={handleScanPress} activeOpacity={0.8}>
                  <LinearGradient
                    colors={["#3DD68C", "#2E7D32"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.welcomeBtnGradient}
                  >
                    <Barcode size={20} color="white" weight="bold" />
                    <Text style={styles.welcomeBtnText}>Scan a Product</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            )}

            {historyQuery.isLoading && (
              <View style={styles.section}>
                <Text style={styles.sectionHeaderLabel}>RECENT SCANS</Text>
                <SectionAccentLine />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
                  {[0, 1, 2].map((i) => (
                    <SkeletonRecentCard key={i} />
                  ))}
                </ScrollView>
              </View>
            )}

            {!historyQuery.isLoading && recentScans.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionHeaderLabel}>RECENT SCANS</Text>
                    <SectionAccentLine />
                  </View>
                  <TouchableOpacity onPress={() => router.push("/(tabs)/history")}>
                    <Text style={styles.seeAll}>See all</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
                  {recentScans.map((item: any, i: number) => (
                    <RecentScanCard
                      key={item.id}
                      item={item}
                      index={i}
                      onPress={() =>
                        router.push({
                          pathname: "/result",
                          params: {
                            historyId: item.id,
                          },
                        })
                      }
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionHeaderLabel}>TRENDING HEALTH CHOICES</Text>
              <SectionAccentLine />
              {popularQuery.isLoading && (
                <View style={styles.popularListCard}>
                  {[0, 1, 2].map((i) => (
                    <SkeletonProductCard key={i} />
                  ))}
                </View>
              )}
              {!popularQuery.isLoading && popular.length > 0 && (
                <View style={styles.popularListCard}>
                  {popular.map((item: any, i: number) => (
                    <PopularProductCard
                      key={item.id}
                      item={item}
                      index={i}
                      totalCount={popular.length}
                      onPress={() => handleProductPress(item)}
                    />
                  ))}
                </View>
              )}
              {popularQuery.isError && popular.length === 0 && (
                <View style={{ alignItems: "center", paddingVertical: 20, gap: 8 }}>
                  <Text style={styles.emptyText}>Could not load products. Pull to refresh.</Text>
                </View>
              )}
              {popular.length === 0 && !popularQuery.isLoading && !popularQuery.isError && (
                <Text style={styles.emptyText}>
                  No products yet. Start scanning to build the database!
                </Text>
              )}
            </View>

            {!popularQuery.isLoading && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <TouchableOpacity
                  style={styles.contributeCard}
                  onPress={() => router.push("/contribute")}
                  activeOpacity={0.7}
                >
                  <View style={styles.contributeIconWrap}>
                    <Info size={20} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contributeTitle}>Missing a product?</Text>
                    <Text style={styles.contributeSubtitle}>Help improve our database by scanning unlisted items.</Text>
                  </View>
                  <Text style={styles.contributeAction}>Add</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </>
        }
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 80,
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const TIER1 = {
  backgroundColor: C.card,
  borderRadius: 20,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 3,
} as const;

const TIER2 = {
  backgroundColor: C.card,
  borderRadius: 20,
  borderWidth: 0.5,
  borderColor: C.border,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.04,
  shadowRadius: 4,
  elevation: 1,
} as const;

const TIER3 = {
  backgroundColor: C.card,
  borderRadius: 20,
  borderWidth: 0.5,
  borderColor: C.border,
} as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  greetingSmall: {
    fontSize: 14,
    color: C.muted,
    fontWeight: "500",
    marginBottom: 2,
  },
  greetingName: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: C.text,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: C.border,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: "800",
    color: "white",
  },
  avatarBadge: {
    position: "absolute",
    bottom: -6,
    right: -6,
    backgroundColor: C.card,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.primary,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10,
    gap: 5,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "white",
    letterSpacing: 1.2,
  },
  heroBanner: {
    ...TIER1,
    backgroundColor: "#EDF5EE",
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 24,
  },
  heroLine1: {
    fontSize: 20,
    fontWeight: "900",
    color: C.text,
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  heroLine2: {
    fontSize: 20,
    fontWeight: "900",
    color: C.text,
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  heroSub: {
    fontSize: 12,
    color: C.muted,
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 18,
    maxWidth: 180,
  },
  heroCTA: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  heroCTAText: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
  },
  heroGraphic: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  heroGraphicCircle: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    ...TIER1,
    flex: 1,
    padding: 16,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  statIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: C.muted,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  statNumber: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -1,
    color: C.text,
    lineHeight: 32,
    ...(Platform.OS === "ios" ? { fontVariant: ["tabular-nums" as any] } : {}),
  },
  statSuffix: {
    fontSize: 12,
    fontWeight: "500",
    color: C.muted,
    marginBottom: 2,
  },
  insightCard: {
    ...TIER3,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
  },
  insightText: {
    fontSize: 14,
    color: C.text,
    lineHeight: 21,
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.3,
    color: C.placeholder,
    textTransform: "uppercase",
    marginBottom: 0,
  },
  sectionAccentLine: {
    width: 24,
    height: 2,
    backgroundColor: C.mint,
    opacity: 0.4,
    marginTop: 6,
    marginBottom: 12,
    borderRadius: 1,
  },
  seeAll: {
    fontSize: 13,
    color: C.primary,
    fontWeight: "600",
  },
  recentCard: {
    ...TIER2,
    width: 140,
    overflow: "hidden",
    padding: 0,
  },
  recentCardInner: {
    padding: 12,
    paddingBottom: 14,
    flex: 1,
  },
  recentName: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
    marginTop: 12,
    lineHeight: 18,
  },
  recentBrand: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  scoreBadgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBadgeCircleText: {
    fontWeight: "700",
    fontSize: 12,
  },
  recentRibbon: {
    height: 2,
    width: "100%",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  popularListCard: {
    ...TIER2,
    overflow: "hidden",
    padding: 0,
  },
  popularCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  popularDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.green,
  },
  popularIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.04)",
  },
  popularName: {
    fontSize: 14,
    fontWeight: "500",
    color: C.text,
    marginBottom: 2,
  },
  popularMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  popularBrand: {
    fontSize: 12,
    color: C.muted,
  },
  popularDotSeparator: {
    fontSize: 12,
    color: C.muted,
    marginHorizontal: 4,
  },
  popularCalories: {
    fontSize: 12,
    color: C.muted,
  },
  popularChevronCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  popularDivider: {
    height: 1,
    backgroundColor: C.divider,
    marginHorizontal: 16,
  },
  emptyText: {
    textAlign: "center",
    color: C.muted,
    fontSize: 14,
    paddingVertical: 24,
  },
  welcomeCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 28,
    ...TIER1,
    alignItems: "center" as const,
  },
  welcomeIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.tinted,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: C.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: C.muted,
    textAlign: "center" as const,
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 260,
  },
  welcomeBtnGradient: {
    borderRadius: 999,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 15,
  },
  welcomeBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "white",
  },
  contributeCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderStyle: "dashed" as const,
    borderColor: "rgba(61,214,140,0.4)",
    backgroundColor: "rgba(61,214,140,0.02)",
  },
  contributeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.tinted,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  contributeTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: C.text,
    marginBottom: 2,
  },
  contributeSubtitle: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 17,
  },
  contributeAction: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: C.primary,
  },
});
