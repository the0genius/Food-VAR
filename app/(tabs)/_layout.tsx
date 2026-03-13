import { Tabs } from "expo-router";
import { Platform, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { House, Barcode, ClockCounterClockwise, User } from "phosphor-react-native";
import { C } from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
        color={focused ? C.primary : C.placeholder}
        weight={focused ? "fill" : "regular"}
      />
      {focused && (
        <Text style={styles.tabLabel}>{label}</Text>
      )}
    </View>
  );
}

export default function TabLayout() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isLoading && (!user || !user.onboardingCompleted)) {
      router.replace("/onboarding");
    }
  }, [isLoading, user]);

  if (isLoading || !user?.onboardingCompleted) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  const bottomPadding = Platform.OS === "web" ? 20 : Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.placeholder,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 52 + bottomPadding,
          paddingBottom: bottomPadding,
          backgroundColor: C.card,
          borderTopWidth: 1,
          borderTopColor: "rgba(0,0,0,0.06)",
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
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={House} label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: () => (
            <LinearGradient
              colors={["#3DD68C", "#2E7D32"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scanPill}
            >
              <Barcode size={18} color="white" weight="bold" />
              <Text style={styles.scanPillText}>Scan</Text>
            </LinearGradient>
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              onPress={(e) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                if (props.onPress) props.onPress(e);
              }}
              activeOpacity={0.85}
              style={[props.style, { flex: 1, alignItems: "center", justifyContent: "center" }]}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={ClockCounterClockwise} label="History" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={User} label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: C.primary,
    lineHeight: 12,
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
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
    }),
  },
  scanPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "white",
    letterSpacing: 0.5,
  },
});
