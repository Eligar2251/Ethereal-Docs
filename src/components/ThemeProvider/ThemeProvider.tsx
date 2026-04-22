"use client";

import { useEffect, memo } from "react";
import type { AppTheme, AppFont } from "@/types/database";

interface ThemeProviderProps {
  theme: AppTheme;
  font: AppFont;
  children?: React.ReactNode;
}

function ThemeProviderInner({ theme, font, children }: ThemeProviderProps) {
  useEffect(() => {
    const root = document.documentElement;

    // Apply theme data attribute — CSS tokens react automatically
    root.setAttribute("data-theme", theme);

    // Apply font class
    root.setAttribute("data-font", font);

    // Sync <meta> for system UI (optional but premium touch)
    const meta = document.querySelector('meta[name="theme-color"]');
    const themeColors: Record<AppTheme, string> = {
      light: "#FBFBF9",
      dark: "#141414",
      sepia: "#F5F0E8",
    };
    if (meta) meta.setAttribute("content", themeColors[theme]);
  }, [theme, font]);

  return <>{children}</>;
}

export const ThemeProvider = memo(ThemeProviderInner);
ThemeProvider.displayName = "ThemeProvider";
