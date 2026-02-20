import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, View, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function TabLayout() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || !user.onboardingCompleted)) {
      router.replace("/onboarding");
    }
  }, [isLoading, user]);

  if (isLoading || !user?.onboardingCompleted) {
    return <View style={{ flex: 1, backgroundColor: Colors.screenBg }} />;
  }

  const tabBarHeight = Platform.OS === "web" ? 84 : 70;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#3DD68C",
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: tabBarHeight,
          position: "absolute",
          bottom: 12,
          marginHorizontal: 16,
          left: 0,
          right: 0,
          borderRadius: 24,
          backgroundColor: Colors.white,
          borderWidth: 0.5,
          borderColor: "rgba(0,0,0,0.04)",
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
            },
            android: {
              elevation: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
            },
            web: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
            },
          }),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, size }) => (
            <View style={styles.scanIconWrap}>
              <Ionicons name="scan" size={size} color={Colors.white} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3DD68C",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -20,
    ...Platform.select({
      ios: {
        shadowColor: "#3DD68C",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
        shadowColor: "#3DD68C",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      web: {
        shadowColor: "#3DD68C",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
    }),
  },
});
