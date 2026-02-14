import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

interface UserProfile {
  id: number;
  email: string;
  name: string;
  age: number | null;
  gender: string | null;
  heightCm: number | null;
  weightKg: number | null;
  conditions: string[];
  conditionsOther: string | null;
  allergies: string[];
  allergiesOther: string | null;
  dietaryPreference: string | null;
  goal: string | null;
  profileClusterId: string | null;
  onboardingCompleted: boolean;
  isPro: boolean;
  contributionCount: number;
}

interface UserContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, name: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const savedId = await AsyncStorage.getItem("foodvar_user_id");
      if (savedId) {
        const baseUrl = getApiUrl();
        const url = new URL(`/api/users/${savedId}`, baseUrl);
        const res = await fetch(url.toString());
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          await AsyncStorage.removeItem("foodvar_user_id");
        }
      }
    } catch (error) {
      console.error("Failed to load user:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, name: string) {
    const res = await apiRequest("POST", "/api/users", { email, name });
    const userData = await res.json();
    setUser(userData);
    await AsyncStorage.setItem("foodvar_user_id", String(userData.id));
  }

  async function updateProfile(data: Partial<UserProfile>) {
    if (!user) return;
    const res = await apiRequest("PUT", `/api/users/${user.id}/profile`, {
      ...user,
      ...data,
    });
    const updated = await res.json();
    setUser(updated);
  }

  async function refreshUser() {
    if (!user) return;
    const baseUrl = getApiUrl();
    const url = new URL(`/api/users/${user.id}`, baseUrl);
    const res = await fetch(url.toString());
    if (res.ok) {
      setUser(await res.json());
    }
  }

  async function logout() {
    await AsyncStorage.removeItem("foodvar_user_id");
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, isLoading, login, updateProfile, refreshUser, logout }),
    [user, isLoading]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
