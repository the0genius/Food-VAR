import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { MotiView } from "moti";
import {
  Trophy,
  Warning,
  Crown,
  SignOut,
  PencilSimple,
  X,
  Check,
  Heartbeat,
  WarningCircle,
  Flag,
  Leaf,
  Sparkle,
  Heart,
  TrendUp,
  Scan,
  Speedometer,
  CalendarBlank,
  CaretRight,
} from "phosphor-react-native";
import Colors, { C, cardShadow, coloredShadow } from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";

const CONDITIONS_MAP: Record<string, string> = {
  diabetes_type2: "Diabetes (Type 2)",
  diabetes_type1: "Diabetes (Type 1)",
  hypertension: "Hypertension",
  high_cholesterol: "High Cholesterol",
  kidney_disease: "Kidney Disease",
  gout: "Gout",
  ibs: "IBS",
  celiac: "Celiac Disease",
};

const GOALS_MAP: Record<string, string> = {
  weight_loss: "Lose Weight",
  muscle_gain: "Build Muscle",
  general_wellness: "General Wellness",
  manage_condition: "Manage Condition",
};

interface StatsProduct {
  productName: string;
  productBrand: string;
  score: number;
  productId: number;
}

interface StatsData {
  totalScans: number;
  avgScore: number;
  weeklyScans: number;
  bestProducts: StatsProduct[];
  worstProducts: StatsProduct[];
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
  if (score === 0) return "Allergen alert";
  if (score <= 15) return "Needs work";
  if (score <= 35) return "High risk";
  if (score <= 50) return "Getting there";
  if (score <= 74) return "Pretty good";
  if (score <= 85) return "Great choices";
  return "Amazing";
}

function getMotivationalText(stats: StatsData | undefined): string {
  if (!stats || stats.totalScans === 0) return "Start scanning to see your insights here";
  if (stats.avgScore >= 75) return "You're making amazing choices! Keep it up";
  if (stats.avgScore >= 55) return "You're on the right track — small changes add up";
  if (stats.avgScore >= 35) return "Every scan helps you learn — keep going!";
  return "Knowledge is power — you're learning what works for you";
}

function getMotivationalBorderColor(stats: StatsData | undefined): string {
  if (!stats || stats.totalScans === 0) return C.mint;
  return getScoreColor(stats.avgScore);
}

function dedupeProducts(products: StatsProduct[]): StatsProduct[] {
  const seen = new Set<number>();
  return products.filter((p) => {
    if (seen.has(p.productId)) return false;
    seen.add(p.productId);
    return true;
  });
}

function SkeletonBlock({ width, height, style }: { width: number | string; height: number; style?: any }) {
  return (
    <MotiView
      from={{ opacity: 0.4 }}
      animate={{ opacity: 0.9 }}
      transition={{ loop: true, type: "timing" as const, duration: 850 }}
      style={[{ backgroundColor: "#EBEBEB", borderRadius: 12, width, height }, style]}
    />
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateProfile, logout } = useUser();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [age, setAge] = useState(user?.age ? String(user.age) : "");

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: stats, isLoading: statsLoading } = useQuery<StatsData>({
    queryKey: ["/api/stats", String(user?.id)],
    enabled: !!user?.id,
  });

  async function handleSave() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateProfile({
        name: name.trim(),
        age: age ? parseInt(age) : null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(false);
    } catch (e) {
      console.error(e);
      Alert.alert("Oops", "Could not save your changes. Please try again.");
    }
  }

  function handleLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/onboarding");
        },
      },
    ]);
  }

  function handleEditProfile() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/edit-profile");
  }

  if (!user) return null;

  const conditions = (user.conditions || [])
    .map((c: string) => CONDITIONS_MAP[c] || c)
    .join(", ");
  const allergies = (user.allergies || []).join(", ");
  const goal = GOALS_MAP[user.goal || ""] || user.goal || "General Wellness";

  const bestProducts = dedupeProducts(stats?.bestProducts || []).slice(0, 3);
  const worstProducts = dedupeProducts(stats?.worstProducts || []).slice(0, 3);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 100,
      }}
    >
      <LinearGradient
        colors={["#1B5E20", "#2E7D32", "#388E3C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: (insets.top || webTopInset) + 12 }]}
      >
        <View style={styles.headerContent}>
          {editing ? (
            <>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={["#3DD68C", "#81C784"]}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarText}>
                    {(name || user.name || user.email).charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
                <View style={styles.avatarRing} />
              </View>
              <View style={styles.editFields}>
                <TextInput
                  style={styles.editInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  autoFocus
                />
                <TextInput
                  style={styles.editInput}
                  value={age}
                  onChangeText={setAge}
                  placeholder="Age"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.editCancelBtn}
                    onPress={() => {
                      setEditing(false);
                      setName(user?.name || "");
                      setAge(user?.age ? String(user.age) : "");
                    }}
                  >
                    <X size={20} color={Colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editSaveBtn} onPress={handleSave}>
                    <Check size={20} color={C.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEditing(true);
                }}
                activeOpacity={0.8}
                style={styles.headerTouchable}
              >
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={["#3DD68C", "#81C784"]}
                    style={styles.avatarGradient}
                  >
                    <Text style={styles.avatarText}>
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <View style={styles.avatarRing} />
                </View>
                <Text style={styles.userName}>{user.name || "User"}</Text>
                {user.email?.includes("@") && (
                  <Text style={styles.userEmail}>{user.email}</Text>
                )}
                <View style={styles.editHint}>
                  <PencilSimple size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.editHintText}>Tap to edit</Text>
                </View>
              </TouchableOpacity>
              {user.isPro && (
                <LinearGradient
                  colors={["#FFD700", "#FFA000"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.proBadge}
                >
                  <Crown size={12} color="white" weight="fill" />
                  <Text style={styles.proBadgeText}>PRO MEMBER</Text>
                </LinearGradient>
              )}
            </>
          )}
        </View>
      </LinearGradient>

      <View style={[styles.motivationalWrap, { borderLeftWidth: 3, borderLeftColor: getMotivationalBorderColor(stats) }]}>
        {!stats || stats.totalScans === 0 ? (
          <Sparkle size={16} color={C.primary} weight="fill" />
        ) : stats.avgScore >= 55 ? (
          <Heart size={16} color={C.primary} weight="fill" />
        ) : (
          <TrendUp size={16} color={C.primary} />
        )}
        <Text style={styles.motivationalText}>
          {getMotivationalText(stats)}
        </Text>
      </View>

      {statsLoading ? (
        <View style={styles.statsContainer}>
          <SkeletonBlock width="100%" height={90} style={{ flex: 1 }} />
          <SkeletonBlock width="100%" height={90} style={{ flex: 1 }} />
          <SkeletonBlock width="100%" height={90} style={{ flex: 1 }} />
        </View>
      ) : (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.totalScans ?? 0}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>

          <View style={styles.statCard}>
            <Text
              style={[
                styles.statValue,
                {
                  color: stats?.avgScore
                    ? getScoreColor(stats.avgScore)
                    : C.text,
                },
              ]}
            >
              {stats?.avgScore ? Math.round(stats.avgScore) : "--"}
            </Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.weeklyScans ?? 0}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
        </Animated.View>
      )}

      {bestProducts.length > 0 && (
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.sectionCard}
        >
          <View style={styles.sectionHeader}>
            <Trophy size={18} color={C.green} weight="fill" />
            <Text style={styles.sectionTitle}>Your Top Picks</Text>
          </View>
          {bestProducts.map((product, index) => (
            <View key={`best-${product.productId}-${index}`} style={styles.productRow}>
              <View
                style={[
                  styles.scoreBadge,
                  { backgroundColor: getScoreColorLight(product.score) },
                ]}
              >
                <Text
                  style={[
                    styles.scoreBadgeText,
                    { color: getScoreColor(product.score) },
                  ]}
                >
                  {Math.round(product.score)}
                </Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>
                  {product.productName}
                </Text>
                <Text style={styles.productBrand} numberOfLines={1}>
                  {product.productBrand}
                </Text>
              </View>
            </View>
          ))}
        </Animated.View>
      )}

      {worstProducts.length > 0 && (
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.sectionCard}
        >
          <View style={styles.sectionHeader}>
            <Warning size={18} color={C.danger} weight="fill" />
            <Text style={styles.sectionTitle}>Watch Out For</Text>
          </View>
          {worstProducts.map((product, index) => (
            <View key={`worst-${product.productId}-${index}`} style={styles.productRow}>
              <View
                style={[
                  styles.scoreBadge,
                  { backgroundColor: getScoreColorLight(product.score) },
                ]}
              >
                <Text
                  style={[
                    styles.scoreBadgeText,
                    { color: getScoreColor(product.score) },
                  ]}
                >
                  {Math.round(product.score)}
                </Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>
                  {product.productName}
                </Text>
                <Text style={styles.productBrand} numberOfLines={1}>
                  {product.productBrand}
                </Text>
              </View>
            </View>
          ))}
        </Animated.View>
      )}

      <Animated.View
        entering={FadeInDown.delay(300).duration(400)}
        style={styles.healthCard}
      >
        <View style={styles.sectionHeader}>
          <Heart size={18} color={C.primary} weight="fill" />
          <Text style={styles.sectionTitle}>Health Profile</Text>
        </View>

        <View style={styles.profileGrid}>
          <View style={styles.profileItem}>
            <LinearGradient
              colors={["#FFE8E8", "#FFD0D0"]}
              style={styles.profileItemIcon}
            >
              <Heartbeat size={17} color="#E53935" weight="fill" />
            </LinearGradient>
            <Text style={styles.profileLabel}>CONDITIONS</Text>
            <Text style={styles.profileValue} numberOfLines={2}>
              {conditions || "None"}
            </Text>
          </View>

          <View style={styles.profileItem}>
            <LinearGradient
              colors={["#FFF3E0", "#FFE8C0"]}
              style={styles.profileItemIcon}
            >
              <WarningCircle size={17} color="#FB8C00" weight="fill" />
            </LinearGradient>
            <Text style={styles.profileLabel}>ALLERGIES</Text>
            <Text style={styles.profileValue} numberOfLines={2}>
              {allergies || "None"}
            </Text>
          </View>

          <View style={styles.profileItem}>
            <LinearGradient
              colors={["#E8F5E9", "#C8E6C9"]}
              style={styles.profileItemIcon}
            >
              <Flag size={17} color={C.primary} weight="fill" />
            </LinearGradient>
            <Text style={styles.profileLabel}>GOAL</Text>
            <Text style={styles.profileValue} numberOfLines={2}>
              {goal}
            </Text>
          </View>

          {user.dietaryPreference && user.dietaryPreference !== "none" && (
            <View style={styles.profileItem}>
              <LinearGradient
                colors={["#E0F7FA", "#B2EBF2"]}
                style={styles.profileItemIcon}
              >
                <Leaf size={17} color={C.teal} weight="fill" />
              </LinearGradient>
              <Text style={styles.profileLabel}>DIET</Text>
              <Text style={styles.profileValue} numberOfLines={2}>
                {user.dietaryPreference.charAt(0).toUpperCase() +
                  user.dietaryPreference.slice(1)}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.editProfileBtn} onPress={handleEditProfile}>
          <Text style={styles.editProfileBtnText}>Edit Health Profile</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <SignOut size={16} color="#E53935" />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  headerGradient: {
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: {
    alignItems: "center",
  },
  headerTouchable: {
    alignItems: "center",
  },
  avatarContainer: {
    width: 76,
    height: 76,
    marginBottom: 12,
    position: "relative" as const,
  },
  avatarGradient: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    position: "absolute" as const,
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 41,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: "900" as const,
    color: Colors.white,
  },
  userName: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  userEmail: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginTop: 3,
  },
  editHint: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginTop: 8,
  },
  editHintText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500" as const,
  },
  proBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: Colors.white,
    letterSpacing: 1,
    marginLeft: 5,
  },
  motivationalWrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginHorizontal: 16,
    marginTop: -20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.border,
    zIndex: 10,
    ...cardShadow("medium"),
  },
  motivationalText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: C.text,
    flex: 1,
    lineHeight: 21,
  },
  statsContainer: {
    flexDirection: "row" as const,
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    alignItems: "center" as const,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.border,
    ...cardShadow("subtle"),
  },
  statValue: {
    fontSize: 26,
    fontWeight: "900" as const,
    color: C.text,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 11,
    color: C.muted,
    marginTop: 3,
    fontWeight: "500" as const,
    textAlign: "center" as const,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.border,
    ...cardShadow("medium"),
  },
  healthCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.border,
    ...cardShadow("medium"),
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: C.text,
    letterSpacing: -0.3,
  },
  productRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderColor: C.divider,
  },
  scoreBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  scoreBadgeText: {
    fontSize: 14,
    fontWeight: "800" as const,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: C.text,
  },
  productBrand: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  profileGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 10,
    marginBottom: 16,
  },
  profileItem: {
    width: "47%" as any,
    backgroundColor: C.bg,
    borderRadius: 16,
    padding: 14,
  },
  profileItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  profileLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: C.placeholder,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginTop: 10,
  },
  profileValue: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: C.text,
    marginTop: 3,
    lineHeight: 18,
  },
  editProfileBtn: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.primary,
    backgroundColor: "transparent",
  },
  editProfileBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: C.primary,
  },
  logoutSection: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  logoutBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 12,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#E53935",
  },
  editFields: {
    width: "100%" as any,
    paddingHorizontal: 32,
    marginTop: 4,
    gap: 10,
    alignItems: "center" as const,
  },
  editInput: {
    width: "100%" as any,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.white,
    fontWeight: "500" as const,
    textAlign: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  editActions: {
    flexDirection: "row" as const,
    gap: 12,
    marginTop: 4,
  },
  editCancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  editSaveBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
});
