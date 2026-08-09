"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Theme = "light" | "dark";

const THEME_KEY = "thblog-theme";
const THEME_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
  ready: boolean;
}>({
  theme: "light",
  setTheme: () => undefined,
  ready: false,
});

function readCookieTheme(): Theme | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)thblog-theme=(light|dark)/);
  return match ? (match[1] as Theme) : null;
}

function persistTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore quota / private mode
  }
  document.cookie = `${THEME_KEY}=${theme}; path=/; max-age=${THEME_MAX_AGE}; SameSite=Lax`;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const fromCookie = readCookieTheme();
  if (fromCookie) return fromCookie;
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // ignore
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = getInitialTheme();
    setThemeState(initial);
    persistTheme(initial);
    setReady(true);
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    persistTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, ready }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle() {
  const { theme, setTheme, ready } = useTheme();
  const isDark = theme === "dark";
  const nextLabel = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={ready ? nextLabel : "Toggle color theme"}
            aria-pressed={isDark}
            onClick={() => setTheme(isDark ? "light" : "dark")}
          />
        }
      >
        {isDark ? (
          <Sun className="size-4" aria-hidden />
        ) : (
          <Moon className="size-4" aria-hidden />
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {ready ? nextLabel : "Toggle color theme"}
      </TooltipContent>
    </Tooltip>
  );
}
