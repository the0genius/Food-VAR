import { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
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

function ScoreBadge({ score }: { score: number }) {
  const color =
    score <= 30
      ? Colors.scoreRed
      : score <= 60
        ? Colors.scoreAmber
        : Colors.scoreGreen;
  return (
    <View style={[styles.scoreBadge, { backgroundColor: color }]}>
      <Text style={styles.scoreBadgeText}>{score}</Text>
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
          <Text style={styles.recentBrand} numberOfLines={1}>
            {item.productBrand || ""}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.lightGray} />
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

  const popular = (popularQuery.data || []) as any[];
  const recentScans = (historyQuery.data || []).slice(0, 5) as any[];
  const scansToday = (scansQuery.data as any)?.count || 0;
  const isRefreshing = popularQuery.isFetching || historyQuery.isFetching || scansQuery.isFetching;

  async function handleRefresh() {
    await Promise.all([
      popularQuery.refetch(),
      historyQuery.refetch(),
      scansQuery.refetch(),
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
              colors={[Colors.primaryPale, Colors.white]}
              style={[
                styles.headerGradient,
                { paddingTop: (insets.top || webTopInset) + 16 },
              ]}
            >
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.greeting}>
                    {getGreeting()}
                    {user?.name ? `, ${user.name.split(" ")[0]}` : ""}
                  </Text>
                  <Text style={styles.subtitle}>
                    {user?.isPro
                      ? "Pro Member"
                      : `${scansToday}/10 scans used today`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={handleScanPress}
                >
                  <Ionicons name="scan" size={22} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {recentScans.length === 0 && !historyQuery.isLoading && (
              <Animated.View entering={FadeInDown.duration(400)} style={styles.welcomeCard}>
                <View style={styles.welcomeIconWrap}>
                  <Ionicons name="nutrition-outline" size={36} color={Colors.primary} />
                </View>
                <Text style={styles.welcomeTitle}>Welcome to FoodVAR</Text>
                <Text style={styles.welcomeSubtitle}>
                  Scan your first product to get a personalized health score based on your profile.
                </Text>
                <TouchableOpacity style={styles.welcomeBtn} onPress={handleScanPress} activeOpacity={0.8}>
                  <Ionicons name="scan" size={20} color={Colors.white} />
                  <Text style={styles.welcomeBtnText}>Scan a Product</Text>
                </TouchableOpacity>
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
                  <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
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
    backgroundColor: Colors.white,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.charcoal,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.mediumGray,
    marginTop: 4,
    fontWeight: "500",
  },
  scanButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
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
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: Colors.softWhite,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
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
    padding: 12,
    backgroundColor: Colors.softWhite,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
  },
  recentName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.charcoal,
  },
  recentBrand: {
    fontSize: 13,
    color: Colors.mediumGray,
    marginTop: 1,
  },
  scoreBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBadgeText: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.white,
  },
  emptyText: {
    textAlign: "center",
    color: Colors.mediumGray,
    fontSize: 14,
    paddingVertical: 24,
  },
  welcomeCard: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 20,
    padding: 28,
    borderRadius: 20,
    backgroundColor: Colors.primaryPale,
    alignItems: "center" as const,
  },
  welcomeIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.white,
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
  welcomeBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: Colors.primary,
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
    marginTop: 8,
    marginBottom: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
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
