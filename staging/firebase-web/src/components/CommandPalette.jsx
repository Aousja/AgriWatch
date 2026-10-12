import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Map, GitCompare, TrendingUp, Bell, Users, FileWarning,
  UserCheck, FileText, UserPlus, Settings, Sprout, Droplets, TrendingDown,
  CalendarDays, BookOpen, Sun, Moon, Languages, Home, LogOut, MapPin, Command,
} from "lucide-react";
import { districts, severityColor } from "../data/dummyData";
import { useTheme } from "../theme/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";

const pagesByBase = {
  "/pdma": [
    { label: "Overview", to: "", icon: LayoutDashboard },
    { label: "Drought Map", to: "/map", icon: Map },
    { label: "Compare Districts", to: "/compare", icon: GitCompare },
    { label: "Predictions", to: "/predictions", icon: TrendingUp },
    { label: "Alerts", to: "/alerts", icon: Bell },
    { label: "Drought Reports", to: "/complaints", icon: FileWarning },
    { label: "Reports", to: "/reports", icon: FileText },
    { label: "Settings", to: "/settings", icon: Settings },
  ],
  "/farmer": [
    { label: "Home", to: "", icon: LayoutDashboard },
    { label: "Crop Recommendations", to: "/crops", icon: Sprout },
    { label: "Irrigation Scheduler", to: "/irrigation", icon: Droplets },
    { label: "Yield Risk", to: "/yield-risk", icon: TrendingDown },
    { label: "Alerts", to: "/alerts", icon: Bell },
    { label: "Drought Reports", to: "/complaints", icon: FileWarning },
    { label: "Crop Calendar", to: "/calendar", icon: CalendarDays },
    { label: "Settings", to: "/settings", icon: Settings },
  ],
  "/public": [
    { label: "Home", to: "", icon: LayoutDashboard },
    { label: "Regional Map", to: "/map", icon: Map },
    { label: "Compare Districts", to: "/compare", icon: GitCompare },
    { label: "Alerts", to: "/alerts", icon: Bell },
    { label: "Community Reports", to: "/reports", icon: FileWarning },
    { label: "Awareness & Tips", to: "/awareness", icon: BookOpen },
    { label: "Crop Calendar", to: "/calendar", icon: CalendarDays },
    { label: "Settings", to: "/settings", icon: Settings },
  ],
};

export default function CommandPalette() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const base = pathname.startsWith("/farmer") ? "/farmer" : pathname.startsWith("/public") ? "/public" : pathname.startsWith("/pdma") ? "/pdma" : null;

  useEffect(() => {
    function onKeyDown(e) {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const results = [];

    if (base) {
      pagesByBase[base].forEach((p) => {
        if (!q || p.label.toLowerCase().includes(q)) {
          results.push({ type: "page", label: p.label, icon: p.icon, action: () => navigate(`${base}${p.to}`) });
        }
      });
    }

    if (q) {
      districts
        .filter((d) => d.name.toLowerCase().includes(q))
        .slice(0, 5)
        .forEach((d) => {
          results.push({
            type: "district",
            label: d.name,
            sub: d.province,
            dot: severityColor[d.severity],
            icon: MapPin,
            action: () => navigate(`${base || "/pdma"}/district/${d.id}`),
          });
        });
    }

    const actions = [
      { label: theme === "light" ? "Switch to dark mode" : "Switch to light mode", icon: theme === "light" ? Moon : Sun, action: toggleTheme },
      { label: lang === "en" ? "Switch to Urdu" : "Switch to English", icon: Languages, action: toggleLang },
      { label: "Go to Home", icon: Home, action: () => navigate("/") },
    ];
    actions.forEach((a) => {
      if (!q || a.label.toLowerCase().includes(q)) {
        results.push({ type: "action", ...a });
      }
    });

    return results;
  }, [query, base, theme, lang]);

  function runItem(item) {
    if (!item) return;
    item.action();
    setOpen(false);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runItem(items[activeIndex]);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[200] flex items-start justify-center pt-24 px-4"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="bg-surface rounded-xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line">
          <Command size={16} className="text-ink/40 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, districts, or actions..."
            className="bg-transparent outline-none text-sm w-full placeholder:text-ink/35"
          />
          <kbd className="text-[10px] text-ink/35 border border-line rounded px-1.5 py-0.5 font-mono shrink-0">Esc</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-1">
          {items.length === 0 && (
            <p className="text-sm text-ink/40 px-4 py-6 text-center">No matches for "{query}"</p>
          )}
          {items.map((item, i) => (
            <button
              key={`${item.type}-${item.label}`}
              onClick={() => runItem(item)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                i === activeIndex ? "bg-paper-dim" : "hover:bg-paper-dim/60"
              }`}
            >
              {item.dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.dot }} />}
              <item.icon size={15} className="text-ink/40 shrink-0" />
              <span className="flex-1 min-w-0 truncate">{item.label}</span>
              {item.sub && <span className="text-xs text-ink/35 shrink-0">{item.sub}</span>}
              <span className="text-[10px] uppercase tracking-wide text-ink/25 shrink-0">{item.type}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 px-4 py-2 border-t border-line text-[11px] text-ink/35">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span className="ml-auto font-mono">Ctrl/Cmd + K</span>
        </div>
      </div>
    </div>
  );
}
