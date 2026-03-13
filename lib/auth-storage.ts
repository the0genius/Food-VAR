import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

let SecureStore: typeof import("expo-secure-store") | null = null;

async function getSecureStore() {
  if (SecureStore) return SecureStore;
  if (Platform.OS !== "web") {
    try {
      SecureStore = await import("expo-secure-store");
      return SecureStore;
    } catch {
      return null;
    }
  }
  return null;
}

const KEYS = {
  accessToken: "foodvar_access_token",
  refreshToken: "foodvar_refresh_token",
} as const;

export async function getAccessToken(): Promise<string | null> {
  const store = await getSecureStore();
  if (store) {
    return store.getItemAsync(KEYS.accessToken);
  }
  return AsyncStorage.getItem(KEYS.accessToken);
}

export async function getRefreshToken(): Promise<string | null> {
  const store = await getSecureStore();
  if (store) {
    return store.getItemAsync(KEYS.refreshToken);
  }
  return AsyncStorage.getItem(KEYS.refreshToken);
}

export async function setTokens(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const store = await getSecureStore();
  if (store) {
    await store.setItemAsync(KEYS.accessToken, accessToken);
    await store.setItemAsync(KEYS.refreshToken, refreshToken);
  } else {
    await AsyncStorage.setItem(KEYS.accessToken, accessToken);
    await AsyncStorage.setItem(KEYS.refreshToken, refreshToken);
  }
}

export async function clearTokens(): Promise<void> {
  const store = await getSecureStore();
  if (store) {
    await store.deleteItemAsync(KEYS.accessToken);
    await store.deleteItemAsync(KEYS.refreshToken);
  } else {
    await AsyncStorage.removeItem(KEYS.accessToken);
    await AsyncStorage.removeItem(KEYS.refreshToken);
  }
  await AsyncStorage.removeItem("foodvar_user_id");
}
