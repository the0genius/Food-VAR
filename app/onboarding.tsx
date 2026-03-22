import { useState, useMemo } from "react";
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
  Alert,
  Image,
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
  ShieldCheck,
  GoogleLogo,
  AppleLogo,
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
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

WebBrowser.maybeCompleteAuthSession();
import Colors, { C, cardShadow, useThemeColors, type ThemeColors } from "@/constants/colors";
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

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, loginWithGoogle, loginWithApple, devLogin, updateProfile } = useUser();
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [diet, setDiet] = useState("none");
  const [loading, setLoading] = useState(false);

  const [consentChecked, setConsentChecked] = useState(false);
  const totalSteps = 6;
  const progressWidth = useSharedValue(((0 + 1) / totalSteps) * 100);

  const progressAnimStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%` as any,
  }));

  const redirectUri = Linking.createURL("onboarding");

  async function googlePromptAsync(): Promise<{ type: string; params?: { id_token?: string } }> {
    const nonce = Date.now().toString(36) + Math.random().toString(36).substring(2);
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=id_token` +
      `&scope=${encodeURIComponent("openid email profile")}` +
      `&nonce=${nonce}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
    if (result.type === "success" && result.url) {
      const url = new URL(result.url.replace("#", "?"));
      const idToken = url.searchParams.get("id_token");
      if (idToken) {
        return { type: "success", params: { id_token: idToken } };
      }
    }
    return { type: "cancel" };
  }

  function toggleItem(list: string[], setList: (v: string[]) => void, id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (list.includes(id)) {
      setList(list.filter((i) => i !== id));
    } else {
      setList([...list, id]);
    }
  }

  async function handleGoogleLogin() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const result = await googlePromptAsync();
      if (result.type === "success" && result.params?.id_token) {
        const loggedInUser = await loginWithGoogle(result.params.id_token);
        if (loggedInUser?.onboardingCompleted) {
          router.replace("/(tabs)");
        } else {
          const nextStep = 1;
          setStep(nextStep);
          progressWidth.value = withTiming(((nextStep + 1) / totalSteps) * 100, { duration: 350 });
        }
      }
    } catch (e: unknown) {
      console.error("Google login failed:", e);
      const errorMsg = e instanceof Error && e.message?.includes("linked to a different")
        ? "This email is already linked to a different sign-in method. Please use the original provider."
        : "Could not sign in with Google. Please try again.";
      Alert.alert("Sign In Failed", errorMsg);
    }
    setLoading(false);
  }

  async function handleAppleLogin() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (Platform.OS !== "ios") {
      Alert.alert("Not Available", "Apple Sign In is only available on iOS devices.");
      return;
    }

    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Not Available", "Apple Sign In is not available on this device.");
      return;
    }

    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });
      if (credential.identityToken) {
        const appleName = credential.fullName
          ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(" ")
          : undefined;
        const loggedInUser = await loginWithApple(credential.identityToken, appleName || undefined);
        if (loggedInUser?.onboardingCompleted) {
          router.replace("/(tabs)");
        } else {
          const nextStep = 1;
          setStep(nextStep);
          progressWidth.value = withTiming(((nextStep + 1) / totalSteps) * 100, { duration: 350 });
        }
      }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err?.code !== "ERR_REQUEST_CANCELED") {
        console.error("Apple login failed:", e);
        const errorMsg = err?.message?.includes("linked to a different")
          ? "This email is already linked to a different sign-in method. Please use the original provider."
          : "Could not sign in with Apple. Please try again.";
        Alert.alert("Sign In Failed", errorMsg);
      }
    }
    setLoading(false);
  }

  async function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
          consentPolicyVersion: "1.0",
          consentAiVersion: "1.0",
          consentAcceptedAt: new Date().toISOString(),
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
            <View style={styles.stepLogoWrap}>
              <Image
                source={
                  theme.isDark
                    ? require("@/assets/images/logo-dark.png")
                    : require("@/assets/images/logo-light.png")
                }
                style={styles.stepLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.stepTitle}>Welcome to FoodVAR</Text>
            <Text style={styles.stepSubtitle}>
              Scan any food product and get a health score personalized to your diet, allergies, and goals — in seconds.
            </Text>
            <View style={styles.socialButtonsWrap}>
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGoogleLogin}
                disabled={loading}
                activeOpacity={0.8}
                testID="google-login-button"
                accessibilityLabel="Continue with Google"
                accessibilityRole="button"
              >
                <GoogleLogo size={22} color={theme.brandGoogle} weight="bold" />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </TouchableOpacity>

              {Platform.OS === "ios" ? (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={
                    theme.isDark
                      ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                      : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  }
                  cornerRadius={16}
                  style={styles.appleNativeBtn}
                  onPress={handleAppleLogin}
                />
              ) : (
                <TouchableOpacity
                  style={styles.appleBtn}
                  onPress={handleAppleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                  testID="apple-login-button"
                  accessibilityLabel="Continue with Apple"
                  accessibilityRole="button"
                >
                  <AppleLogo size={22} color={theme.onPrimary} weight="fill" />
                  <Text style={styles.appleBtnText}>Continue with Apple</Text>
                </TouchableOpacity>
              )}
            </View>
            {loading && (
              <MotiView
                from={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                transition={{ loop: true, type: "timing", duration: 850 }}
                style={styles.loadingIndicator}
              >
                <Text style={styles.loadingText}>Signing in...</Text>
              </MotiView>
            )}
            {!loading && (
              <Text style={styles.trustLine}>
                Your data stays private. We never share health information.
              </Text>
            )}
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
              Select any conditions you manage. We'll tailor wellness scores to your profile.
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
                    accessibilityLabel={`${c.label}, ${isActive ? "selected" : "not selected"}`}
                    accessibilityRole="checkbox"
                  >
                    {isActive ? (
                      <CheckCircle size={20} color={theme.onPrimary} weight="fill" />
                    ) : (
                      <IconComp size={20} color={theme.primary} />
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
            <Text style={styles.wellnessNote}>
              This is not a medical tool — scores are for general wellness only.
            </Text>
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
              Products with your allergens will be flagged — always verify with the actual label
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
                    accessibilityLabel={`${a.label}, ${isActive ? "selected" : "not selected"}`}
                    accessibilityRole="checkbox"
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
                      <CheckCircle size={16} color={theme.onPrimary} weight="fill" />
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
                    accessibilityLabel={`${g.label}, ${isActive ? "selected" : "not selected"}`}
                    accessibilityRole="radio"
                  >
                    {isActive ? (
                      <CheckCircle size={28} color={theme.onPrimary} weight="fill" />
                    ) : (
                      <IconComp size={28} color={theme.primary} />
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
                    accessibilityLabel={`${d.label}, ${isActive ? "selected" : "not selected"}`}
                    accessibilityRole="radio"
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
                      <CheckCircle size={22} color={theme.primary} weight="fill" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name (optional)</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={theme.placeholder}
                autoCapitalize="words"
                testID="name-input"
                accessibilityLabel="Your name"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age (optional)</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="e.g., 35"
                placeholderTextColor={theme.placeholder}
                keyboardType="numeric"
                accessibilityLabel="Your age"
              />
            </View>
          </MotiView>
        );
      case 5:
        return (
          <MotiView
            from={{ opacity: 0, translateX: 60 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: "timing", duration: 450 }}
            key="step-5"
            style={styles.stepContent}
          >
            <View style={styles.stepIcon}>
              <LinearGradient
                colors={[theme.mint, theme.primary]}
                style={styles.stepIconCircle}
              >
                <ShieldCheck size={56} color={theme.onPrimary} weight="fill" />
              </LinearGradient>
            </View>
            <Text style={styles.stepTitle}>Before You Start</Text>
            <Text style={styles.stepSubtitle}>
              Please review and agree to our policies
            </Text>

            <View style={styles.consentWarningBox}>
              <Text style={styles.consentWarningText}>
                FoodVAR is not a medical device. Health scores and AI-generated advice are informational only. Always consult a healthcare professional for medical decisions.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.consentLink}
              onPress={() => router.push("/privacy")}
              accessibilityLabel="Read privacy policy"
              accessibilityRole="link"
            >
              <Text style={styles.consentLinkText}>Read Privacy Policy</Text>
              <ArrowRight size={16} color={theme.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.consentLink}
              onPress={() => router.push("/terms")}
              accessibilityLabel="Read terms of service"
              accessibilityRole="link"
            >
              <Text style={styles.consentLinkText}>Read Terms of Service</Text>
              <ArrowRight size={16} color={theme.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.consentCheckRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setConsentChecked(!consentChecked);
              }}
              testID="consent-checkbox"
              accessibilityLabel={consentChecked ? "Consent accepted. Tap to uncheck" : "Accept privacy policy and terms of service"}
              accessibilityRole="checkbox"
            >
              <View style={[styles.checkbox, consentChecked && styles.checkboxChecked]}>
                {consentChecked && <CheckCircle size={20} color={theme.onPrimary} weight="fill" />}
              </View>
              <Text style={styles.consentCheckText}>
                I agree to the Privacy Policy and Terms of Service, and understand that AI-generated advice is not medical advice.
              </Text>
            </TouchableOpacity>
          </MotiView>
        );
    }
  }

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const isStep0 = step === 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
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
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
        )}
        <View style={styles.progressBar} accessibilityLabel={`Step ${step + 1} of ${totalSteps}`} accessibilityRole="progressbar">
          <Animated.View style={[styles.progressFillContainer, progressAnimStyle]}>
            <LinearGradient
              colors={[theme.mint, theme.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.progressGradient}
            />
          </Animated.View>
        </View>
        <Text style={styles.stepIndicator} accessibilityLabel={`Step ${step + 1} of ${totalSteps}`}>
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

      {!isStep0 && (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 16) + 8 },
          ]}
        >
          <TouchableOpacity
            style={[styles.nextBtnWrapper, loading && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={loading || (step === 5 && !consentChecked)}
            activeOpacity={0.8}
            testID="next-button"
            accessibilityLabel={loading ? "Saving" : step === totalSteps - 1 ? "Start scanning" : "Continue to next step"}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[theme.mint, theme.primary]}
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
                <ArrowRight size={20} color={theme.onPrimary} weight="bold" />
              )}
            </LinearGradient>
          </TouchableOpacity>
          {step > 0 && step < totalSteps - 1 && (
            <TouchableOpacity
              onPress={handleSkip}
              style={styles.skipBtn}
              accessibilityLabel="Skip this step"
              accessibilityRole="button"
            >
              <Text style={styles.skipBtnText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isStep0 && (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 16) + 8 },
          ]}
        >
          {__DEV__ && (
            <TouchableOpacity
              onPress={async () => {
                setLoading(true);
                try {
                  await devLogin();
                  router.replace("/(tabs)");
                } catch (e) {
                  console.error("Dev login failed:", e);
                }
                setLoading(false);
              }}
              style={[styles.skipBtn, { marginTop: 0 }]}
              disabled={loading}
              accessibilityLabel="Skip sign up (dev only)"
              accessibilityRole="button"
            >
              <Text style={[styles.skipBtnText, { color: theme.amber }]}>
                Skip Sign Up (Dev Only)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: theme.tinted,
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
    color: theme.placeholder,
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
  stepLogoWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  stepLogo: {
    width: 220,
    height: 80,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 15,
    color: theme.muted,
    lineHeight: 22,
    marginBottom: 28,
  },
  socialButtonsWrap: {
    gap: 14,
    marginTop: 8,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    height: 54,
    borderRadius: 16,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    ...cardShadow("medium"),
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.text,
  },
  appleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    height: 54,
    borderRadius: 16,
    backgroundColor: theme.brandApple,
    ...cardShadow("medium"),
  },
  appleBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.onDark,
  },
  appleNativeBtn: {
    height: 54,
    width: "100%",
  },
  loadingIndicator: {
    alignItems: "center",
    marginTop: 20,
  },
  loadingText: {
    fontSize: 14,
    color: theme.muted,
    fontWeight: "500",
  },
  trustLine: {
    fontSize: 13,
    color: theme.placeholder,
    textAlign: "center",
    marginTop: 20,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 0.5,
    borderColor: theme.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 15,
    color: theme.text,
    backgroundColor: theme.card,
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
    borderColor: theme.border,
    backgroundColor: theme.card,
    ...cardShadow("subtle"),
  },
  conditionChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
    shadowColor: theme.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  conditionChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
  },
  conditionChipTextActive: {
    color: theme.onPrimary,
  },
  allergyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  allergyChipActive: {
    backgroundColor: theme.danger,
    borderColor: theme.danger,
    shadowColor: theme.danger,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  allergyChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.text,
  },
  allergyChipTextActive: {
    color: theme.onPrimary,
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
    borderColor: theme.border,
    backgroundColor: theme.card,
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
  goalCardText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.text,
  },
  goalCardTextActive: {
    color: theme.onPrimary,
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
  dietRowText: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.text,
  },
  dietRowTextActive: {
    color: theme.primary,
    fontWeight: "600" as const,
  },
  skipHint: {
    textAlign: "center",
    fontSize: 13,
    color: theme.muted,
    marginTop: 20,
  },
  wellnessNote: {
    textAlign: "center" as const,
    fontSize: 11,
    color: theme.muted,
    marginTop: 12,
    paddingHorizontal: 16,
    lineHeight: 15,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: theme.card,
    alignItems: "center",
    gap: 8,
    shadowColor: theme.shadow,
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
    color: theme.onPrimary,
  },
  skipBtn: {
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: "center" as const,
  },
  skipBtnText: {
    fontSize: 14,
    color: theme.muted,
    fontWeight: "500",
  },
  consentWarningBox: {
    backgroundColor: theme.warningBg,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: theme.warningBorder,
    marginBottom: 20,
  },
  consentWarningText: {
    fontSize: 13,
    color: theme.warningText,
    lineHeight: 20,
  },
  consentLink: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: theme.card,
    borderWidth: 0.5,
    borderColor: theme.border,
    marginBottom: 10,
    ...cardShadow("subtle"),
  },
  consentLinkText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: theme.primary,
  },
  consentCheckRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 12,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: theme.card,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  consentCheckText: {
    flex: 1,
    fontSize: 13,
    color: theme.muted,
    lineHeight: 20,
  },
});
