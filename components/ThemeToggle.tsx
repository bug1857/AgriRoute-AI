"use client";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

function subscribe(onChange: () => void) {
  function storage(e: StorageEvent) {
    if (e.key === "agriroute-theme" || e.key === null) {
      document.documentElement.dataset.theme = e.newValue === "dark" ? "dark" : "light";
      onChange();
    }
  }
  window.addEventListener("agriroute-theme-change", onChange);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener("agriroute-theme-change", onChange);
    window.removeEventListener("storage", storage);
  };
}
export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme === "dark", () => false);
  function toggle() {
    const theme = dark ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("agriroute-theme", theme); } catch { /* Theme still works when device saving is blocked. */ }
    window.dispatchEvent(new Event("agriroute-theme-change"));
  }
  return <button className="theme-toggle" aria-label="Dark theme" aria-pressed={dark} onClick={toggle} title="Switch between light and dark theme"><Moon className="theme-moon" size={18}/><Sun className="theme-sun" size={18}/><span>Theme</span></button>;
}
