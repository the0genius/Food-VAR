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
    return <View style={{ flex: 1, backgroundColor: Colors.white }} />;
  }

  const tabBarHeight = Platform.OS === "web" ? 84 : 88;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        tabBarStyle: {
          height: tabBarHeight,
          paddingTop: 6,
          borderTopWidth: 0.5,
          borderTopColor: Colors.lightGray,
          backgroundColor: Colors.white,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
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
              <Ionicons name="scan" size={size + 4} color={Colors.white} />
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -8,
  },
});
