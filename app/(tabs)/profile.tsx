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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
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
      setEditing(false);
    } catch (e) {
      console.error(e);
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
    router.push("/onboarding");
  }

  if (!user) return null;

  const conditions = (user.conditions || [])
    .map((c: string) => CONDITIONS_MAP[c] || c)
    .join(", ");
  const allergies = (user.allergies || []).join(", ");
  const goal = GOALS_MAP[user.goal || ""] || user.goal || "General Wellness";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 100,
      }}
    >
      <View
        style={[
          styles.header,
          { paddingTop: (insets.top || webTopInset) + 16 },
        ]}
      >
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>
            {(user.name || user.email).charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{user.name || "User"}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        {user.isPro && (
          <View style={styles.proBadge}>
            <Ionicons name="star" size={12} color={Colors.white} />
            <Text style={styles.proBadgeText}>Pro</Text>
          </View>
        )}
      </View>

      {statsLoading ? (
        <View style={styles.statsRow}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.totalScans ?? 0}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
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
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.weeklyScans ?? 0}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
        </View>
      )}

      {stats && (stats.bestProducts?.length ?? 0) > 0 && (
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Top Picks</Text>
          {stats.bestProducts.slice(0, 3).map((product, index) => (
            <View key={product.productId ?? index} style={styles.productRow}>
              <View
                style={[
                  styles.scoreBadge,
                  { backgroundColor: getScoreColor(product.score) },
                ]}
              >
                <Text style={styles.scoreBadgeText}>
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

      {stats && (stats.worstProducts?.length ?? 0) > 0 && (
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Watch Out</Text>
          {stats.worstProducts.slice(0, 3).map((product, index) => (
            <View key={product.productId ?? index} style={styles.productRow}>
              <View
                style={[
                  styles.scoreBadge,
                  { backgroundColor: getScoreColor(product.score) },
                ]}
              >
                <Text style={styles.scoreBadgeText}>
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
        style={styles.section}
      >
        <Text style={styles.sectionTitle}>Health Profile</Text>

        <View style={styles.profileRow}>
          <View style={styles.profileIconWrap}>
            <Ionicons name="fitness-outline" size={18} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileLabel}>Conditions</Text>
            <Text style={styles.profileValue}>
              {conditions || "None selected"}
            </Text>
          </View>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.profileIconWrap}>
            <Ionicons name="warning-outline" size={18} color={Colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileLabel}>Allergies</Text>
            <Text style={styles.profileValue}>
              {allergies || "None selected"}
            </Text>
          </View>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.profileIconWrap}>
            <Ionicons name="flag-outline" size={18} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileLabel}>Goal</Text>
            <Text style={styles.profileValue}>{goal}</Text>
          </View>
        </View>

        {user.dietaryPreference && (
          <View style={styles.profileRow}>
            <View style={styles.profileIconWrap}>
              <Ionicons name="leaf-outline" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileLabel}>Diet</Text>
              <Text style={styles.profileValue}>
                {user.dietaryPreference.charAt(0).toUpperCase() +
                  user.dietaryPreference.slice(1)}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.editProfileBtn} onPress={handleEditProfile}>
          <Ionicons name="create-outline" size={18} color={Colors.primary} />
          <Text style={styles.editProfileBtnText}>Edit Health Profile</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    alignItems: "center",
    paddingBottom: 24,
    backgroundColor: Colors.primaryPale,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.white,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.charcoal,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.mediumGray,
    marginTop: 4,
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  proBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.white,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 0,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.lightGray,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.charcoal,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.mediumGray,
    marginTop: 4,
    fontWeight: "500",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.charcoal,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.softWhite,
    borderRadius: 12,
    marginBottom: 8,
  },
  scoreBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBadgeText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.white,
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
  profileRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  profileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryPale,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  profileLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  profileValue: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.charcoal,
    marginTop: 4,
    lineHeight: 21,
  },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primaryPale,
    marginTop: 8,
  },
  editProfileBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.dangerPale,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.danger,
  },
});
