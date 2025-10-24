import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeName = "classic-clean" | "classic" | "professional-blue" | "mountain-sky" | "heritage-gold" | "forest-green" | "vibrant";

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const saved = localStorage.getItem("hp-tourism-theme");
    return (saved as ThemeName) || "classic-clean";
  });

  useEffect(() => {
    localStorage.setItem("hp-tourism-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
