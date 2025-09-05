import { useEffect, useState } from "react";

export function useDarkMode() {
  const initial =
    (typeof window !== "undefined" && localStorage.getItem("theme")) ||
    (typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");

  const [theme, setTheme] = useState(initial || "light");

  useEffect(function () {
    const root = window.document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try { localStorage.setItem("theme", theme); } catch (_) {}
  }, [theme]);

  return [theme, setTheme] as const;
}