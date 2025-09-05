import React, { useEffect, useState } from "react";
import SmartLarasCinematicPro from "./components/SmartLarasCinematicPro";

function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const el = document.documentElement;
    if (dark) el.classList.add("dark"); else el.classList.remove("dark");
    localStorage.setItem("laras_theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const saved = localStorage.getItem("laras_theme");
    if (saved) setDark(saved === "dark");
  }, []);

  return (
    <button className="btn btn-ghost" onClick={() => setDark(!dark)}>
      {dark ? "🌙 Dark" : "☀ Light"}
    </button>
  );
}

export default function App(){
  return (
    <div className="min-h-screen theme-abstract">
      <header className="sticky top-0 z-10 p-4 backdrop-blur bg-black/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="hero-dot" />
          <h1 className="text-xl font-bold">LARAS Cinematic Pro+ — AI Only</h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <div className="card p-4 shadow-soft">
          (SmartLarasCinematicPro) /
        </div>
      </main>
    </div>
  );
}