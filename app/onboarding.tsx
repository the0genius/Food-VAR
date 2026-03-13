import { useState } from "react";
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
import {
  UserCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Drop,
  Heart,
  Barbell,
  Leaf,
  FirstAid,
  Person,
  Grains,
  Pill,
  TrendDown,
  Heartbeat,
} from "phosphor-react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Colors, { C, cardShadow } from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, register, login, updateProfile } = useUser();
  const [step, setStep] = useState(0);
  const [isLoginMode, setIsLoginMode] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [diet, setDiet] = useState("none");
  const [loading, setLoading] = useState(false);

  const totalSteps = 5;
  const progressWidth = useSharedValue(((0 + 1) / totalSteps) * 100);

  const progressAnimStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%` as any,
  }));

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
      if (!email.trim() || !password.trim()) return;
      setLoading(true);
      try {
        if (isLoginMode) {
          await login(email.trim(), password.trim());
          router.replace("/(tabs)");
          setLoading(false);
          return;
        } else {
          await register(email.trim(), password.trim(), name.trim());
        }
      } catch (e: any) {
        const msg = e?.message || "";
        if (msg.includes("409")) {
          setIsLoginMode(true);
        }
        console.error(e);
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    if (step < totalSteps - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      progressWidth.value = withTiming(((nextStep + 1) / totalSteps) * 100, { duration: 350 });
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

  function handleBack() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prevStep = step - 1;
    setStep(prevStep);
    progressWidth.value = withTiming(((prevStep + 1) / totalSteps) * 100, { duration: 350 });
  }

  function handleSkip() {
    const nextStep = step + 1;
    setStep(nextStep);
    progressWidth.value = withTiming(((nextStep + 1) / totalSteps) * 100, { duration: 350 });
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <MotiView
            from={{ opacity: 0, translateX: 60 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: "timing", duration: 450 }}
            key="step-0"
            style={styles.stepContent}
          >
            <View style={styles.stepIcon}>
              <LinearGradient
                colors={["#3DD68C", "#2E7D32"]}
                style={styles.stepIconCircle}
              >
                <UserCircle size={56} color="#fff" weight="fill" />
              </LinearGradient>
            </View>
            <Text style={styles.stepTitle}>{isLoginMode ? "Welcome Back" : "Welcome to FoodVAR"}</Text>
            <Text style={styles.stepSubtitle}>
              {isLoginMode
                ? "Sign in to access your personalized food scores"
                : "Get personalized food scores based on your unique health profile"}
            </Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={C.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                testID="email-input"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={isLoginMode ? "Your password" : "Create a password (8+ characters)"}
                placeholderTextColor={C.placeholder}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                testID="password-input"
              />
            </View>
            {!isLoginMode && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={C.placeholder}
                  autoCapitalize="words"
                  testID="name-input"
                />
              </View>
            )}
            <TouchableOpacity
              onPress={() => setIsLoginMode(!isLoginMode)}
              style={{ alignSelf: "center", paddingVertical: 8 }}
            >
              <Text style={{ color: C.primary, fontSize: 14, fontWeight: "600" as const }}>
                {isLoginMode ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </Text>
            </TouchableOpacity>
          </MotiView>
        );
      case 1:
        return (
          <MotiView
            from={{ opacity: 0, translateX: 60 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: "timing", duration: 450 }}
            key="step-1"
            style={styles.stepContent}
          >
            <Text style={styles.stepTitle}>Health Conditions</Text>
            <Text style={styles.stepSubtitle}>
              Select any conditions you manage. We'll tailor scores to your needs.
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
                    testID={`condition-${c.id}`}
                  >
                    {isActive ? (
                      <CheckCircle size={20} color="#fff" weight="fill" />
                    ) : (
                      <IconComp size={20} color={C.primary} />
                    )}
                    <Text
                      style={[
                        styles.conditionChipText,
                        isActive && styles.conditionChipTextActive,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.skipHint}>Skip if none apply</Text>
          </MotiView>
        );
      case 2:
        return (
          <MotiView
            from={{ opacity: 0, translateX: 60 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: "timing", duration: 450 }}
            key="step-2"
            style={styles.stepContent}
          >
            <Text style={styles.stepTitle}>Allergies & Intolerances</Text>
            <Text style={styles.stepSubtitle}>
              Products with your allergens will be flagged immediately
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
                    testID={`allergy-${a.id}`}
                  >
                    <Text
                      style={[
                        styles.allergyChipText,
                        isActive && styles.allergyChipTextActive,
                      ]}
                    >
                      {a.label}
                    </Text>
                    {isActive && (
                      <CheckCircle size={16} color="#fff" weight="fill" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.skipHint}>Skip if none apply</Text>
          </MotiView>
        );
      case 3:
        return (
          <MotiView
            from={{ opacity: 0, translateX: 60 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: "timing", duration: 450 }}
            key="step-3"
            style={styles.stepContent}
          >
            <Text style={styles.stepTitle}>Your Goal</Text>
            <Text style={styles.stepSubtitle}>
              What matters most to you right now?
            </Text>
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
                    testID={`goal-${g.id}`}
                  >
                    {isActive ? (
                      <CheckCircle size={28} color="#fff" weight="fill" />
                    ) : (
                      <IconComp size={28} color={C.primary} />
                    )}
                    <Text
                      style={[
                        styles.goalCardText,
                        isActive && styles.goalCardTextActive,
                      ]}
                    >
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </MotiView>
        );
      case 4:
        return (
          <MotiView
            from={{ opacity: 0, translateX: 60 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: "timing", duration: 450 }}
            key="step-4"
            style={styles.stepContent}
          >
            <Text style={styles.stepTitle}>Dietary Preference</Text>
            <Text style={styles.stepSubtitle}>
              Help us suggest the best alternatives for you
            </Text>
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
                    testID={`diet-${d.id}`}
                  >
                    <Text
                      style={[
                        styles.dietRowText,
                        isActive && styles.dietRowTextActive,
                      ]}
                    >
                      {d.label}
                    </Text>
                    {isActive && (
                      <CheckCircle size={22} color={C.primary} weight="fill" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age (optional)</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="e.g., 35"
                placeholderTextColor={C.placeholder}
                keyboardType="numeric"
              />
            </View>
          </MotiView>
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
            onPress={handleBack}
            style={styles.backBtn}
          >
            <ArrowLeft size={24} color={C.text} />
          </TouchableOpacity>
        )}
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFillContainer, progressAnimStyle]}>
            <LinearGradient
              colors={["#3DD68C", "#2E7D32"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.progressGradient}
            />
          </Animated.View>
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
          disabled={loading || (step === 0 && (!email.trim() || !password.trim()))}
          activeOpacity={0.8}
          testID="next-button"
        >
          <LinearGradient
            colors={["#3DD68C", "#2E7D32"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextBtn}
          >
            <Text style={styles.nextBtnText}>
              {loading
                ? "Saving..."
                : step === 0 && isLoginMode
                  ? "Sign In"
                  : step === totalSteps - 1
                    ? "Start Scanning"
                    : "Continue"}
            </Text>
            {!loading && (
              <ArrowRight size={20} color="#fff" weight="bold" />
            )}
          </LinearGradient>
        </TouchableOpacity>
        {step > 0 && step < totalSteps - 1 && (
          <TouchableOpacity
            onPress={handleSkip}
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
    backgroundColor: C.bg,
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
    height: 6,
    backgroundColor: "#E0EDE1",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFillContainer: {
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressGradient: {
    flex: 1,
    borderRadius: 999,
  },
  stepIndicator: {
    fontSize: 13,
    color: C.placeholder,
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
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: C.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 15,
    color: C.muted,
    lineHeight: 22,
    marginBottom: 28,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 15,
    color: C.text,
    backgroundColor: C.card,
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
    borderWidth: 0.5,
    borderColor: C.border,
    backgroundColor: C.card,
    ...cardShadow("subtle"),
  },
  conditionChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
    shadowColor: C.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  conditionChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
  },
  conditionChipTextActive: {
    color: "#fff",
  },
  allergyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  allergyChipActive: {
    backgroundColor: C.danger,
    borderColor: C.danger,
    shadowColor: C.danger,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  allergyChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: C.text,
  },
  allergyChipTextActive: {
    color: "#fff",
  },
  goalGrid: {
    gap: 10,
  },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: C.border,
    backgroundColor: C.card,
    ...cardShadow("subtle"),
  },
  goalCardActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
    shadowColor: C.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  goalCardText: {
    fontSize: 15,
    fontWeight: "600",
    color: C.text,
  },
  goalCardTextActive: {
    color: "#fff",
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
    backgroundColor: C.card,
    borderWidth: 0.5,
    borderColor: C.border,
    ...cardShadow("subtle"),
  },
  dietRowActive: {
    borderColor: C.primary,
    backgroundColor: C.tinted,
    borderWidth: 1.5,
  },
  dietRowText: {
    fontSize: 15,
    fontWeight: "500",
    color: C.text,
  },
  dietRowTextActive: {
    color: C.primary,
    fontWeight: "600" as const,
  },
  skipHint: {
    textAlign: "center",
    fontSize: 13,
    color: C.muted,
    marginTop: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: C.card,
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
    borderRadius: 999,
    ...cardShadow("medium"),
  },
  nextBtnDisabled: {
    opacity: 0.5,
  },
  nextBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  skipBtn: {
    paddingVertical: 12,
  },
  skipBtnText: {
    fontSize: 14,
    color: C.muted,
    fontWeight: "500",
  },
});
