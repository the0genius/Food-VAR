import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const STORAGE_KEY = "foodvar_theme_mode";

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setModeState(saved);
      }
      setLoaded(true);
    });
  }, []);

  function setMode(newMode: ThemeMode) {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode);
  }

  function toggle() {
    const resolved = mode === "system" ? (systemScheme || "light") : mode;
    setMode(resolved === "dark" ? "light" : "dark");
  }

  const resolved: ResolvedTheme =
    mode === "system" ? (systemScheme || "light") : mode;

  const value = useMemo(
    () => ({ mode, resolved, setMode, toggle }),
    [mode, resolved]
  );

  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
