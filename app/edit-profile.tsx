import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";

const CONDITIONS = [
  { id: "diabetes_type2", label: "Diabetes (Type 2)", icon: "water-outline" as const },
  { id: "diabetes_type1", label: "Diabetes (Type 1)", icon: "water-outline" as const },
  { id: "hypertension", label: "Hypertension", icon: "heart-outline" as const },
  { id: "high_cholesterol", label: "High Cholesterol", icon: "fitness-outline" as const },
  { id: "kidney_disease", label: "Kidney Disease", icon: "medical-outline" as const },
  { id: "gout", label: "Gout", icon: "body-outline" as const },
  { id: "ibs", label: "IBS", icon: "nutrition-outline" as const },
  { id: "celiac", label: "Celiac Disease", icon: "leaf-outline" as const },
];

const ALLERGIES = [
  { id: "gluten", label: "Gluten" },
  { id: "lactose", label: "Lactose/Dairy" },
  { id: "nuts", label: "Tree Nuts" },
  { id: "peanuts", label: "Peanuts" },
  { id: "soy", label: "Soy" },
  { id: "eggs", label: "Eggs" },
  { id: "shellfish", label: "Shellfish" },
  { id: "fish", label: "Fish" },
  { id: "wheat", label: "Wheat" },
];

const GOALS = [
  { id: "weight_loss", label: "Lose Weight", icon: "trending-down-outline" as const },
  { id: "muscle_gain", label: "Build Muscle", icon: "barbell-outline" as const },
  { id: "general_wellness", label: "General Wellness", icon: "leaf-outline" as const },
  { id: "manage_condition", label: "Manage Condition", icon: "medkit-outline" as const },
];

const DIETS = [
  { id: "none", label: "No Preference" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "keto", label: "Keto" },
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useUser();

  const [conditions, setConditions] = useState<string[]>(user?.conditions || []);
  const [allergies, setAllergies] = useState<string[]>(user?.allergies || []);
  const [goal, setGoal] = useState(user?.goal || "general_wellness");
  const [diet, setDiet] = useState(user?.dietaryPreference || "none");
  const [saving, setSaving] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  function toggleItem(list: string[], setList: (v: string[]) => void, id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (list.includes(id)) {
      setList(list.filter((i) => i !== id));
    } else {
      setList([...list, id]);
    }
  }

  async function handleSave() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      await updateProfile({
        conditions,
        allergies,
        goal,
        dietaryPreference: diet === "none" ? null : diet,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert("Oops", "Could not save your profile. Please try again.");
    }
    setSaving(false);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={Colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Health Profile</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Ionicons name="checkmark" size={22} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Health Conditions</Text>
          <Text style={styles.sectionSubtitle}>
            Select any conditions you manage
          </Text>
          <View style={styles.chipGrid}>
            {CONDITIONS.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.conditionChip,
                  conditions.includes(c.id) && styles.conditionChipActive,
                ]}
                onPress={() => toggleItem(conditions, setConditions, c.id)}
              >
                <Ionicons
                  name={c.icon}
                  size={18}
                  color={conditions.includes(c.id) ? Colors.white : Colors.primary}
                />
                <Text
                  style={[
                    styles.chipText,
                    conditions.includes(c.id) && styles.chipTextActive,
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Allergies & Intolerances</Text>
          <Text style={styles.sectionSubtitle}>
            Products with your allergens will be flagged
          </Text>
          <View style={styles.chipGrid}>
            {ALLERGIES.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[
                  styles.allergyChip,
                  allergies.includes(a.id) && styles.allergyChipActive,
                ]}
                onPress={() => toggleItem(allergies, setAllergies, a.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    allergies.includes(a.id) && styles.chipTextActive,
                  ]}
                >
                  {a.label}
                </Text>
                {allergies.includes(a.id) && (
                  <Ionicons name="checkmark" size={14} color={Colors.white} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Your Goal</Text>
          <View style={styles.goalGrid}>
            {GOALS.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[
                  styles.goalCard,
                  goal === g.id && styles.goalCardActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setGoal(g.id);
                }}
              >
                <Ionicons
                  name={g.icon}
                  size={24}
                  color={goal === g.id ? Colors.white : Colors.primary}
                />
                <Text
                  style={[
                    styles.goalText,
                    goal === g.id && styles.goalTextActive,
                  ]}
                >
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Preference</Text>
          <View style={styles.dietList}>
            {DIETS.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[
                  styles.dietRow,
                  diet === d.id && styles.dietRowActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDiet(d.id);
                }}
              >
                <Text
                  style={[
                    styles.dietText,
                    diet === d.id && styles.dietTextActive,
                  ]}
                >
                  {d.label}
                </Text>
                {diet === d.id && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softWhite,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.charcoal,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.charcoal,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.mediumGray,
    marginBottom: 16,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  conditionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primaryPale,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  conditionChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  allergyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.lightGray,
  },
  allergyChipActive: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.charcoal,
  },
  chipTextActive: {
    color: Colors.white,
  },
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  goalCard: {
    width: "47%",
    alignItems: "center",
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: Colors.primaryPale,
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 8,
  },
  goalCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  goalText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.charcoal,
  },
  goalTextActive: {
    color: Colors.white,
  },
  dietList: {
    gap: 8,
  },
  dietRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.lightGray,
  },
  dietRowActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale,
  },
  dietText: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.charcoal,
  },
  dietTextActive: {
    fontWeight: "600",
    color: Colors.primary,
  },
});
