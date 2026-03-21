import { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  X,
  Check,
  CheckCircle,
  Drop,
  Heart,
  Heartbeat,
  FirstAid,
  Person,
  Grains,
  Leaf,
  TrendDown,
  Barbell,
  Pill,
} from "phosphor-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import Colors, { C, cardShadow, useThemeColors, type ThemeColors } from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";

const CONDITIONS = [
  { id: "diabetes_type2", label: "Diabetes (Type 2)", Icon: Drop },
  { id: "diabetes_type1", label: "Diabetes (Type 1)", Icon: Drop },
  { id: "hypertension", label: "Hypertension", Icon: Heart },
  { id: "high_cholesterol", label: "High Cholesterol", Icon: Heartbeat },
  { id: "kidney_disease", label: "Kidney Disease", Icon: FirstAid },
  { id: "gout", label: "Gout", Icon: Person },
  { id: "ibs", label: "IBS", Icon: Grains },
  { id: "celiac", label: "Celiac Disease", Icon: Leaf },
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
  { id: "weight_loss", label: "Lose Weight", Icon: TrendDown },
  { id: "muscle_gain", label: "Build Muscle", Icon: Barbell },
  { id: "general_wellness", label: "General Wellness", Icon: Leaf },
  { id: "manage_condition", label: "Manage Condition", Icon: Pill },
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
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} accessibilityLabel="Close" accessibilityRole="button">
          <X size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Health Profile</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtnWrapper} disabled={saving} accessibilityLabel="Save health profile" accessibilityRole="button">
          <LinearGradient
            colors={[theme.mint, theme.primary]}
            style={styles.saveBtn}
          >
            {saving ? (
              <MotiView
                from={{ opacity: 0.4 }}
                animate={{ opacity: 0.9 }}
                transition={{ loop: true, type: "timing", duration: 850 }}
                style={styles.savingDot}
              />
            ) : (
              <Check size={22} color={theme.onPrimary} weight="bold" />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400 }}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Health Conditions</Text>
          <Text style={styles.sectionSubtitle}>
            Select any conditions you manage
          </Text>
          <View style={styles.chipGrid}>
            {CONDITIONS.map((c) => {
              const isActive = conditions.includes(c.id);
              const IconComp = c.Icon;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.conditionChip,
                    isActive && styles.conditionChipActive,
                  ]}
                  onPress={() => toggleItem(conditions, setConditions, c.id)}
                  accessibilityLabel={`${c.label}, ${isActive ? "selected" : "not selected"}`}
                  accessibilityRole="checkbox"
                >
                  {isActive ? (
                    <CheckCircle size={18} color={theme.onPrimary} weight="fill" />
                  ) : (
                    <IconComp size={18} color={theme.primary} />
                  )}
                  <Text
                    style={[
                      styles.chipText,
                      isActive && styles.chipTextActive,
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400, delay: 100 }}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Allergies & Intolerances</Text>
          <Text style={styles.sectionSubtitle}>
            Products with your allergens will be flagged
          </Text>
          <View style={styles.chipGrid}>
            {ALLERGIES.map((a) => {
              const isActive = allergies.includes(a.id);
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[
                    styles.allergyChip,
                    isActive && styles.allergyChipActive,
                  ]}
                  onPress={() => toggleItem(allergies, setAllergies, a.id)}
                  accessibilityLabel={`${a.label}, ${isActive ? "selected" : "not selected"}`}
                  accessibilityRole="checkbox"
                >
                  <Text
                    style={[
                      styles.chipText,
                      isActive && styles.chipTextActive,
                    ]}
                  >
                    {a.label}
                  </Text>
                  {isActive && (
                    <CheckCircle size={14} color={theme.onPrimary} weight="fill" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400, delay: 200 }}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Your Goal</Text>
          <View style={styles.goalGrid}>
            {GOALS.map((g) => {
              const isActive = goal === g.id;
              const IconComp = g.Icon;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    styles.goalCard,
                    isActive && styles.goalCardActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setGoal(g.id);
                  }}
                  accessibilityLabel={`${g.label}, ${isActive ? "selected" : "not selected"}`}
                  accessibilityRole="radio"
                >
                  {isActive ? (
                    <CheckCircle size={24} color={theme.onPrimary} weight="fill" />
                  ) : (
                    <IconComp size={24} color={theme.primary} />
                  )}
                  <Text
                    style={[
                      styles.goalText,
                      isActive && styles.goalTextActive,
                    ]}
                  >
                    {g.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400, delay: 300 }}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Dietary Preference</Text>
          <View style={styles.dietList}>
            {DIETS.map((d) => {
              const isActive = diet === d.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[
                    styles.dietRow,
                    isActive && styles.dietRowActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDiet(d.id);
                  }}
                  accessibilityLabel={`${d.label}, ${isActive ? "selected" : "not selected"}`}
                  accessibilityRole="radio"
                >
                  <Text
                    style={[
                      styles.dietText,
                      isActive && styles.dietTextActive,
                    ]}
                  >
                    {d.label}
                  </Text>
                  {isActive && (
                    <CheckCircle size={20} color={theme.primary} weight="fill" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </MotiView>

        <TouchableOpacity
          style={styles.gradientSaveWrapper}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
          accessibilityLabel={saving ? "Saving changes" : "Save changes"}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[theme.mint, theme.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientSaveBtn}
          >
            <Text style={styles.gradientSaveText}>
              {saving ? "Saving..." : "Save Changes"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.card,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.text,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.bg,
  },
  saveBtnWrapper: {
    borderRadius: 18,
    overflow: "hidden",
  },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  savingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.onPrimary,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.muted,
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
    borderRadius: 14,
    backgroundColor: theme.card,
    borderWidth: 0.5,
    borderColor: theme.border,
    ...cardShadow("subtle"),
  },
  conditionChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
    shadowColor: theme.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  allergyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.card,
    borderWidth: 0.5,
    borderColor: theme.border,
  },
  allergyChipActive: {
    backgroundColor: theme.danger,
    borderColor: theme.danger,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
  },
  chipTextActive: {
    color: theme.onPrimary,
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
    backgroundColor: theme.card,
    borderWidth: 0.5,
    borderColor: theme.border,
    gap: 8,
    ...cardShadow("subtle"),
  },
  goalCardActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
    shadowColor: theme.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  goalText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.text,
  },
  goalTextActive: {
    color: theme.onPrimary,
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
    backgroundColor: theme.card,
    borderWidth: 0.5,
    borderColor: theme.border,
    ...cardShadow("subtle"),
  },
  dietRowActive: {
    borderColor: theme.primary,
    backgroundColor: theme.tinted,
    borderWidth: 1.5,
  },
  dietText: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.text,
  },
  dietTextActive: {
    fontWeight: "600" as const,
    color: theme.primary,
  },
  gradientSaveWrapper: {
    marginTop: 28,
    borderRadius: 999,
    overflow: "hidden",
  },
  gradientSaveBtn: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  gradientSaveText: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.onPrimary,
  },
});
