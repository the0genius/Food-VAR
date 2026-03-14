import { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "phosphor-react-native";
import Colors, { C, cardShadow, useThemeColors, type ThemeColors } from "@/constants/colors";

const POLICY_VERSION = "1.0";
const EFFECTIVE_DATE = "March 13, 2026";

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessibilityRole="button">
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy Policy</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.version}>Version {POLICY_VERSION} — Effective {EFFECTIVE_DATE}</Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.body}>
          We collect information you provide during registration and onboarding, including your email address, name, age, health conditions, allergies, dietary preferences, and health goals. We also collect data about the products you scan or search for.
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.body}>
          Your health profile is used solely to compute personalized food scores and generate dietary guidance. We do not sell, rent, or share your personal health data with third parties for marketing purposes.
        </Text>

        <Text style={styles.sectionTitle}>3. AI-Generated Content</Text>
        <Text style={styles.body}>
          FoodVAR uses artificial intelligence (Google Gemini) to generate personalized dietary advice and extract nutritional information from product labels. AI-generated advice is informational only and should not replace professional medical guidance. See our Terms of Service for full disclaimers.
        </Text>

        <Text style={styles.sectionTitle}>4. Data Storage & Security</Text>
        <Text style={styles.body}>
          Your data is stored in a secure PostgreSQL database. Passwords are hashed using bcrypt and are never stored in plain text. Authentication uses short-lived JWT access tokens and rotated refresh tokens. We use HTTPS for all data transmission.
        </Text>

        <Text style={styles.sectionTitle}>5. Data Retention</Text>
        <Text style={styles.body}>
          We retain your data as long as your account is active. Scan history and cached advice are retained to provide consistent scoring and personalized recommendations. You may request deletion of your account and all associated data at any time.
        </Text>

        <Text style={styles.sectionTitle}>6. Your Rights</Text>
        <Text style={styles.body}>
          You have the right to:{"\n"}
          {"\n"}• Export all your data in a portable format
          {"\n"}• Delete your account and all associated data
          {"\n"}• Update or correct your health profile at any time
          {"\n"}• Withdraw consent for AI-generated advice
          {"\n"}{"\n"}These actions are available in your Profile settings.
        </Text>

        <Text style={styles.sectionTitle}>7. Third-Party Services</Text>
        <Text style={styles.body}>
          We use Google Gemini (via Replit AI Integrations) for AI advice generation. When AI advice is enabled, anonymized product and health profile data is sent to the AI service. No personally identifiable information (name, email) is included in AI requests.
        </Text>

        <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
        <Text style={styles.body}>
          FoodVAR is not intended for users under 13 years of age. We do not knowingly collect information from children under 13. If we learn we have collected such data, we will delete it promptly.
        </Text>

        <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
        <Text style={styles.body}>
          We may update this Privacy Policy from time to time. We will notify you of significant changes through the app. Continued use of FoodVAR after changes constitutes acceptance of the updated policy.
        </Text>

        <Text style={styles.sectionTitle}>10. Contact</Text>
        <Text style={styles.body}>
          If you have questions about this Privacy Policy, please contact us through the app's support channels.
        </Text>
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
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: theme.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  version: {
    fontSize: 12,
    color: theme.placeholder,
    fontWeight: "500" as const,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: theme.text,
    marginTop: 20,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: theme.muted,
    lineHeight: 22,
  },
});
