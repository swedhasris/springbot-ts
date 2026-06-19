import React, { createContext, useContext, useState, useEffect } from"react";

type Theme ="light" |"dark" |"system";

interface ThemeContextType {
 theme: Theme;
 setTheme: (theme: Theme) => void;
 resolvedTheme:"light" |"dark";
 lightBrightness: number;
 setLightBrightness: (brightness: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
 const [theme, setThemeState] = useState<Theme>(() => {
 const saved = localStorage.getItem("theme");
 return (saved as Theme) ||"system";
 });

 const [resolvedTheme, setResolvedTheme] = useState<"light" |"dark">("light");

 const [lightBrightness, setLightBrightnessState] = useState<number>(() => {
 const saved = localStorage.getItem("light-brightness");
 return saved ? Number(saved) : 97;
 });

 useEffect(() => {
 const root = document.documentElement;
 const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

 const updateTheme = () => {
 let newResolvedTheme:"light" |"dark";

 if (theme ==="system") {
 newResolvedTheme = mediaQuery.matches ?"dark" :"light";
 } else {
 newResolvedTheme = theme;
 }

 setResolvedTheme(newResolvedTheme);

 if (newResolvedTheme ==="dark") {
 root.classList.add("dark");
 } else {
 root.classList.remove("dark");
 }

 // Apply adjustable light brightness CSS variable
 root.style.setProperty('--light-brightness', `${lightBrightness}%`);
 };

 updateTheme();
 localStorage.setItem("theme", theme);
 localStorage.setItem("light-brightness", lightBrightness.toString());

 // Listen for system theme changes
 const handleChange = (e: MediaQueryListEvent) => {
 if (theme ==="system") {
 updateTheme();
 }
 };

 mediaQuery.addEventListener("change", handleChange);
 return () => mediaQuery.removeEventListener("change", handleChange);
 }, [theme, lightBrightness]);

 const setTheme = (newTheme: Theme) => {
 setThemeState(newTheme);
 };

 const setLightBrightness = (brightness: number) => {
 setLightBrightnessState(brightness);
 };

 return (
 <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, lightBrightness, setLightBrightness }}>
 {children}
 </ThemeContext.Provider>
 );
}

export function useTheme() {
 const context = useContext(ThemeContext);
 if (context === undefined) {
 throw new Error("useTheme must be used within a ThemeProvider");
 }
 return context;
}
