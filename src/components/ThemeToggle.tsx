import React from "react";
import { useDarkMode } from "../lib/useDarkMode";

function IconSun(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconMoon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}

export default function ThemeToggle() {
  const [theme, setTheme] = useDarkMode();
  const isDark = theme === "dark";
  return (
    <button
      onClick={function(){ setTheme(isDark ? "light" : "dark"); }}
      className="btn btn-ghost rounded-2xl"
      title={isDark ? "Switch to light" : "Switch to dark"}
    >
      {isDark ? <IconSun/> : <IconMoon/>}
      <span className="ml-2 text-sm">{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}