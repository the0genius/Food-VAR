import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Colors, { cardShadow } from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, login, updateProfile } = useUser();
  const [step, setStep] = useState(0);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [diet, setDiet] = useState("none");
  const [loading, setLoading] = useState(false);

  const totalSteps = 5;

  function toggleItem(list: string[], setList: (v: string[]) => void, id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (list.includes(id)) {
      setList(list.filter((i) => i !== id));
    } else {
      setList([...list, id]);
    }
  }

  async function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step === 0) {
      if (!email.trim()) return;
      setLoading(true);
      try {
        await login(email.trim(), name.trim());
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      setLoading(true);
      try {
        await updateProfile({
          name: name.trim(),
          age: age ? parseInt(age) : null,
          gender: gender || null,
          conditions,
          allergies,
          goal: goal || "general_wellness",
          dietaryPreference: diet === "none" ? null : diet,
          onboardingCompleted: true,
        });
        router.replace("/(tabs)");
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <Animated.View entering={FadeInDown.duration(500)} style={styles.stepContent}>
            <View style={styles.stepIcon}>
              <View style={styles.stepIconCircle}>
                <Ionicons name="person-circle-outline" size={56} color={Colors.primary} />
              </View>
            </View>
            <Text style={styles.stepTitle}>Welcome to FoodVAR</Text>
            <Text style={styles.stepSubtitle}>
              Get personalized food scores based on your unique health profile
            </Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={Colors.lightGray}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                testID="email-input"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name (optional)</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={Colors.lightGray}
                autoCapitalize="words"
                testID="name-input"
              />
            </View>
          </Animated.View>
        );
      case 1:
        return (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContent}>
            <Text style={styles.stepTitle}>Health Conditions</Text>
            <Text style={styles.stepSubtitle}>
              Select any conditions you manage. We'll tailor scores to your needs.
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
                  testID={`condition-${c.id}`}
                >
                  <Ionicons
                    name={c.icon}
                    size={20}
                    color={conditions.includes(c.id) ? Colors.white : Colors.primary}
                  />
                  <Text
                    style={[
                      styles.conditionChipText,
                      conditions.includes(c.id) && styles.conditionChipTextActive,
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.skipHint}>Skip if none apply</Text>
          </Animated.View>
        );
      case 2:
        return (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContent}>
            <Text style={styles.stepTitle}>Allergies & Intolerances</Text>
            <Text style={styles.stepSubtitle}>
              Products with your allergens will be flagged immediately
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
                  testID={`allergy-${a.id}`}
                >
                  <Text
                    style={[
                      styles.allergyChipText,
                      allergies.includes(a.id) && styles.allergyChipTextActive,
                    ]}
                  >
                    {a.label}
                  </Text>
                  {allergies.includes(a.id) && (
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.skipHint}>Skip if none apply</Text>
          </Animated.View>
        );
      case 3:
        return (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContent}>
            <Text style={styles.stepTitle}>Your Goal</Text>
            <Text style={styles.stepSubtitle}>
              What matters most to you right now?
            </Text>
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
                  testID={`goal-${g.id}`}
                >
                  <Ionicons
                    name={g.icon}
                    size={28}
                    color={goal === g.id ? Colors.white : Colors.primary}
                  />
                  <Text
                    style={[
                      styles.goalCardText,
                      goal === g.id && styles.goalCardTextActive,
                    ]}
                  >
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        );
      case 4:
        return (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContent}>
            <Text style={styles.stepTitle}>Dietary Preference</Text>
            <Text style={styles.stepSubtitle}>
              Help us suggest the best alternatives for you
            </Text>
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
                  testID={`diet-${d.id}`}
                >
                  <Text
                    style={[
                      styles.dietRowText,
                      diet === d.id && styles.dietRowTextActive,
                    ]}
                  >
                    {d.label}
                  </Text>
                  {diet === d.id && (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age (optional)</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="e.g., 35"
                placeholderTextColor={Colors.lightGray}
                keyboardType="numeric"
              />
            </View>
          </Animated.View>
        );
    }
  }

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.header,
          { paddingTop: (insets.top || webTopInset) + 8 },
        ]}
      >
        {step > 0 && (
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setStep(step - 1);
            }}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.charcoal} />
          </TouchableOpacity>
        )}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((step + 1) / totalSteps) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.stepIndicator}>
          {step + 1}/{totalSteps}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 16) + 8 },
        ]}
      >
        <TouchableOpacity
          style={[styles.nextBtnWrapper, loading && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={loading || (step === 0 && !email.trim())}
          activeOpacity={0.8}
          testID="next-button"
        >
          <LinearGradient
            colors={["#2E7D32", "#388E3C"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextBtn}
          >
            <Text style={styles.nextBtnText}>
              {loading
                ? "Saving..."
                : step === totalSteps - 1
                  ? "Start Scanning"
                  : "Continue"}
            </Text>
            {!loading && (
              <Ionicons name="arrow-forward" size={20} color={Colors.white} />
            )}
          </LinearGradient>
        </TouchableOpacity>
        {step > 0 && step < totalSteps - 1 && (
          <TouchableOpacity
            onPress={() => {
              setStep(step + 1);
            }}
            style={styles.skipBtn}
          >
            <Text style={styles.skipBtnText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.screenBg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  progressBar: {
    flex: 1,
    height: 5,
    backgroundColor: Colors.primaryPale,
    borderRadius: 2.5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 2.5,
  },
  stepIndicator: {
    fontSize: 13,
    color: Colors.mediumGray,
    fontWeight: "600",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  stepContent: {
    flex: 1,
  },
  stepIcon: {
    alignItems: "center",
    marginBottom: 16,
  },
  stepIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.charcoal,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 15,
    color: Colors.mediumGray,
    lineHeight: 22,
    marginBottom: 28,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.charcoal,
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.lightGray,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.charcoal,
    backgroundColor: Colors.white,
    ...cardShadow("subtle"),
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  conditionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primaryPale,
    backgroundColor: Colors.white,
    ...cardShadow("subtle"),
  },
  conditionChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  conditionChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.charcoal,
  },
  conditionChipTextActive: {
    color: Colors.white,
  },
  allergyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.lightGray,
    backgroundColor: Colors.white,
  },
  allergyChipActive: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
    shadowColor: Colors.danger,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  allergyChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.charcoal,
  },
  allergyChipTextActive: {
    color: Colors.white,
  },
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  goalCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.primaryPale,
    backgroundColor: Colors.white,
    alignItems: "center",
    gap: 10,
    ...cardShadow("subtle"),
  },
  goalCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  goalCardText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.charcoal,
    textAlign: "center",
  },
  goalCardTextActive: {
    color: Colors.white,
  },
  dietList: {
    gap: 8,
    marginBottom: 24,
  },
  dietRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: "transparent",
    ...cardShadow("subtle"),
  },
  dietRowActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPale,
    borderWidth: 2,
  },
  dietRowText: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.charcoal,
  },
  dietRowTextActive: {
    color: Colors.primary,
    fontWeight: "600",
  },
  skipHint: {
    textAlign: "center",
    fontSize: 13,
    color: Colors.mediumGray,
    marginTop: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: Colors.white,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  nextBtnWrapper: {
    width: "100%",
  },
  nextBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: 16,
    ...cardShadow("medium"),
  },
  nextBtnDisabled: {
    opacity: 0.5,
  },
  nextBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.white,
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipBtnText: {
    fontSize: 14,
    color: Colors.mediumGray,
    fontWeight: "500",
  },
});
