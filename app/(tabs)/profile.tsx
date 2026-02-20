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
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import Colors, { cardShadow, coloredShadow } from "@/constants/colors";
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
  if (score <= 30) return "Needs work";
  if (score <= 50) return "Getting there";
  if (score <= 70) return "Pretty good";
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

function dedupeProducts(products: StatsProduct[]): StatsProduct[] {
  const seen = new Set<number>();
  return products.filter((p) => {
    if (seen.has(p.productId)) return false;
    seen.add(p.productId);
    return true;
  });
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
        colors={["#1B5E20", "#2E7D32", "#43A047"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: (insets.top || webTopInset) + 12 }]}
      >
        <View style={styles.headerContent}>
          {editing ? (
            <>
              <View style={styles.avatarOuterGlow}>
                <View style={styles.avatarWrap}>
                  <Text style={styles.avatarText}>
                    {(name || user.name || user.email).charAt(0).toUpperCase()}
                  </Text>
                </View>
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
                    <Ionicons name="close" size={20} color={Colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editSaveBtn} onPress={handleSave}>
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
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
                <View style={styles.avatarOuterGlow}>
                  <View style={styles.avatarWrap}>
                    <Text style={styles.avatarText}>
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.userName}>{user.name || "User"}</Text>
                {user.email?.includes("@") && (
                  <Text style={styles.userEmail}>{user.email}</Text>
                )}
                <View style={styles.editHint}>
                  <Ionicons name="pencil" size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.editHintText}>Tap to edit</Text>
                </View>
              </TouchableOpacity>
              {user.isPro && (
                <View style={styles.proBadge}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={styles.proBadgeText}>Pro</Text>
                </View>
              )}
            </>
          )}
        </View>
      </LinearGradient>

      <View style={styles.motivationalWrap}>
        <Ionicons
          name={
            !stats || stats.totalScans === 0
              ? "sparkles"
              : stats.avgScore >= 55
                ? "heart"
                : "trending-up"
          }
          size={16}
          color={Colors.primary}
        />
        <Text style={styles.motivationalText}>
          {getMotivationalText(stats)}
        </Text>
      </View>

      {statsLoading ? (
        <View style={styles.statsContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "#E8F5E9" }]}>
              <Ionicons name="scan-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{stats?.totalScans ?? 0}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconWrap,
                {
                  backgroundColor: stats?.avgScore
                    ? getScoreColorLight(stats.avgScore)
                    : "#F5F5F5",
                },
              ]}
            >
              <Ionicons
                name="speedometer-outline"
                size={18}
                color={stats?.avgScore ? getScoreColor(stats.avgScore) : Colors.mediumGray}
              />
            </View>
            <Text
              style={[
                styles.statValue,
                {
                  color: stats?.avgScore
                    ? getScoreColor(stats.avgScore)
                    : Colors.charcoal,
                },
              ]}
            >
              {stats?.avgScore ? Math.round(stats.avgScore) : "--"}
            </Text>
            <Text style={styles.statLabel}>Avg Score</Text>
            {stats?.avgScore ? (
              <Text
                style={[
                  styles.statSublabel,
                  { color: getScoreColor(stats.avgScore) },
                ]}
              >
                {getScoreLabel(stats.avgScore)}
              </Text>
            ) : null}
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: "#E3F2FD" }]}>
              <Ionicons name="calendar-outline" size={18} color="#1976D2" />
            </View>
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
            <View style={[styles.sectionIconWrap, { backgroundColor: "#E8F5E9" }]}>
              <Ionicons name="trophy" size={16} color={Colors.scoreGreen} />
            </View>
            <Text style={styles.sectionTitle}>Your Top Picks</Text>
          </View>
          {bestProducts.map((product, index) => (
            <View key={`best-${product.productId}-${index}`} style={styles.productRow}>
              <View
                style={[
                  styles.scoreBadge,
                  { backgroundColor: getScoreColorLight(product.score), borderWidth: 1, borderColor: getScoreColor(product.score) + "33" },
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
              <Ionicons name="chevron-forward" size={16} color={Colors.lightGray} />
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
            <View style={[styles.sectionIconWrap, { backgroundColor: "#FFEBEE" }]}>
              <Ionicons name="alert-circle" size={16} color={Colors.scoreRed} />
            </View>
            <Text style={styles.sectionTitle}>Watch Out For</Text>
          </View>
          {worstProducts.map((product, index) => (
            <View key={`worst-${product.productId}-${index}`} style={styles.productRow}>
              <View
                style={[
                  styles.scoreBadge,
                  { backgroundColor: getScoreColorLight(product.score), borderWidth: 1, borderColor: getScoreColor(product.score) + "33" },
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
              <Ionicons name="chevron-forward" size={16} color={Colors.lightGray} />
            </View>
          ))}
        </Animated.View>
      )}

      <Animated.View
        entering={FadeInDown.delay(300).duration(400)}
        style={styles.sectionCard}
      >
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconWrap, { backgroundColor: "#E8F5E9" }]}>
            <Ionicons name="heart" size={16} color={Colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>Health Profile</Text>
        </View>

        <View style={styles.profileGrid}>
          <View style={styles.profileItem}>
            <View style={[styles.profileItemIcon, { backgroundColor: "#E8F5E9" }]}>
              <Ionicons name="fitness-outline" size={16} color={Colors.primary} />
            </View>
            <Text style={styles.profileLabel}>Conditions</Text>
            <Text style={styles.profileValue} numberOfLines={2}>
              {conditions || "None"}
            </Text>
          </View>

          <View style={styles.profileItem}>
            <View style={[styles.profileItemIcon, { backgroundColor: "#FFEBEE" }]}>
              <Ionicons name="warning-outline" size={16} color={Colors.danger} />
            </View>
            <Text style={styles.profileLabel}>Allergies</Text>
            <Text style={styles.profileValue} numberOfLines={2}>
              {allergies || "None"}
            </Text>
          </View>

          <View style={styles.profileItem}>
            <View style={[styles.profileItemIcon, { backgroundColor: "#E3F2FD" }]}>
              <Ionicons name="flag-outline" size={16} color="#1976D2" />
            </View>
            <Text style={styles.profileLabel}>Goal</Text>
            <Text style={styles.profileValue} numberOfLines={2}>
              {goal}
            </Text>
          </View>

          {user.dietaryPreference && user.dietaryPreference !== "none" && (
            <View style={styles.profileItem}>
              <View style={[styles.profileItemIcon, { backgroundColor: "#F1F8E9" }]}>
                <Ionicons name="leaf-outline" size={16} color="#558B2F" />
              </View>
              <Text style={styles.profileLabel}>Diet</Text>
              <Text style={styles.profileValue} numberOfLines={2}>
                {user.dietaryPreference.charAt(0).toUpperCase() +
                  user.dietaryPreference.slice(1)}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.editProfileBtn} onPress={handleEditProfile}>
          <Ionicons name="create-outline" size={18} color={Colors.primary} />
          <Text style={styles.editProfileBtnText}>Edit Health Profile</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.screenBg,
  },
  headerGradient: {
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: {
    alignItems: "center",
  },
  headerTouchable: {
    alignItems: "center",
  },
  avatarOuterGlow: {
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 36,
    padding: 3,
    marginBottom: 10,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.5)",
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.white,
  },
  userName: {
    fontSize: 21,
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: -0.5,
  },
  userEmail: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
  },
  editHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  editHintText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  proBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.white,
  },
  motivationalWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: -16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.04)",
    ...cardShadow("medium"),
  },
  motivationalText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.charcoal,
    flex: 1,
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.04)",
    ...cardShadow("subtle"),
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.charcoal,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.mediumGray,
    marginTop: 3,
    fontWeight: "500",
  },
  statSublabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  sectionCard: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 18,
    borderRadius: 18,
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.04)",
    ...cardShadow("subtle"),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.charcoal,
    letterSpacing: -0.3,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 6,
    ...cardShadow("subtle"),
  },
  scoreBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBadgeText: {
    fontSize: 15,
    fontWeight: "800",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.charcoal,
  },
  productBrand: {
    fontSize: 12,
    color: Colors.mediumGray,
    marginTop: 2,
  },
  profileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  profileItem: {
    width: "47%" as any,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.04)",
  },
  profileItemIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  profileLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  profileValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.charcoal,
    lineHeight: 19,
  },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primaryPale,
    borderWidth: 1,
    borderColor: Colors.primary + "33",
    ...cardShadow("subtle"),
  },
  editProfileBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  logoutSection: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    ...cardShadow("subtle"),
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.danger,
  },
  editFields: {
    width: "100%",
    paddingHorizontal: 32,
    marginTop: 4,
    gap: 10,
    alignItems: "center",
  },
  editInput: {
    width: "100%",
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.white,
    fontWeight: "500",
    textAlign: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  editCancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  editSaveBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
});
