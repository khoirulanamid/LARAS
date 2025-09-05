import React, { useEffect, useState } from "react";

export default function ThemeToggle(){
  const [dark, setDark] = useState<boolean>(() => {
    const s = localStorage.getItem("laras_theme");
    return s ? s === "dark" : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if(dark){ root.classList.add("dark"); } else { root.classList.remove("dark"); }
    localStorage.setItem("laras_theme", dark?"dark":"light");
  }, [dark]);

  return (
    <button className="btn" onClick={()=>setDark(!dark)} aria-label="Toggle theme">
      {dark? "🌙 Dark" : "☀ Light"}
    </button>
  );
}

