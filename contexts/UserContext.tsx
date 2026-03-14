import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import {
  getAccessToken,
  setTokens,
  clearTokens,
} from "@/lib/auth-storage";
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
  consentPolicyVersion: string | null;
  consentAiVersion: string | null;
  consentAcceptedAt: string | null;
  isPro: boolean;
  role: string;
  contributionCount: number;
  authProvider: string | null;
}

interface UserContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  loginWithGoogle: (idToken: string, name?: string) => Promise<UserProfile>;
  loginWithApple: (idToken: string, name?: string) => Promise<UserProfile>;
  devLogin: () => Promise<UserProfile>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
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
      const token = await getAccessToken();
      if (token) {
        const baseUrl = getApiUrl();
        const url = new URL("/api/auth/me", baseUrl);
        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else if (res.status === 401) {
          const { getRefreshToken } = await import("@/lib/auth-storage");
          const refreshToken = await getRefreshToken();
          if (refreshToken) {
            const refreshUrl = new URL("/api/auth/refresh", baseUrl);
            const refreshRes = await fetch(refreshUrl.toString(), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken }),
            });
            if (refreshRes.ok) {
              const data = await refreshRes.json();
              await setTokens(data.accessToken, data.refreshToken);
              setUser(data.user);
            } else {
              await clearTokens();
            }
          } else {
            await clearTokens();
          }
        }
      }
    } catch (error) {
      console.error("Failed to load user:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loginWithGoogle(idToken: string, name?: string): Promise<UserProfile> {
    const res = await apiRequest("POST", "/api/auth/google", {
      idToken,
      name,
    });
    const data = await res.json();
    await setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }

  async function loginWithApple(idToken: string, name?: string): Promise<UserProfile> {
    const res = await apiRequest("POST", "/api/auth/apple", {
      idToken,
      name,
    });
    const data = await res.json();
    await setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }

  async function devLogin(): Promise<UserProfile> {
    const res = await apiRequest("POST", "/api/auth/dev-login", {});
    const data = await res.json();
    await setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }

  async function updateProfile(data: Partial<UserProfile>) {
    if (!user) return;
    const res = await apiRequest("PUT", "/api/users/profile", data);
    const updated = await res.json();
    setUser(updated);
  }

  async function refreshUser() {
    if (!user) return;
    try {
      const res = await apiRequest("GET", "/api/auth/me");
      const userData = await res.json();
      setUser(userData);
    } catch {
      // silent fail
    }
  }

  async function logout() {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch {
      // always clear local state even if server call fails
    }
    await clearTokens();
    setUser(null);
  }

  async function deleteAccount() {
    await apiRequest("DELETE", "/api/auth/account");
    await clearTokens();
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      isLoading,
      loginWithGoogle,
      loginWithApple,
      devLogin,
      updateProfile,
      refreshUser,
      logout,
      deleteAccount,
    }),
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
