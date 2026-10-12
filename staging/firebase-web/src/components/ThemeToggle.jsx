import { useTheme } from "../theme/ThemeContext";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-1.5 text-xs font-medium border border-line rounded-lg px-3 py-1.5 bg-surface hover:bg-paper-dim transition-colors ${className}`}
      title="Toggle theme"
      aria-label="Toggle light/dark theme"
    >
      {theme === "light" ? <Moon size={13} /> : <Sun size={13} />}
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}
