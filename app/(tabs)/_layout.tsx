import { Tabs } from "expo-router";
import { Platform, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { House, Barcode, ClockCounterClockwise, User } from "phosphor-react-native";
import { useThemeColors, type ThemeColors } from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);

  function TabIcon({
    icon: Icon,
    label,
    focused,
  }: {
    icon: typeof House;
    label: string;
    focused: boolean;
  }) {
    return (
      <View style={styles.tabIconWrap}>
        <Icon
          size={22}
          color={focused ? theme.primary : theme.placeholder}
          weight={focused ? "fill" : "regular"}
        />
        {focused && (
          <Text style={styles.tabLabel}>{label}</Text>
        )}
      </View>
    );
  }

  useEffect(() => {
    if (!isLoading && (!user || !user.onboardingCompleted)) {
      router.replace("/onboarding");
    }
  }, [isLoading, user]);

  if (isLoading || !user?.onboardingCompleted) {
    return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

  const bottomPadding = Platform.OS === "web" ? 20 : Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.placeholder,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          backgroundColor: theme.card,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          paddingHorizontal: 12,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.02,
              shadowRadius: 24,
            },
            android: {
              elevation: 4,
            },
            web: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.02,
              shadowRadius: 24,
            },
          }),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarAccessibilityLabel: "Home tab",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={House} label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarAccessibilityLabel: "Scan a product",
          tabBarIcon: () => (
            <LinearGradient
              colors={[theme.mint, theme.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scanPill}
            >
              <Barcode size={18} color={theme.onPrimary} weight="bold" />
              <Text style={styles.scanPillText}>Scan</Text>
            </LinearGradient>
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              onPress={(e) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                if (props.onPress) props.onPress(e);
              }}
              activeOpacity={0.85}
              style={[props.style, { flex: 1, alignItems: "center", justifyContent: "center" }]}
              accessibilityRole={props.accessibilityRole}
              accessibilityState={props.accessibilityState}
              accessibilityLabel={props.accessibilityLabel}
              testID={props.testID}
            >
              {props.children}
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarAccessibilityLabel: "Scan history tab",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={ClockCounterClockwise} label="History" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarAccessibilityLabel: "Your profile tab",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={User} label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  tabIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.primary,
    marginTop: 3,
  },
  scanPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: 120,
    height: 40,
    borderRadius: 20,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
    }),
  },
  scanPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.onPrimary,
    letterSpacing: 0.5,
  },
});
