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
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { MotiView } from "moti";
import {
  House,
  Barcode,
  CaretRight,
  Lightbulb,
  ScanSmiley,
  ChartLineUp,
  Package,
  Plant,
  Heart,
  Star,
  Drop,
  Sparkle,
  Crown,
} from "phosphor-react-native";

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
      <View style={styles.popularIconBox}>
        <SkeletonBlock width={44} height={44} borderRadius={14} />
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
      <SkeletonBlock width={38} height={38} borderRadius={10} />
      <SkeletonBlock width="100%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
      <SkeletonBlock width="60%" height={11} borderRadius={6} style={{ marginTop: 4 }} />
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
    return "Your choices are looking great! Keep making smart picks";
  }
  if (avgScore >= 55) {
    return `Avg score: ${Math.round(avgScore)} — try swapping a few items for better picks`;
  }
  if (avgScore >= 35) {
    return `Avg score: ${Math.round(avgScore)} — check out your Top Picks in Profile for ideas`;
  }
  return `Avg score: ${Math.round(avgScore)} — every scan helps you learn what works for you`;
}

function ScoreBadgeSmall({ score }: { score: number }) {
  return (
    <View style={[styles.scoreBadgeSmall, { backgroundColor: getScoreColorLight(score) }]}>
      <Text style={[styles.scoreBadgeSmallText, { color: getScoreColor(score) }]}>{score}</Text>
    </View>
  );
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
  const scoreLabel = getScoreLabel(item.score);

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
        <View style={{ position: "absolute" as const, top: 10, right: 10 }}>
          <ScoreBadgeSmall score={item.score} />
        </View>
        <Text style={styles.recentName} numberOfLines={2}>
          {item.productName}
        </Text>
        <Text style={styles.recentBrand} numberOfLines={1}>
          {item.productBrand || "Unknown"}
        </Text>
        <View style={[styles.scoreLabelPill, { backgroundColor: getScoreColorLight(item.score) }]}>
          <Text style={[styles.scoreLabelPillText, { color: getScoreColor(item.score) }]}>
            {scoreLabel}
          </Text>
        </View>
      </TouchableOpacity>
    </MotiView>
  );
}

function PopularProductCard({
  item,
  index,
  onPress,
}: {
  item: any;
  index: number;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
      <TouchableOpacity
        style={styles.popularCard}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[C.tinted, "#D0EDD1"]}
          style={styles.popularIconBox}
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
              <View style={styles.caloriesChip}>
                <Text style={styles.caloriesChipText}>{Math.round(item.calories)} cal</Text>
              </View>
            ) : null}
          </View>
        </View>
        <CaretRight size={16} color={C.placeholder} />
      </TouchableOpacity>
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
    height: 5,
    borderRadius: 999,
  }));

  return (
    <View style={styles.progressRow}>
      <Text style={styles.progressLabel}>{used} of {total} checks used today</Text>
      <View style={styles.progressTrack}>
        <Animated.View style={fillStyle}>
          <LinearGradient
            colors={["#3DD68C", "#2E7D32"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, borderRadius: 999 }}
          />
        </Animated.View>
      </View>
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
    queryKey: ["/api/history", String(user?.id)],
    enabled: !!user,
  });

  const scansQuery = useQuery({
    queryKey: ["/api/scans/today", String(user?.id)],
    enabled: !!user,
  });

  const statsQuery = useQuery({
    queryKey: ["/api/stats", String(user?.id)],
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
      params: { productId: product.id, userId: user.id, accessMethod: "browse" },
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
            <LinearGradient
              colors={["#F0FAF4", "#F6F8F7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[
                styles.headerGradient,
                { paddingTop: (insets.top || webTopInset) + 16 },
              ]}
            >
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.greetingSmall}>
                    {getGreeting()},
                  </Text>
                  <Text style={styles.greetingName}>
                    {user?.name ? user.name.split(" ")[0] : "there"}
                  </Text>
                </View>
                <LinearGradient
                  colors={["#3DD68C", "#2E7D32"]}
                  style={styles.avatarCircle}
                >
                  <Text style={styles.avatarInitial}>{userInitial}</Text>
                </LinearGradient>
              </View>

              {!user?.isPro && (
                <AnimatedProgressBar used={scansToday} total={10} />
              )}
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

            <MotiView
              from={{ opacity: 0, translateY: -10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing" as const, duration: 500, delay: 100 }}
              style={styles.heroBanner}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.heroLine1}>Scan Smart.</Text>
                <Text style={styles.heroLine2}>Eat Right.</Text>
                <Text style={styles.heroSub}>Know what's in your food instantly.</Text>
                <TouchableOpacity onPress={handleScanPress} activeOpacity={0.8}>
                  <LinearGradient
                    colors={["#3DD68C", "#2E7D32"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.heroCTA}
                  >
                    <Barcode size={13} color="white" weight="bold" />
                    <Text style={styles.heroCTAText}>Scan Now</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <View style={styles.heroIconCluster}>
                <Plant size={40} color={C.primary} style={{ position: "absolute" as const, top: 18, left: 18 }} />
                <Heart size={19} color={C.mint} weight="fill" style={{ position: "absolute" as const, top: 0, right: 0 }} />
                <Star size={13} color={C.primary} style={{ position: "absolute" as const, top: 0, left: 6, opacity: 0.45 }} />
                <Drop size={13} color={C.mint} style={{ position: "absolute" as const, bottom: 0, right: 6, opacity: 0.7 }} />
                <Sparkle size={11} color={C.primary} style={{ position: "absolute" as const, bottom: 4, left: 0, opacity: 0.5 }} />
              </View>
            </MotiView>

            {!statsQuery.isLoading && (
              <View style={styles.insightCard}>
                <View style={styles.insightAccent} />
                <LinearGradient
                  colors={["#3DD68C22", "#2E7D3222"]}
                  style={styles.insightIconBg}
                >
                  <Lightbulb size={17} color={C.primary} weight="fill" />
                </LinearGradient>
                <Text style={styles.insightText}>{insightText}</Text>
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <ScanSmiley size={18} color={C.mint} />
                  <Text style={styles.statLabel}>Today</Text>
                </View>
                <Text style={styles.statNumber}>{scansToday}</Text>
                <Text style={styles.statSub}>checks done</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <ChartLineUp size={18} color={C.primary} />
                  <Text style={styles.statLabel}>Avg Score</Text>
                </View>
                <Text style={[styles.statNumber, { color: stats?.avgScore ? getScoreColor(stats.avgScore) : C.text }]}>
                  {stats?.avgScore ? Math.round(stats.avgScore) : "--"}
                </Text>
                <Text style={styles.statSub}>overall</Text>
              </View>
            </View>

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
                  <Text style={styles.sectionHeaderLabel}>RECENT SCANS</Text>
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
              <Text style={[styles.sectionHeaderLabel, { marginTop: 4 }]}>POPULAR</Text>
              {popularQuery.isLoading && (
                <>
                  {[0, 1, 2].map((i) => (
                    <SkeletonProductCard key={i} />
                  ))}
                </>
              )}
              {!popularQuery.isLoading && popular.map((item: any, i: number) => (
                <PopularProductCard
                  key={item.id}
                  item={item}
                  index={i}
                  onPress={() => handleProductPress(item)}
                />
              ))}
              {popular.length === 0 && !popularQuery.isLoading && (
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
                  <LinearGradient
                    colors={[C.tinted, "#D0EDD1"]}
                    style={styles.contributeIconWrap}
                  >
                    <Package size={20} color={C.primary} />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contributeTitle}>Know a product we don't have?</Text>
                    <Text style={styles.contributeSubtitle}>Add it to help others</Text>
                  </View>
                  <CaretRight size={16} color={C.placeholder} />
                </TouchableOpacity>
              </Animated.View>
            )}
          </>
        }
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 100,
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

const CARD = {
  backgroundColor: C.card,
  borderRadius: 20,
  padding: 16,
  borderWidth: 0.5,
  borderColor: C.border,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
} as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  greetingSmall: {
    fontSize: 13,
    color: C.muted,
    fontWeight: "500",
  },
  greetingName: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: C.text,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: "800",
    color: "white",
  },
  progressRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressLabel: {
    fontSize: 12,
    color: C.muted,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#E0EDE1",
    overflow: "hidden",
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
    ...CARD,
    backgroundColor: C.tinted,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  heroLine1: {
    fontSize: 19,
    fontWeight: "900",
    color: C.text,
    letterSpacing: -0.5,
  },
  heroLine2: {
    fontSize: 19,
    fontWeight: "900",
    color: C.primary,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 12,
    color: C.muted,
    marginTop: 5,
    lineHeight: 18,
  },
  heroCTA: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    gap: 6,
    marginTop: 14,
  },
  heroCTAText: {
    fontSize: 12,
    fontWeight: "700",
    color: "white",
  },
  heroIconCluster: {
    width: 76,
    height: 76,
    position: "relative",
  },
  insightCard: {
    ...CARD,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  insightAccent: {
    width: 3,
    borderRadius: 999,
    backgroundColor: C.mint,
    alignSelf: "stretch",
  },
  insightIconBg: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  insightText: {
    fontSize: 14,
    color: C.text,
    lineHeight: 21,
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    ...CARD,
    flex: 1,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.3,
    color: C.placeholder,
    textTransform: "uppercase",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -1,
    color: C.text,
  },
  statSub: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.3,
    color: C.placeholder,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 13,
    color: C.primary,
    fontWeight: "600",
  },
  recentCard: {
    ...CARD,
    width: 156,
    padding: 14,
  },
  recentName: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
    marginTop: 8,
    lineHeight: 18,
  },
  recentBrand: {
    fontSize: 11,
    color: C.muted,
    marginTop: 3,
  },
  scoreBadgeSmall: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBadgeSmallText: {
    fontWeight: "800",
    fontSize: 14,
  },
  scoreLabelPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  scoreLabelPillText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  popularCard: {
    ...CARD,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  popularIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  popularName: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
  },
  popularMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  popularBrand: {
    fontSize: 12,
    color: C.muted,
  },
  caloriesChip: {
    backgroundColor: C.bg,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  caloriesChipText: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "500",
  },
  emptyText: {
    textAlign: "center",
    color: C.muted,
    fontSize: 14,
    paddingVertical: 24,
  },
  welcomeCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 28,
    ...CARD,
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
    ...CARD,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  contributeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  contributeTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: C.text,
  },
  contributeSubtitle: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
});
