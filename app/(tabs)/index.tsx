import { useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, FlatList, RefreshControl, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { getScoreColor, getScoreShortLabel, useThemeColors, type ThemeColors } from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
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
  WarningCircle,
} from "phosphor-react-native";

function SkeletonBlock({ width, height, borderRadius = 12, style, color = "#EBEBEB" }: { width: number | string; height: number; borderRadius?: number; style?: any; color?: string }) {
  return (
    <MotiView
      from={{ opacity: 0.4 }}
      animate={{ opacity: 0.9 }}
      transition={{ loop: true, type: "timing" as const, duration: 850 }}
      style={[{ backgroundColor: color, borderRadius, width: width as any, height }, style]}
    />
  );
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

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);

  function RecentScanCard({
    item,
    index,
    onPress,
  }: {
    item: any;
    index: number;
    onPress: () => void;
  }) {
    const scoreColor = getScoreColor(item.score, theme);

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
          accessibilityLabel={`${item.productName}, score ${item.score} ${getScoreShortLabel(item.score, item.score === 0)}`}
          accessibilityRole="button"
        >
          <View style={styles.recentCardInner}>
            <View style={[styles.recentScoreBadge, { backgroundColor: scoreColor }]}>
              <Text style={styles.recentScoreText}>{item.score}</Text>
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
          <View style={[styles.recentRibbon, { backgroundColor: scoreColor }]} />
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
    return (
      <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
        <TouchableOpacity
          style={styles.popularCard}
          onPress={onPress}
          activeOpacity={0.7}
          accessibilityLabel={`${item.name}, ${item.brand || "Unknown brand"}`}
          accessibilityRole="button"
        >
          <View style={styles.popularIconCircle}>
            <Package size={20} color={theme.primary} />
          </View>
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
                  <View style={styles.popularDotSeparator} />
                  <Text style={styles.popularCalories}>{Math.round(item.calories)} kcal</Text>
                </>
              ) : null}
            </View>
          </View>
          <CaretRight size={20} color={theme.placeholder} />
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
            colors={[theme.mint, theme.teal]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, borderTopRightRadius: 999, borderBottomRightRadius: 999 }}
          />
        </Animated.View>
      </View>
    );
  }

  function SkeletonStatCard() {
    return (
      <View style={styles.statCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <SkeletonBlock width={32} height={32} borderRadius={16} color={theme.skeleton} />
          <SkeletonBlock width={60} height={12} borderRadius={6} color={theme.skeleton} />
        </View>
        <SkeletonBlock width={80} height={28} borderRadius={8} color={theme.skeleton} />
      </View>
    );
  }

  function SkeletonRecentCard() {
    return (
      <View style={styles.recentCard}>
        <View style={styles.recentCardInner}>
          <View style={{ position: "absolute", top: 12, right: 12 }}>
            <SkeletonBlock width={40} height={40} borderRadius={20} color={theme.skeleton} />
          </View>
          <View style={{ marginTop: "auto" as any }}>
            <SkeletonBlock width="100%" height={14} borderRadius={6} color={theme.skeleton} />
            <SkeletonBlock width="60%" height={11} borderRadius={6} style={{ marginTop: 4 }} color={theme.skeleton} />
          </View>
        </View>
      </View>
    );
  }

  function SkeletonProductRow() {
    return (
      <View style={styles.popularCard}>
        <View style={styles.popularIconCircle}>
          <SkeletonBlock width={48} height={48} borderRadius={24} color={theme.skeleton} />
        </View>
        <View style={{ flex: 1 }}>
          <SkeletonBlock width="65%" height={14} borderRadius={6} color={theme.skeleton} />
          <SkeletonBlock width="45%" height={12} borderRadius={6} style={{ marginTop: 6 }} color={theme.skeleton} />
        </View>
      </View>
    );
  }

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
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <FlatList
        data={[]}
        renderItem={null}
        refreshControl={
          <RefreshControl
            refreshing={!!popularQuery.isRefetching || !!historyQuery.isRefetching || !!scansQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
            accessibilityLabel="Pull to refresh"
          />
        }
        ListHeaderComponent={
          <>
            <View style={[styles.greetingSection, { paddingTop: (insets.top || webTopInset) + 16 }]}>
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
                    colors={[theme.primary, theme.mint]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
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
                  colors={[theme.mint, theme.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.proBadge}
                >
                  <Crown size={12} color={theme.brandGold} weight="fill" />
                  <Text style={styles.proBadgeText}>PRO</Text>
                </LinearGradient>
              )}
            </View>

            {!user?.isPro && (
              <AnimatedProgressBar used={scansToday} total={10} />
            )}


            <View style={styles.contentArea}>
              <View style={styles.statsRow}>
                {statsQuery.isLoading ? (
                  <>
                    <SkeletonStatCard />
                    <SkeletonStatCard />
                  </>
                ) : (
                  <>
                    <TouchableOpacity style={styles.statCard} activeOpacity={0.7}>
                      <View style={styles.statHeader}>
                        <View style={[styles.statIconBg, { backgroundColor: theme.tealTint }]}>
                          <ChartLineUp size={16} color={theme.teal} />
                        </View>
                        <Text style={styles.statLabel}>Avg Score</Text>
                      </View>
                      <View style={styles.statValueRow}>
                        <Text style={[styles.statNumber, { color: stats?.avgScore != null ? getScoreColor(stats.avgScore, theme) : theme.teal }]}>
                          {stats?.avgScore != null ? Math.round(stats.avgScore) : "--"}
                        </Text>
                        <Text style={styles.statSuffix}>/100</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.statCard} activeOpacity={0.7}>
                      <View style={styles.statHeader}>
                        <View style={[styles.statIconBg, { backgroundColor: theme.mintTint }]}>
                          <ScanSmiley size={16} color={theme.primary} />
                        </View>
                        <Text style={styles.statLabel}>Today</Text>
                      </View>
                      <View style={styles.statValueRow}>
                        <Text style={styles.statNumber}>{scansToday}</Text>
                        <Text style={styles.statSuffix}>items</Text>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <MotiView
                from={{ opacity: 0, translateY: -10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing" as const, duration: 500, delay: 100 }}
              >
                <TouchableOpacity
                  style={styles.heroBanner}
                  onPress={handleScanPress}
                  activeOpacity={0.7}
                  accessibilityLabel="Scan a product"
                  accessibilityRole="button"
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.heroLine1}>Scan Smart.</Text>
                    <Text style={styles.heroLine2}>Eat Right.</Text>
                    <Text style={styles.heroSub}>Discover healthier alternatives instantly.</Text>
                    <LinearGradient
                      colors={[theme.mint, theme.primary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.heroCTA}
                    >
                      <Barcode size={16} color={theme.onPrimary} weight="bold" />
                      <Text style={styles.heroCTAText}>Scan Product</Text>
                    </LinearGradient>
                  </View>
                  <View style={styles.heroGraphic}>
                    <Barcode size={40} color={theme.primary} style={{ opacity: 0.9 }} />
                  </View>
                </TouchableOpacity>
              </MotiView>

              {!statsQuery.isLoading && (
                <Animated.View entering={FadeInDown.duration(300)}>
                  <View style={styles.insightCard}>
                    <View style={styles.insightIconWrap}>
                      <Lightbulb size={20} color={theme.amber} weight="fill" />
                    </View>
                    <Text style={styles.insightText}>{insightText}</Text>
                  </View>
                </Animated.View>
              )}

              {recentScans.length === 0 && !historyQuery.isLoading && (
                <Animated.View entering={FadeInDown.duration(400)} style={styles.welcomeCard}>
                  <View style={styles.welcomeIconWrap}>
                    <Barcode size={36} color={theme.primary} />
                  </View>
                  <Text style={styles.welcomeTitle}>Welcome to FoodVAR</Text>
                  <Text style={styles.welcomeSubtitle}>
                    Scan your first product to get a personalized health score based on your profile.
                  </Text>
                  <TouchableOpacity onPress={handleScanPress} activeOpacity={0.8} accessibilityLabel="Scan a product" accessibilityRole="button">
                    <LinearGradient
                      colors={[theme.mint, theme.primary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.welcomeBtnGradient}
                    >
                      <Barcode size={20} color={theme.onPrimary} weight="bold" />
                      <Text style={styles.welcomeBtnText}>Scan a Product</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {historyQuery.isLoading && (
                <View style={styles.section}>
                  <Text style={styles.sectionHeaderLabel}>RECENT SCANS</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 4 }}>
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
                    <TouchableOpacity onPress={() => router.push("/(tabs)/history")} accessibilityLabel="See all scan history" accessibilityRole="link">
                      <Text style={styles.seeAll}>See all</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 4 }}>
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
                {popularQuery.isLoading && (
                  <View style={styles.popularListCard}>
                    {[0, 1, 2].map((i) => (
                      <SkeletonProductRow key={i} />
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
                  <View style={{ alignItems: "center", paddingVertical: 24, gap: 10 }}>
                    <WarningCircle size={28} color={theme.placeholder} />
                    <Text style={styles.emptyText}>Could not load products</Text>
                    <Text style={[styles.emptyText, { paddingVertical: 0, fontSize: 13 }]}>Pull down to refresh</Text>
                  </View>
                )}
                {popular.length === 0 && !popularQuery.isLoading && !popularQuery.isError && (
                  <View style={{ alignItems: "center", paddingVertical: 24, gap: 10 }}>
                    <Package size={28} color={theme.placeholder} />
                    <Text style={styles.emptyText}>No products yet — start scanning to build the database!</Text>
                  </View>
                )}
              </View>

              {!popularQuery.isLoading && (
                <Animated.View entering={FadeInDown.duration(400)}>
                  <TouchableOpacity
                    style={styles.contributeCard}
                    onPress={() => router.push("/contribute")}
                    activeOpacity={0.7}
                    accessibilityLabel="Add a missing product to the database"
                    accessibilityRole="button"
                  >
                    <View style={styles.contributeIconWrap}>
                      <Info size={20} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contributeTitle}>Missing a product?</Text>
                      <Text style={styles.contributeSubtitle}>Help expand our database</Text>
                    </View>
                    <View style={styles.contributeBtn}>
                      <Text style={styles.contributeBtnText}>Add</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
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

const createStyles = (theme: ThemeColors) => {
  const isDark = theme.isDark;

  const bentoShadow = isDark
    ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
      }
    : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 3,
      };

  const BENTO_CARD = {
    backgroundColor: theme.card,
    borderRadius: 24,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.subtleBorder,
    ...bentoShadow,
  } as const;

  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  greetingSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  greetingSmall: {
    fontSize: 15,
    color: theme.muted,
    fontWeight: "400",
    marginBottom: 2,
  },
  greetingName: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: theme.text,
    lineHeight: 34,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.onPrimary,
  },
  avatarBadge: {
    position: "absolute",
    bottom: -4,
    right: -8,
    backgroundColor: theme.card,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: theme.border,
    ...bentoShadow,
  },
  avatarBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.primary,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: theme.progressTrack,
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
    color: theme.onPrimary,
    letterSpacing: 1.2,
  },
  contentArea: {
    paddingTop: 16,
    gap: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 20,
  },
  statCard: {
    ...BENTO_CARD,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.muted,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 4,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -1,
    color: theme.text,
    lineHeight: 34,
    ...(Platform.OS === "ios" ? { fontVariant: ["tabular-nums" as any] } : {}),
  },
  statSuffix: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.placeholder,
  },
  heroBanner: {
    ...BENTO_CARD,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    marginHorizontal: 20,
  },
  heroLine1: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.text,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  heroLine2: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.text,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  heroSub: {
    fontSize: 14,
    color: theme.muted,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 20,
  },
  heroCTA: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  heroCTAText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.onPrimary,
  },
  heroGraphic: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.mintTintStrong,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  insightCard: {
    ...BENTO_CARD,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 20,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: theme.amber,
  },
  insightIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.amberTint,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  insightText: {
    fontSize: 14,
    color: theme.text,
    lineHeight: 20,
    flex: 1,
    fontWeight: "500",
  },
  section: {
    paddingHorizontal: 20,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeaderLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: theme.placeholder,
    textTransform: "uppercase",
  },
  seeAll: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: "600",
  },
  recentCard: {
    ...BENTO_CARD,
    width: 150,
    height: 160,
    overflow: "hidden",
    padding: 0,
  },
  recentCardInner: {
    padding: 16,
    flex: 1,
    justifyContent: "space-between",
  },
  recentScoreBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    alignSelf: "flex-end" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  recentScoreText: {
    fontWeight: "700" as const,
    fontSize: 14,
    color: theme.onPrimary,
  },
  recentName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.text,
    lineHeight: 20,
  },
  recentBrand: {
    fontSize: 12,
    color: theme.muted,
    marginTop: 2,
  },
  recentRibbon: {
    height: 6,
    width: "100%",
  },
  popularListCard: {
    ...BENTO_CARD,
    overflow: "hidden",
    padding: 8,
  },
  popularCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 8,
    borderRadius: 16,
  },
  popularIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.tinted,
    alignItems: "center",
    justifyContent: "center",
  },
  popularName: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.text,
    marginBottom: 2,
  },
  popularMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  popularBrand: {
    fontSize: 12,
    color: theme.muted,
  },
  popularDotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.placeholder,
    marginHorizontal: 6,
    opacity: 0.5,
  },
  popularCalories: {
    fontSize: 12,
    color: theme.placeholder,
  },
  popularDivider: {
    height: 1,
    backgroundColor: theme.divider,
    marginLeft: 68,
  },
  emptyText: {
    textAlign: "center",
    color: theme.muted,
    fontSize: 14,
    paddingVertical: 24,
  },
  welcomeCard: {
    marginHorizontal: 20,
    padding: 28,
    ...BENTO_CARD,
    alignItems: "center" as const,
  },
  welcomeIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.tinted,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: theme.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: theme.muted,
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
    color: theme.onPrimary,
  },
  contributeCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 20,
    padding: 16,
    backgroundColor: `${theme.tinted}80`,
    borderWidth: 1,
    borderColor: `${theme.primary}18`,
  },
  contributeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.primary}18`,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  },
  contributeTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: theme.text,
    marginBottom: 2,
  },
  contributeSubtitle: {
    fontSize: 12,
    color: theme.muted,
  },
  contributeBtn: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    ...bentoShadow,
  },
  contributeBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: theme.text,
  },
});
};
