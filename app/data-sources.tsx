import { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ArrowSquareOut, Database, Flask, Users } from "phosphor-react-native";
import { useThemeColors, type ThemeColors } from "@/constants/colors";

const FATSECRET_URL = "https://www.fatsecret.com";
const FATSECRET_API_URL = "https://platform.fatsecret.com/api/";

export default function DataSourcesScreen() {
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Data Sources</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: theme.subtext }]}>
          FoodVAR combines multiple data sources to provide accurate nutritional information and personalized health scores.
        </Text>

        <View style={[styles.sourceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: theme.tealBg }]}>
            <Database size={20} color={theme.tealScore} weight="fill" />
          </View>
          <Text style={[styles.sourceTitle, { color: theme.text }]}>FatSecret Platform API</Text>
          <Text style={[styles.sourceDesc, { color: theme.subtext }]}>
            Nutritional data for barcode-scanned products is provided by the FatSecret Platform API. FatSecret maintains a comprehensive database of food and nutrition information.
          </Text>
          <TouchableOpacity
            style={[styles.linkBtn, { backgroundColor: theme.tealBg }]}
            onPress={() => Linking.openURL(FATSECRET_URL)}
            accessibilityLabel="Visit FatSecret website"
            accessibilityRole="link"
          >
            <Text style={[styles.linkText, { color: theme.tealScore }]}>Powered by FatSecret</Text>
            <ArrowSquareOut size={14} color={theme.tealScore} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL(FATSECRET_API_URL)}
            accessibilityLabel="Visit FatSecret Platform API"
            accessibilityRole="link"
          >
            <Text style={[styles.apiLink, { color: theme.tealScore }]}>
              platform.fatsecret.com
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.sourceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: theme.purpleTint }]}>
            <Flask size={20} color={theme.purple} weight="fill" />
          </View>
          <Text style={[styles.sourceTitle, { color: theme.text }]}>AI-Powered Analysis</Text>
          <Text style={[styles.sourceDesc, { color: theme.subtext }]}>
            Personalized dietary advice and health scores are generated using Google Gemini AI, tailored to your health profile, conditions, and dietary preferences.
          </Text>
        </View>

        <View style={[styles.sourceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: theme.infoBg }]}>
            <Users size={20} color={theme.info} weight="fill" />
          </View>
          <Text style={[styles.sourceTitle, { color: theme.text }]}>Community Contributions</Text>
          <Text style={[styles.sourceDesc, { color: theme.subtext }]}>
            Users can contribute product information for items not found in external databases. Contributed products are reviewed before becoming publicly available.
          </Text>
        </View>

        <View style={[styles.disclaimerBox, { backgroundColor: theme.neutralBg, borderColor: theme.neutralBorder }]}>
          <Text style={[styles.disclaimerTitle, { color: theme.text }]}>Important Notice</Text>
          <Text style={[styles.disclaimerText, { color: theme.subtext }]}>
            Nutritional information is provided for general informational purposes only. Always verify product labels for the most accurate and up-to-date information, especially regarding allergens. FoodVAR is not a substitute for professional medical or dietary advice.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    backBtn: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      letterSpacing: -0.2,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    intro: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      lineHeight: 20,
      marginBottom: 20,
    },
    sourceCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 20,
      marginBottom: 16,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    sourceTitle: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      marginBottom: 8,
      letterSpacing: -0.2,
    },
    sourceDesc: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      lineHeight: 19,
      marginBottom: 12,
    },
    linkBtn: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      marginBottom: 8,
    },
    linkText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
    },
    apiLink: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      textDecorationLine: "underline",
    },
    disclaimerBox: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 16,
      marginTop: 8,
      marginBottom: 16,
    },
    disclaimerTitle: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      marginBottom: 6,
    },
    disclaimerText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
    },
  });
}
