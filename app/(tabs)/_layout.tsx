import { Tabs } from "expo-router";
import { Platform, View, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { House, Barcode, ClockCounterClockwise, User } from "phosphor-react-native";
import { C } from "@/constants/colors";
import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import * as Haptics from "expo-haptics";

export default function TabLayout() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || !user.onboardingCompleted)) {
      router.replace("/onboarding");
    }
  }, [isLoading, user]);

  if (isLoading || !user?.onboardingCompleted) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  const tabBarHeight = Platform.OS === "web" ? 92 : 68;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.placeholder,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: tabBarHeight,
          position: "absolute",
          bottom: Platform.OS === "web" ? 24 : 24,
          marginHorizontal: 20,
          left: 0,
          right: 0,
          borderRadius: 32,
          backgroundColor: C.card,
          borderWidth: 0.5,
          borderColor: C.border,
          paddingHorizontal: 8,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.14,
              shadowRadius: 24,
            },
            android: {
              elevation: 16,
            },
            web: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.14,
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
            <View style={focused ? styles.activeIconPill : undefined}>
              <House
                size={focused ? 24 : 22}
                color={focused ? C.primary : C.placeholder}
                weight={focused ? "fill" : "regular"}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: () => (
            <View style={styles.scanFabWrap}>
              <LinearGradient
                colors={["#3DD68C", "#2E7D32"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.scanFab}
              >
                <Barcode size={26} color="white" weight="bold" />
              </LinearGradient>
            </View>
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              onPress={(e) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                if (props.onPress) props.onPress(e);
              }}
              activeOpacity={0.8}
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
            <View style={focused ? styles.activeIconPill : undefined}>
              <ClockCounterClockwise
                size={focused ? 24 : 22}
                color={focused ? C.primary : C.placeholder}
                weight={focused ? "fill" : "regular"}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <View style={focused ? styles.activeIconPill : undefined}>
              <User
                size={focused ? 24 : 22}
                color={focused ? C.primary : C.placeholder}
                weight={focused ? "fill" : "regular"}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconPill: {
    backgroundColor: C.tinted,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scanFabWrap: {
    marginTop: -12,
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      web: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
    }),
  },
  scanFab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
});
