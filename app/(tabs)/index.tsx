import { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
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

function SkeletonPulse({ children }: { children: React.ReactNode }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

function SkeletonProductCard() {
  return (
    <SkeletonPulse>
      <View style={styles.productCard}>
        <View style={styles.productInfo}>
          <View
            style={{
              width: "65%",
              height: 14,
              borderRadius: 6,
              backgroundColor: Colors.lightGray,
            }}
          />
          <View
            style={{
              width: "45%",
              height: 12,
              borderRadius: 6,
              backgroundColor: Colors.lightGray,
              marginTop: 6,
            }}
          />
          <View
            style={{
              flexDirection: "row" as const,
              alignItems: "center" as const,
              gap: 8,
              marginTop: 8,
            }}
          >
            <View
              style={{
                width: 50,
                height: 10,
                borderRadius: 5,
                backgroundColor: Colors.lightGray,
              }}
            />
            <View
              style={{
                width: 60,
                height: 18,
                borderRadius: 6,
                backgroundColor: Colors.lightGray,
              }}
            />
          </View>
        </View>
      </View>
    </SkeletonPulse>
  );
}

function SkeletonRecentCard() {
  return (
    <SkeletonPulse>
      <View style={styles.recentCard}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: Colors.lightGray,
          }}
        />
        <View style={{ flex: 1 }}>
          <View
            style={{
              width: "60%",
              height: 14,
              borderRadius: 6,
              backgroundColor: Colors.lightGray,
            }}
          />
          <View
            style={{
              width: "40%",
              height: 12,
              borderRadius: 6,
              backgroundColor: Colors.lightGray,
              marginTop: 5,
            }}
          />
        </View>
      </View>
    </SkeletonPulse>
  );
}

function getScoreColor(score: number): string {
  if (score <= 30) return Colors.scoreRed;
  if (score <= 60) return Colors.scoreAmber;
  return Colors.scoreGreen;
}

function getScoreColorLight(score: number): string {
  if (score <= 30) return "#FFEBEE";
  if (score <= 60) return "#FFF3E0";
  return "#E8F5E9";
}

function getScoreLabel(score: number): string {
  if (score <= 30) return "Avoid";
  if (score <= 50) return "Caution";
  if (score <= 70) return "Okay";
  if (score <= 85) return "Good";
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

function getInsightText(avgScore: number, weeklyScans: number, totalScans: number): { icon: string; text: string } {
  if (totalScans === 0) {
    return { icon: "sparkles", text: "Scan your first product to get personalized insights" };
  }
  if (avgScore >= 75) {
    return { icon: "trophy", text: "Your choices are looking great! Keep making smart picks" };
  }
  if (avgScore >= 55) {
    return { icon: "trending-up", text: `Avg score: ${Math.round(avgScore)} — try swapping a few items for better picks` };
  }
  if (avgScore >= 35) {
    return { icon: "bulb", text: `Avg score: ${Math.round(avgScore)} — check out your Top Picks in Profile for ideas` };
  }
  return { icon: "heart", text: `Avg score: ${Math.round(avgScore)} — every scan helps you learn what works for you` };
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <View style={[styles.scoreBadge, { backgroundColor: getScoreColorLight(score) }]}>
      <Text style={[styles.scoreBadgeText, { color: getScoreColor(score) }]}>{score}</Text>
    </View>
  );
}

function ProductCard({
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
        style={styles.productCard}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.productAccentLine} />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.productBrand} numberOfLines={1}>
            {item.brand || "Unknown brand"}
          </Text>
          <View style={styles.productMeta}>
            <Text style={styles.productMetaText}>
              {item.calories ? `${Math.round(item.calories)} cal` : ""}
            </Text>
            {item.category ? (
              <View style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{item.category}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.lightGray} />
      </TouchableOpacity>
    </Animated.View>
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
  const scoreLabelColor = getScoreColor(item.score);
  const timeAgo = item.createdAt ? getRelativeTime(item.createdAt) : "";

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
      <TouchableOpacity
        style={styles.recentCard}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <ScoreBadge score={item.score} />
        <View style={{ flex: 1 }}>
          <Text style={styles.recentName} numberOfLines={1}>
            {item.productName}
          </Text>
          <View style={styles.recentMeta}>
            {item.productBrand ? (
              <Text style={styles.recentBrand} numberOfLines={1}>
                {item.productBrand}
              </Text>
            ) : null}
            {item.productCategory ? (
              <View style={styles.recentCategoryDot} />
            ) : null}
            {item.productCategory ? (
              <Text style={styles.recentCategory} numberOfLines={1}>
                {item.productCategory}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.recentRight}>
          <View style={[styles.scoreLabelTag, { backgroundColor: getScoreColorLight(item.score) }]}>
            <Text style={[styles.scoreLabelText, { color: scoreLabelColor }]}>
              {scoreLabel}
            </Text>
          </View>
          {timeAgo ? (
            <Text style={styles.recentTime}>{timeAgo}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function ScanProgressBar({ used, total }: { used: number; total: number }) {
  const ratio = Math.min(used / total, 1);
  const isNearLimit = used >= 8;
  const barColor = isNearLimit ? Colors.scoreAmber : Colors.primary;

  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${ratio * 100}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      <Text style={[styles.progressText, isNearLimit && { color: Colors.scoreAmber }]}>
        {used}/{total}
      </Text>
    </View>
  );
}

function ScanButtonWithGlow({ onPress }: { onPress: () => void }) {
  const glowOpacity = useSharedValue(0.2);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(0.45, { duration: 1500 }),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    ...coloredShadow(Colors.primary, "medium"),
    shadowOpacity: glowOpacity.value,
  }));

  return (
    <Animated.View style={[styles.scanButtonGlowWrap, glowStyle]}>
      <TouchableOpacity
        style={styles.scanButton}
        onPress={onPress}
      >
        <Ionicons name="scan" size={22} color={Colors.white} />
      </TouchableOpacity>
    </Animated.View>
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

  const insight = getInsightText(
    stats?.avgScore || 0,
    stats?.weeklyScans || 0,
    stats?.totalScans || 0
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        renderItem={null}
        refreshControl={
          <RefreshControl
            refreshing={!!popularQuery.isRefetching || !!historyQuery.isRefetching || !!scansQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListHeaderComponent={
          <>
            <LinearGradient
              colors={["#EDF2EF", "#F1F5F3", "#F6F8F7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.headerGradient,
                { paddingTop: (insets.top || webTopInset) + 16 },
              ]}
            >
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.greeting}>
                    {getGreeting()}
                    {user?.name ? `, ${user.name.split(" ")[0]}` : ""}
                  </Text>
                  {!user?.isPro && (
                    <ScanProgressBar used={scansToday} total={10} />
                  )}
                  {user?.isPro && (
                    <View style={styles.proBadgeRow}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.proLabel}>Pro Member</Text>
                    </View>
                  )}
                </View>
                <ScanButtonWithGlow onPress={handleScanPress} />
              </View>
            </LinearGradient>

            {!statsQuery.isLoading && (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.insightCard}>
                <Ionicons
                  name={insight.icon as any}
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.insightText}>{insight.text}</Text>
              </Animated.View>
            )}

            {recentScans.length === 0 && !historyQuery.isLoading && (
              <Animated.View entering={FadeInDown.duration(400)} style={styles.welcomeCard}>
                <View style={styles.welcomeIconWrap}>
                  <Ionicons name="nutrition-outline" size={36} color={Colors.primary} />
                </View>
                <Text style={styles.welcomeTitle}>Welcome to FoodVAR</Text>
                <Text style={styles.welcomeSubtitle}>
                  Scan your first product to get a personalized health score based on your profile.
                </Text>
                <LinearGradient
                  colors={["#3DD68C", "#2EC4B6"]}
                  style={styles.welcomeBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <TouchableOpacity style={styles.welcomeBtn} onPress={handleScanPress} activeOpacity={0.8}>
                    <Ionicons name="scan" size={20} color={Colors.white} />
                    <Text style={styles.welcomeBtnText}>Scan a Product</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </Animated.View>
            )}

            {historyQuery.isLoading && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Scans</Text>
                </View>
                {[0, 1, 2].map((i) => (
                  <SkeletonRecentCard key={i} />
                ))}
              </View>
            )}

            {!historyQuery.isLoading && recentScans.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Scans</Text>
                  <TouchableOpacity onPress={() => router.push("/(tabs)/history")}>
                    <Text style={styles.seeAll}>See All</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.recentListCard}>
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
                </View>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Popular Products</Text>
              </View>
              {popularQuery.isLoading && (
                <>
                  {[0, 1, 2].map((i) => (
                    <SkeletonProductCard key={i} />
                  ))}
                </>
              )}
              {!popularQuery.isLoading && popular.map((item: any, i: number) => (
                <ProductCard
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
                  <View style={styles.contributeAccentLine} />
                  <View style={styles.contributeIconWrap}>
                    <Ionicons name="add" size={20} color="#FF8A65" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contributeTitle}>Know a product we don't have?</Text>
                    <Text style={styles.contributeSubtitle}>Add it to help others</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.lightGray} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.screenBg,
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
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.charcoal,
    letterSpacing: -0.5,
  },
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.lightGray,
    maxWidth: 120,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.mediumGray,
  },
  proBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  proLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  scanButtonGlowWrap: {
    borderRadius: 26,
  },
  scanButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#3DD68C",
    alignItems: "center",
    justifyContent: "center",
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    ...cardShadow("subtle"),
  },
  insightText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.charcoal,
    flex: 1,
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.charcoal,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "600",
  },
  recentListCard: {
    borderRadius: 16,
    backgroundColor: Colors.white,
    padding: 6,
    ...cardShadow("medium"),
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
    ...cardShadow("subtle"),
  },
  productAccentLine: {
    width: 3,
    height: "70%" as any,
    borderRadius: 1.5,
    backgroundColor: Colors.primaryPale,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.charcoal,
  },
  productBrand: {
    fontSize: 13,
    color: Colors.mediumGray,
    marginTop: 2,
  },
  productMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  productMetaText: {
    fontSize: 12,
    color: Colors.mediumGray,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Colors.primaryPale,
  },
  categoryTagText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "600",
  },
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    gap: 10,
  },
  recentName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.charcoal,
  },
  recentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  recentBrand: {
    fontSize: 12,
    color: Colors.mediumGray,
  },
  recentCategoryDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.lightGray,
  },
  recentCategory: {
    fontSize: 12,
    color: Colors.mediumGray,
  },
  recentRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  scoreLabelTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scoreLabelText: {
    fontSize: 11,
    fontWeight: "700",
  },
  recentTime: {
    fontSize: 10,
    color: Colors.mediumGray,
    fontWeight: "500",
  },
  scoreBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  scoreBadgeText: {
    fontSize: 16,
    fontWeight: "800",
  },
  emptyText: {
    textAlign: "center",
    color: Colors.mediumGray,
    fontSize: 14,
    paddingVertical: 24,
  },
  welcomeCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 28,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: "center" as const,
    ...cardShadow("medium"),
  },
  welcomeIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryPale,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.charcoal,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: Colors.mediumGray,
    textAlign: "center" as const,
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 260,
  },
  welcomeBtnGradient: {
    borderRadius: 16,
  },
  welcomeBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  welcomeBtnText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.white,
  },
  contributeCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.white,
    ...cardShadow("subtle"),
  },
  contributeAccentLine: {
    width: 3,
    height: "70%" as any,
    borderRadius: 1.5,
    backgroundColor: Colors.primary,
  },
  contributeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFF3E0",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  contributeTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.charcoal,
  },
  contributeSubtitle: {
    fontSize: 12,
    color: Colors.mediumGray,
    marginTop: 2,
  },
});
