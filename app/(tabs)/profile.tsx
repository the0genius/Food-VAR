import { useState, useMemo } from "react";
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
  Sun,
  Moon,
  Database,
} from "phosphor-react-native";
import * as Sentry from "@sentry/react-native";
import Colors, { C, cardShadow, getScoreColor, getScoreBgColor, getScoreShortLabel, useThemeColors, type ThemeColors } from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
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

function getScoreColorLight(score: number, t: ThemeColors): string {
  return getScoreBgColor(score, t);
}

function dedupeProducts(products: StatsProduct[]): StatsProduct[] {
  const seen = new Set<number>();
  return products.filter((p) => {
    if (seen.has(p.productId)) return false;
    seen.add(p.productId);
    return true;
  });
}

function SkeletonBlock({ width, height, style, color }: { width: number | string; height: number; style?: any; color?: string }) {
  const skeletonTheme = useThemeColors();
  const skeletonColor = color || skeletonTheme.skeleton;
  return (
    <MotiView
      from={{ opacity: 0.4 }}
      animate={{ opacity: 0.9 }}
      transition={{ loop: true, type: "timing" as const, duration: 850 }}
      style={[{ backgroundColor: skeletonColor, borderRadius: 12, width, height }, style]}
    />
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateProfile, logout } = useUser();
  const { resolved: currentTheme, toggle: toggleTheme } = useTheme();
  const theme = useThemeColors();
  const isDark = theme.isDark;
  const styles = useMemo(() => createStyles(theme), [theme]);
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

  async function handleLogout() {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to log out?");
      if (confirmed) {
        await logout();
        router.replace("/onboarding");
      }
    } else {
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

  async function handleDeleteAccount() {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "This will permanently delete your account and all associated data. This action cannot be undone."
      );
      if (confirmed) {
        try {
          await apiRequest("DELETE", "/api/auth/account");
          await logout();
          router.replace("/onboarding");
        } catch (e) {
          alert("Could not delete your account. Please try again.");
        }
      }
    } else {
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
        colors={[theme.greenBg, theme.bg]}
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
          <GearSix size={20} color={theme.muted} />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.content}>

        {/* 2. Avatar + Identity Card */}
        {editing ? (
          <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.identityCard}>
            <LinearGradient
              colors={[theme.mint, theme.primary]}
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
                placeholderTextColor={theme.placeholder}
                autoFocus
                accessibilityLabel="Your name"
              />
              <TextInput
                style={styles.editInput}
                value={age}
                onChangeText={setAge}
                placeholder="Age"
                placeholderTextColor={theme.placeholder}
                keyboardType="number-pad"
                maxLength={3}
                accessibilityLabel="Your age"
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.editCancelBtn}
                  onPress={() => {
                    setEditing(false);
                    setName(user?.name || "");
                    setAge(user?.age ? String(user.age) : "");
                  }}
                  accessibilityLabel="Cancel editing"
                  accessibilityRole="button"
                >
                  <X size={18} color={theme.danger} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.editSaveBtn} onPress={handleSave} accessibilityLabel="Save profile changes" accessibilityRole="button">
                  <Check size={18} color={theme.onPrimary} />
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
              accessibilityLabel="Edit your name and age"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={[theme.mint, theme.primary]}
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
                {user.authProvider && (
                  <Text style={styles.identityAge}>
                    Signed in with {user.authProvider === "google" ? "Google" : user.authProvider === "apple" ? "Apple" : user.authProvider}
                  </Text>
                )}
                {user.age && (
                  <Text style={styles.identityAge}>Age {user.age}</Text>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* 3. Stat Widgets Row — Centered with icon on top */}
        {statsLoading ? (
          <View style={styles.statRow}>
            <SkeletonBlock width="31%" height={100} style={{ borderRadius: 24 }} color={theme.skeleton} />
            <SkeletonBlock width="31%" height={100} style={{ borderRadius: 24 }} color={theme.skeleton} />
            <SkeletonBlock width="31%" height={100} style={{ borderRadius: 24 }} color={theme.skeleton} />
          </View>
        ) : (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statRow}>
            <View style={styles.statWidget}>
              <View style={[styles.statIconCircle, { backgroundColor: theme.greenBg }]}>
                <Scan size={16} color={theme.green} />
              </View>
              <Text style={styles.statWidgetValue}>{stats?.totalScans ?? 0}</Text>
              <Text style={styles.statWidgetLabel}>Total Scans</Text>
            </View>

            <View style={styles.statWidget}>
              <View style={[styles.statIconCircle, { backgroundColor: theme.tealBg }]}>
                <Speedometer
                  size={16}
                  color={stats?.avgScore != null ? getScoreColor(stats.avgScore, theme) : theme.tealScore}
                />
              </View>
              <Text
                style={[
                  styles.statWidgetValue,
                  {
                    color: stats?.avgScore != null
                      ? getScoreColor(stats.avgScore, theme)
                      : theme.tealScore,
                  },
                ]}
              >
                {stats?.avgScore != null ? Math.round(stats.avgScore) : "--"}
              </Text>
              <Text style={styles.statWidgetLabel}>Avg Score</Text>
            </View>

            <View style={styles.statWidget}>
              <View style={[styles.statIconCircle, { backgroundColor: theme.bg }]}>
                <CalendarBlank size={16} color={theme.muted} />
              </View>
              <Text style={styles.statWidgetValue}>{stats?.weeklyScans ?? 0}</Text>
              <Text style={styles.statWidgetLabel}>This Week</Text>
            </View>
          </Animated.View>
        )}

        {/* 4. Health Passport Card */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.passportCard}>
          <View style={styles.passportHeader}>
            <ShieldCheck size={20} color={theme.primary} weight="fill" />
            <Text style={styles.passportTitle}>Health Passport</Text>
            <MotiView
              from={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={{ loop: true, type: "timing" as const, duration: 1200 }}
              style={styles.pulsingDot}
            />
          </View>

          <View style={styles.passportRow}>
            <View style={[styles.passportIcon, { backgroundColor: theme.dangerBg }]}>
              <Heartbeat size={16} color={theme.danger} weight="fill" />
            </View>
            <View style={styles.passportTextWrap}>
              <Text style={styles.passportLabel}>CONDITIONS</Text>
              <Text style={styles.passportValue}>{conditions || "None"}</Text>
            </View>
          </View>
          <View style={styles.passportDivider} />

          <View style={styles.passportRow}>
            <View style={[styles.passportIcon, { backgroundColor: theme.amberBg }]}>
              <WarningCircle size={16} color={theme.amber} weight="fill" />
            </View>
            <View style={styles.passportTextWrap}>
              <Text style={styles.passportLabel}>ALLERGIES</Text>
              <Text style={styles.passportValue}>{allergies || "None"}</Text>
            </View>
          </View>
          <View style={styles.passportDivider} />

          <View style={styles.passportRow}>
            <View style={[styles.passportIcon, { backgroundColor: theme.greenBg }]}>
              <Flag size={16} color={theme.green} weight="fill" />
            </View>
            <View style={styles.passportTextWrap}>
              <Text style={styles.passportLabel}>GOAL</Text>
              <Text style={styles.passportValue}>{goal}</Text>
            </View>
          </View>

          <View style={styles.passportDivider} />
          <View style={styles.passportRow}>
            <View style={[styles.passportIcon, { backgroundColor: theme.tealBg }]}>
              <Leaf size={16} color={theme.tealScore} weight="fill" />
            </View>
            <View style={styles.passportTextWrap}>
              <Text style={styles.passportLabel}>DIET</Text>
              <Text style={styles.passportValue}>
                {user.dietaryPreference && user.dietaryPreference !== "none"
                  ? user.dietaryPreference.charAt(0).toUpperCase() + user.dietaryPreference.slice(1)
                  : "Not set"}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* 5. Performance Snapshot — Side by Side */}
        {(bestProducts.length > 0 || worstProducts.length > 0) && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.perfRow}>
            {bestProducts.length > 0 && (
              <View style={styles.perfCard}>
                <View style={styles.perfHeader}>
                  <Trophy size={14} color={theme.green} weight="fill" />
                  <Text style={styles.perfTitle}>Best Picks</Text>
                </View>
                {bestProducts.map((product, index) => (
                  <View key={`best-${product.productId}-${index}`} style={styles.perfProductRow} accessibilityLabel={`${product.productName}, score ${Math.round(product.score)}, ${getScoreShortLabel(product.score, product.score === 0)}`}>
                    <View
                      style={[
                        styles.perfScoreBadge,
                        { backgroundColor: getScoreColorLight(product.score, theme) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.perfScoreText,
                          { color: getScoreColor(product.score, theme) },
                        ]}
                      >
                        {Math.round(product.score)}
                      </Text>
                      <Text style={[styles.perfScoreTierText, { color: getScoreColor(product.score, theme) }]}>{getScoreShortLabel(product.score, product.score === 0)}</Text>
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
                  <Fire size={14} color={theme.danger} weight="fill" />
                  <Text style={styles.perfTitle}>Avoid</Text>
                </View>
                {worstProducts.map((product, index) => (
                  <View key={`worst-${product.productId}-${index}`} style={styles.perfProductRow} accessibilityLabel={`${product.productName}, score ${Math.round(product.score)}, ${getScoreShortLabel(product.score, product.score === 0)}`}>
                    <View
                      style={[
                        styles.perfScoreBadge,
                        { backgroundColor: getScoreColorLight(product.score, theme) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.perfScoreText,
                          { color: getScoreColor(product.score, theme) },
                        ]}
                      >
                        {Math.round(product.score)}
                      </Text>
                      <Text style={[styles.perfScoreTierText, { color: getScoreColor(product.score, theme) }]}>{getScoreShortLabel(product.score, product.score === 0)}</Text>
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
            <View style={[styles.actionLeftBorder, { backgroundColor: theme.mint }]} />
            <View style={styles.actionContent}>
              <View style={[styles.actionIconCircle, { backgroundColor: theme.tinted }]}>
                <Flag size={16} color={theme.primary} weight="fill" />
              </View>
              <Text style={[styles.actionText, { color: theme.text }]}>Edit Health Profile</Text>
            </View>
            <CaretRight size={18} color={theme.placeholder} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push("/privacy")} activeOpacity={0.8} accessibilityLabel="Privacy policy" accessibilityRole="button">
            <View style={[styles.actionLeftBorder, { backgroundColor: theme.tealScore }]} />
            <View style={styles.actionContent}>
              <View style={[styles.actionIconCircle, { backgroundColor: theme.tealBg }]}>
                <ShieldCheck size={16} color={theme.tealScore} weight="fill" />
              </View>
              <Text style={[styles.actionText, { color: theme.text }]}>Privacy Policy</Text>
            </View>
            <CaretRight size={18} color={theme.placeholder} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push("/terms")} activeOpacity={0.8} accessibilityLabel="Terms of service" accessibilityRole="button">
            <View style={[styles.actionLeftBorder, { backgroundColor: theme.tealScore }]} />
            <View style={styles.actionContent}>
              <View style={[styles.actionIconCircle, { backgroundColor: theme.tealBg }]}>
                <FileText size={16} color={theme.tealScore} weight="fill" />
              </View>
              <Text style={[styles.actionText, { color: theme.text }]}>Terms of Service</Text>
            </View>
            <CaretRight size={18} color={theme.placeholder} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push("/data-sources")} activeOpacity={0.8} accessibilityLabel="Data sources and attribution" accessibilityRole="button">
            <View style={[styles.actionLeftBorder, { backgroundColor: theme.info }]} />
            <View style={styles.actionContent}>
              <View style={[styles.actionIconCircle, { backgroundColor: theme.infoBg }]}>
                <Database size={16} color={theme.info} weight="fill" />
              </View>
              <Text style={[styles.actionText, { color: theme.text }]}>Data Sources</Text>
            </View>
            <CaretRight size={18} color={theme.placeholder} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleExportData} activeOpacity={0.8} accessibilityLabel="Export your data" accessibilityRole="button">
            <View style={[styles.actionLeftBorder, { backgroundColor: theme.info }]} />
            <View style={styles.actionContent}>
              <View style={[styles.actionIconCircle, { backgroundColor: theme.infoBg }]}>
                <Export size={16} color={theme.info} weight="fill" />
              </View>
              <Text style={[styles.actionText, { color: theme.text }]}>Export My Data</Text>
            </View>
            <CaretRight size={18} color={theme.placeholder} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleTheme();
            }}
            activeOpacity={0.8}
            accessibilityLabel={currentTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            accessibilityRole="switch"
            accessibilityState={{ checked: currentTheme === "dark" }}
          >
            <View style={[styles.actionLeftBorder, { backgroundColor: theme.purple }]} />
            <View style={styles.actionContent}>
              <View style={[styles.actionIconCircle, { backgroundColor: theme.purpleTint }]}>
                {currentTheme === "dark" ? (
                  <Sun size={16} color={theme.purple} weight="fill" />
                ) : (
                  <Moon size={16} color={theme.purple} weight="fill" />
                )}
              </View>
              <Text style={[styles.actionText, { color: theme.text }]}>Dark Mode</Text>
            </View>
            <View style={[styles.toggleTrack, isDark && styles.toggleTrackActive]}>
              <View style={[styles.toggleThumb, isDark && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, { marginTop: 10 }]} onPress={handleLogout} activeOpacity={0.8} accessibilityLabel="Log out" accessibilityRole="button">
            <View style={[styles.actionLeftBorder, { backgroundColor: theme.danger }]} />
            <View style={styles.actionContent}>
              <View style={[styles.actionIconCircle, { backgroundColor: theme.dangerBg }]}>
                <SignOut size={16} color={theme.danger} />
              </View>
              <Text style={[styles.actionText, { color: theme.danger }]}>Log Out</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleDeleteAccount} activeOpacity={0.8} accessibilityLabel="Delete account" accessibilityRole="button">
            <View style={[styles.actionLeftBorder, { backgroundColor: theme.danger }]} />
            <View style={styles.actionContent}>
              <View style={[styles.actionIconCircle, { backgroundColor: theme.dangerBg }]}>
                <Trash size={16} color={theme.danger} />
              </View>
              <Text style={[styles.actionText, { color: theme.danger }]}>Delete Account</Text>
            </View>
          </TouchableOpacity>

          {__DEV__ && (
            <TouchableOpacity
              style={[styles.actionCard, { borderStyle: "dashed" as const, borderWidth: 1, borderColor: theme.muted, opacity: 0.7 }]}
              onPress={() => {
                const eventId = Sentry.captureException(new Error("FoodVAR Sentry Test Error"));
                Alert.alert("Test Error Sent", `Event ID: ${eventId}\n\nCheck your Sentry dashboard to confirm it arrived.`);
              }}
              activeOpacity={0.8}
              accessibilityLabel="Send test error to Sentry"
              accessibilityRole="button"
            >
              <View style={[styles.actionLeftBorder, { backgroundColor: theme.muted }]} />
              <View style={styles.actionContent}>
                <View style={[styles.actionIconCircle, { backgroundColor: theme.card }]}>
                  <WarningCircle size={16} color={theme.muted} />
                </View>
                <Text style={[styles.actionText, { color: theme.muted }]}>Send Test Error to Sentry</Text>
              </View>
            </TouchableOpacity>
          )}
        </Animated.View>

        <Text style={styles.wellnessDisclaimer}>
          For informational purposes only — not medical advice.{'\n'}Always consult your healthcare provider.
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
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
    color: theme.text,
    letterSpacing: -0.5,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.overlayBtn,
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
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
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
    color: theme.onPrimary,
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
    color: theme.text,
    flex: 1,
  },
  editLink: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: theme.primary,
  },
  identityEmail: {
    fontSize: 13,
    color: theme.muted,
  },
  identityAge: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: theme.placeholder,
    marginTop: 2,
  },
  statRow: {
    flexDirection: "row" as const,
    gap: 10,
  },
  statWidget: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    ...cardShadow("medium"),
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  statWidgetValue: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: theme.text,
    letterSpacing: -0.5,
  },
  statWidgetLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: theme.placeholder,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
  passportCard: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.border,
    ...cardShadow("medium"),
  },
  passportHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  passportTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: theme.text,
    flex: 1,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.mint,
  },
  passportRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 12,
    paddingVertical: 12,
  },
  passportIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 2,
  },
  passportTextWrap: {
    flex: 1,
  },
  passportLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: theme.placeholder,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 2,
  },
  passportValue: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: theme.text,
    lineHeight: 20,
  },
  passportDivider: {
    height: 1,
    backgroundColor: theme.divider,
  },
  perfRow: {
    flexDirection: "row" as const,
    gap: 10,
  },
  perfCard: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
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
    color: theme.text,
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
    color: theme.text,
  },
  perfProductBrand: {
    fontSize: 10,
    color: theme.muted,
    marginTop: 2,
  },
  actionsWrap: {
    gap: 10,
    paddingTop: 4,
  },
  actionCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
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
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.toggleTrack,
    justifyContent: "center" as const,
    padding: 2,
  },
  toggleTrackActive: {
    backgroundColor: theme.purple,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.onPrimary,
  },
  toggleThumbActive: {
    alignSelf: "flex-end" as const,
  },
  editFieldsWrap: {
    flex: 1,
    gap: 8,
  },
  editInput: {
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.bg,
    paddingHorizontal: 14,
    fontSize: 15,
    color: theme.text,
    fontWeight: "500" as const,
    borderWidth: 1,
    borderColor: theme.border,
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
    backgroundColor: theme.dangerBg,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  editSaveBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  wellnessDisclaimer: {
    fontSize: 11,
    color: theme.muted,
    textAlign: "center" as const,
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 32,
    lineHeight: 16,
  },
});
