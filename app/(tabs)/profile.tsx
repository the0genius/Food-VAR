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
  SignOut,
  PencilSimple,
  X,
  Check,
  Heartbeat,
  WarningCircle,
  Flag,
  Leaf,
  Scan,
  Speedometer,
  CalendarBlank,
  CaretRight,
  Shield,
  GearSix,
  Fire,
  Export,
  Trash,
  FileText,
  ShieldCheck,
} from "phosphor-react-native";
import Colors, { C, cardShadow, getScoreColor, getScoreBgColor, getScoreShortLabel, useThemeColors } from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";

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

function getScoreColorLight(score: number): string {
  return getScoreBgColor(score);
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
  const theme = useThemeColors();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [age, setAge] = useState(user?.age ? String(user.age) : "");

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: stats, isLoading: statsLoading } = useQuery<StatsData>({
    queryKey: ["/api/stats"],
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

  async function handleExportData() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await apiRequest("GET", "/api/auth/export");
      const data = await res.json();
      const json = JSON.stringify(data, null, 2);
      if (Platform.OS === "web") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "foodvar-data-export.json";
        a.click();
        URL.revokeObjectURL(url);
      }
      Alert.alert("Data Exported", "Your data has been exported successfully.");
    } catch (e) {
      Alert.alert("Export Failed", "Could not export your data. Please try again.");
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest("DELETE", "/api/auth/account");
              await logout();
              router.replace("/onboarding");
            } catch (e) {
              Alert.alert("Error", "Could not delete your account. Please try again.");
            }
          },
        },
      ]
    );
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
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={{
        paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 80,
      }}
    >
      {/* 1. Minimal Top Bar */}
      <LinearGradient
        colors={["#F0FAF4", C.bg]}
        style={[styles.topBar, { paddingTop: (insets.top || webTopInset) + 12 }]}
      >
        <Animated.Text
          entering={FadeInDown.duration(400)}
          style={styles.topBarTitle}
        >
          {user.name || "Your"}'s Profile
        </Animated.Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={handleEditProfile}
          activeOpacity={0.7}
          accessibilityLabel="Edit health profile"
          accessibilityRole="button"
        >
          <GearSix size={20} color={C.muted} />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.content}>

        {/* 2. Avatar + Identity Card */}
        {editing ? (
          <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.identityCard}>
            <LinearGradient
              colors={["#3DD68C", "#2E7D32"]}
              style={styles.avatarCircle}
            >
              <Text style={styles.avatarText}>
                {(name || user.name || user.email).charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={styles.editFieldsWrap}>
              <TextInput
                style={styles.editInput}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={C.placeholder}
                autoFocus
              />
              <TextInput
                style={styles.editInput}
                value={age}
                onChangeText={setAge}
                placeholder="Age"
                placeholderTextColor={C.placeholder}
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
                  <X size={18} color={C.danger} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editSaveBtn} onPress={handleSave}>
                  <Check size={18} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <TouchableOpacity
              style={styles.identityCard}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setEditing(true);
              }}
            >
              <LinearGradient
                colors={["#3DD68C", "#2E7D32"]}
                style={styles.avatarCircle}
              >
                <Text style={styles.avatarText}>
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
              <View style={styles.identityInfo}>
                <View style={styles.identityRow}>
                  <Text style={styles.identityName} numberOfLines={1}>{user.name || "User"}</Text>
                  <Text style={styles.editLink}>Edit</Text>
                </View>
                {user.email?.includes("@") && (
                  <Text style={styles.identityEmail} numberOfLines={1}>{user.email}</Text>
                )}
                {user.age && (
                  <Text style={styles.identityAge}>Age {user.age}</Text>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* 3. Stat Widgets Row */}
        {statsLoading ? (
          <View style={styles.statRow}>
            <SkeletonBlock width="31%" height={100} style={{ borderRadius: 20 }} />
            <SkeletonBlock width="31%" height={100} style={{ borderRadius: 20 }} />
            <SkeletonBlock width="31%" height={100} style={{ borderRadius: 20 }} />
          </View>
        ) : (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statRow}>
            <View style={styles.statWidget}>
              <View style={styles.statWidgetIconWrap}>
                <Scan size={14} color={C.green} />
              </View>
              <View style={styles.statWidgetBottom}>
                <Text style={styles.statWidgetValue}>{stats?.totalScans ?? 0}</Text>
                <Text style={styles.statWidgetLabel}>Total Scans</Text>
              </View>
            </View>

            <View style={styles.statWidget}>
              <View style={styles.statWidgetIconWrap}>
                <Speedometer
                  size={14}
                  color={stats?.avgScore != null ? getScoreColor(stats.avgScore) : C.text}
                />
              </View>
              <View style={styles.statWidgetBottom}>
                <Text
                  style={[
                    styles.statWidgetValue,
                    {
                      color: stats?.avgScore != null
                        ? getScoreColor(stats.avgScore)
                        : C.text,
                    },
                  ]}
                >
                  {stats?.avgScore != null ? Math.round(stats.avgScore) : "--"}
                </Text>
                <Text style={styles.statWidgetLabel}>Avg Score</Text>
              </View>
            </View>

            <View style={styles.statWidget}>
              <View style={styles.statWidgetIconWrap}>
                <CalendarBlank size={14} color={C.tealScore} />
              </View>
              <View style={styles.statWidgetBottom}>
                <Text style={styles.statWidgetValue}>{stats?.weeklyScans ?? 0}</Text>
                <Text style={styles.statWidgetLabel}>This Week</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* 4. Health Passport Card */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.passportCard}>
          <View style={styles.passportHeader}>
            <Shield size={18} color={C.primary} weight="fill" />
            <Text style={styles.passportTitle}>Health Passport</Text>
            <View style={styles.accentDot} />
          </View>

          <View style={styles.passportRow}>
            <LinearGradient colors={["#FFEBEE", "#FFCDD2"]} style={styles.passportIcon}>
              <Heartbeat size={16} color={C.danger} weight="fill" />
            </LinearGradient>
            <View style={styles.passportTextWrap}>
              <Text style={styles.passportLabel}>CONDITIONS</Text>
              <Text style={styles.passportValue}>{conditions || "None"}</Text>
            </View>
          </View>
          <View style={styles.passportDivider} />

          <View style={styles.passportRow}>
            <LinearGradient colors={["#FFF3E0", "#FFE0B2"]} style={styles.passportIcon}>
              <WarningCircle size={16} color={C.amber} weight="fill" />
            </LinearGradient>
            <View style={styles.passportTextWrap}>
              <Text style={styles.passportLabel}>ALLERGIES</Text>
              <Text style={styles.passportValue}>{allergies || "None"}</Text>
            </View>
          </View>
          <View style={styles.passportDivider} />

          <View style={styles.passportRow}>
            <LinearGradient colors={["#E8F5E9", "#C8E6C9"]} style={styles.passportIcon}>
              <Flag size={16} color={C.green} weight="fill" />
            </LinearGradient>
            <View style={styles.passportTextWrap}>
              <Text style={styles.passportLabel}>GOAL</Text>
              <Text style={styles.passportValue}>{goal}</Text>
            </View>
          </View>

          {user.dietaryPreference && user.dietaryPreference !== "none" && (
            <>
              <View style={styles.passportDivider} />
              <View style={styles.passportRow}>
                <LinearGradient colors={["#E0F7FA", "#B2EBF2"]} style={styles.passportIcon}>
                  <Leaf size={16} color={C.tealScore} weight="fill" />
                </LinearGradient>
                <View style={styles.passportTextWrap}>
                  <Text style={styles.passportLabel}>DIET</Text>
                  <Text style={styles.passportValue}>
                    {user.dietaryPreference.charAt(0).toUpperCase() +
                      user.dietaryPreference.slice(1)}
                  </Text>
                </View>
              </View>
            </>
          )}
        </Animated.View>

        {/* 5. Performance Snapshot — Side by Side */}
        {(bestProducts.length > 0 || worstProducts.length > 0) && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.perfRow}>
            {bestProducts.length > 0 && (
              <View style={styles.perfCard}>
                <View style={styles.perfHeader}>
                  <Trophy size={14} color={C.green} weight="fill" />
                  <Text style={styles.perfTitle}>Best Picks</Text>
                </View>
                {bestProducts.map((product, index) => (
                  <View key={`best-${product.productId}-${index}`} style={styles.perfProductRow} accessibilityLabel={`${product.productName}, score ${Math.round(product.score)}, ${getScoreShortLabel(product.score)}`}>
                    <View
                      style={[
                        styles.perfScoreBadge,
                        { backgroundColor: getScoreColorLight(product.score) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.perfScoreText,
                          { color: getScoreColor(product.score) },
                        ]}
                      >
                        {Math.round(product.score)}
                      </Text>
                      <Text style={[styles.perfScoreTierText, { color: getScoreColor(product.score) }]}>{getScoreShortLabel(product.score)}</Text>
                    </View>
                    <View style={styles.perfProductInfo}>
                      <Text style={styles.perfProductName} numberOfLines={1}>
                        {product.productName}
                      </Text>
                      <Text style={styles.perfProductBrand} numberOfLines={1}>
                        {product.productBrand}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {worstProducts.length > 0 && (
              <View style={styles.perfCard}>
                <View style={styles.perfHeader}>
                  <Fire size={14} color={C.danger} weight="fill" />
                  <Text style={styles.perfTitle}>Avoid</Text>
                </View>
                {worstProducts.map((product, index) => (
                  <View key={`worst-${product.productId}-${index}`} style={styles.perfProductRow} accessibilityLabel={`${product.productName}, score ${Math.round(product.score)}, ${getScoreShortLabel(product.score)}`}>
                    <View
                      style={[
                        styles.perfScoreBadge,
                        { backgroundColor: getScoreColorLight(product.score) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.perfScoreText,
                          { color: getScoreColor(product.score) },
                        ]}
                      >
                        {Math.round(product.score)}
                      </Text>
                      <Text style={[styles.perfScoreTierText, { color: getScoreColor(product.score) }]}>{getScoreShortLabel(product.score)}</Text>
                    </View>
                    <View style={styles.perfProductInfo}>
                      <Text style={styles.perfProductName} numberOfLines={1}>
                        {product.productName}
                      </Text>
                      <Text style={styles.perfProductBrand} numberOfLines={1}>
                        {product.productBrand}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* 6. Quick Actions */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.actionsWrap}>
          <TouchableOpacity style={styles.actionCard} onPress={handleEditProfile} activeOpacity={0.8} accessibilityLabel="Edit health profile" accessibilityRole="button">
            <View style={[styles.actionLeftBorder, { backgroundColor: C.mint }]} />
            <View style={styles.actionContent}>
              <View style={[styles.actionIconCircle, { backgroundColor: "#F0FAF4" }]}>
                <Flag size={16} color={C.primary} weight="fill" />
              </View>
              <Text style={[styles.actionText, { color: C.text }]}>Edit Health Profile</Text>
            </View>
            <CaretRight size={18} color={C.placeholder} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push("/privacy")} activeOpacity={0.8} accessibilityLabel="Privacy policy" accessibilityRole="button">
            <View style={[styles.actionLeftBorder, { backgroundColor: C.tealScore }]} />
            <View style={styles.actionContent}>
              <View style={[styles.actionIconCircle, { backgroundColor: C.tealBg }]}>
                <ShieldCheck size={16} color={C.tealScore} weight="fill" />
              </View>
              <Text style={[styles.actionText, { color: C.text }]}>Privacy Policy</Text>
            </View>
            <CaretRight size={18} color={C.placeholder} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push("/terms")} activeOpacity={0.8} accessibilityLabel="Terms of service" accessibilityRole="button">
            <View style={[styles.actionLeftBorder, { backgroundColor: C.tealScore }]} />
            <View style={styles.actionContent}>
              <View style={[styles.actionIconCircle, { backgroundColor: C.tealBg }]}>
                <FileText size={16} color={C.tealScore} weight="fill" />
              </View>
              <Text style={[styles.actionText, { color: C.text }]}>Terms of Service</Text>
            </View>
            <CaretRight size={18} color={C.placeholder} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleExportData} activeOpacity={0.8} accessibilityLabel="Export your data" accessibilityRole="button">
            <View style={[styles.actionLeftBorder, { backgroundColor: "#1976D2" }]} />
            <View style={styles.actionContent}>
              <View style={[styles.actionIconCircle, { backgroundColor: "#EBF4FF" }]}>
                <Export size={16} color="#1976D2" weight="fill" />
              </View>
              <Text style={[styles.actionText, { color: C.text }]}>Export My Data</Text>
            </View>
            <CaretRight size={18} color={C.placeholder} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleLogout} activeOpacity={0.8} accessibilityLabel="Log out" accessibilityRole="button">
            <View style={[styles.actionLeftBorder, { backgroundColor: C.amber }]} />
            <View style={styles.actionContent}>
              <View style={[styles.actionIconCircle, { backgroundColor: C.amberBg }]}>
                <SignOut size={16} color={C.amber} />
              </View>
              <Text style={[styles.actionText, { color: C.text }]}>Log Out</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleDeleteAccount} activeOpacity={0.8} accessibilityLabel="Delete account" accessibilityRole="button">
            <View style={[styles.actionLeftBorder, { backgroundColor: C.danger }]} />
            <View style={styles.actionContent}>
              <View style={[styles.actionIconCircle, { backgroundColor: C.dangerBg }]}>
                <Trash size={16} color={C.danger} />
              </View>
              <Text style={[styles.actionText, { color: C.danger }]}>Delete Account</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  topBar: {
    paddingBottom: 12,
    paddingHorizontal: 20,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  topBarTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: C.text,
    letterSpacing: -0.5,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  content: {
    paddingHorizontal: 16,
    gap: 14,
  },
  identityCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    ...cardShadow("medium"),
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: Colors.white,
  },
  identityInfo: {
    flex: 1,
  },
  identityRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 2,
  },
  identityName: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: C.text,
    flex: 1,
  },
  editLink: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: C.primary,
  },
  identityEmail: {
    fontSize: 13,
    color: C.muted,
  },
  identityAge: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: C.placeholder,
    marginTop: 2,
  },
  statRow: {
    flexDirection: "row" as const,
    gap: 10,
  },
  statWidget: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "space-between" as const,
    ...cardShadow("medium"),
  },
  statWidgetIconWrap: {
    alignSelf: "flex-end" as const,
  },
  statWidgetBottom: {
    marginTop: "auto" as any,
  },
  statWidgetValue: {
    fontSize: 24,
    fontWeight: "900" as const,
    color: C.text,
    letterSpacing: -1,
  },
  statWidgetLabel: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: C.muted,
    marginTop: 2,
  },
  passportCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    ...cardShadow("medium"),
  },
  passportHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 14,
  },
  passportTitle: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: C.text,
    letterSpacing: -0.3,
  },
  accentDot: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: C.mint,
    opacity: 0.7,
    marginLeft: 2,
  },
  passportRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingVertical: 12,
  },
  passportIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  passportTextWrap: {
    flex: 1,
  },
  passportLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: C.placeholder,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 2,
  },
  passportValue: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: C.text,
    lineHeight: 20,
  },
  passportDivider: {
    height: 1,
    backgroundColor: C.divider,
  },
  perfRow: {
    flexDirection: "row" as const,
    gap: 10,
  },
  perfCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    ...cardShadow("medium"),
  },
  perfHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 12,
  },
  perfTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: C.text,
  },
  perfProductRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 8,
    marginBottom: 10,
  },
  perfScoreBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  perfScoreText: {
    fontSize: 11,
    fontWeight: "800" as const,
    lineHeight: 12,
  },
  perfScoreTierText: {
    fontSize: 6,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.2,
    marginTop: 1,
  },
  perfProductInfo: {
    flex: 1,
    paddingTop: 2,
  },
  perfProductName: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: C.text,
  },
  perfProductBrand: {
    fontSize: 10,
    color: C.muted,
    marginTop: 2,
  },
  actionsWrap: {
    gap: 10,
    paddingTop: 4,
  },
  actionCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden" as const,
    position: "relative" as const,
    ...cardShadow("subtle"),
  },
  actionLeftBorder: {
    position: "absolute" as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  actionContent: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingLeft: 6,
  },
  actionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  editFieldsWrap: {
    flex: 1,
    gap: 8,
  },
  editInput: {
    height: 42,
    borderRadius: 12,
    backgroundColor: C.bg,
    paddingHorizontal: 14,
    fontSize: 15,
    color: C.text,
    fontWeight: "500" as const,
    borderWidth: 1,
    borderColor: C.border,
  },
  editActions: {
    flexDirection: "row" as const,
    gap: 10,
    justifyContent: "flex-end" as const,
    marginTop: 2,
  },
  editCancelBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.dangerBg,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  editSaveBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
});
