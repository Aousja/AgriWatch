import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, MapPin, Clock } from "lucide-react";
import { districts, severityColor } from "../data/dummyData";
import { useLanguage } from "../i18n/LanguageContext";
import { getRecentDistrictIds } from "../utils/recentDistricts";

export default function DistrictSearch() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef(null);
  const urduClass = lang === "ur" ? "i18n-ur" : "";

  const base = pathname.startsWith("/farmer") ? "/farmer" : pathname.startsWith("/public") ? "/public" : "/pdma";

  const recentIds = getRecentDistrictIds();
  const recentDistricts = recentIds
    .map((id) => districts.find((d) => String(d.id) === String(id)))
    .filter(Boolean);

  const results = query.trim()
    ? districts.filter((d) => d.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : [];

  const showingRecent = !query.trim() && recentDistricts.length > 0;
  const listItems = showingRecent ? recentDistricts : results;

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => setActiveIndex(0), [query]);

  function goToDistrict(d) {
    navigate(`${base}/district/${d.id}`);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e) {
    if (!open || listItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, listItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      goToDistrict(listItems[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div data-tour="district-search" className="relative hidden md:block" ref={ref}>
      <div className="flex items-center gap-2 bg-surface border border-line rounded-lg px-3 py-2 w-64 focus-within:border-primary transition-colors">
        <Search size={15} className="text-ink/40 shrink-0" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t("searchDistrict")}
          dir={lang === "ur" ? "rtl" : undefined}
          className={`bg-transparent outline-none text-sm w-full placeholder:text-ink/30 ${urduClass}`}
        />
      </div>

      {open && listItems.length > 0 && (
        <div className="dropdown-panel absolute left-0 mt-2 w-full bg-surface border border-line rounded-xl shadow-xl z-50 overflow-hidden">
          {showingRecent && (
            <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase tracking-wide text-ink/35 border-b border-line">
              <Clock size={11} /> Recently viewed
            </div>
          )}
          {listItems.map((d, i) => (
            <button
              key={d.id}
              onClick={() => goToDistrict(d)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                i === activeIndex ? "bg-paper-dim" : "hover:bg-paper-dim/60"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: severityColor[d.severity] }}
              />
              <MapPin size={13} className="text-ink/30 shrink-0" />
              <span className="flex-1 min-w-0 truncate">{d.name}</span>
              <span className="text-xs text-ink/35 shrink-0">{d.province}</span>
            </button>
          ))}
        </div>
      )}

      {open && query.trim() && results.length === 0 && (
        <div className="dropdown-panel absolute left-0 mt-2 w-full bg-surface border border-line rounded-xl shadow-xl z-50 px-3 py-3 text-sm text-ink/45">
          No districts match "{query}"
        </div>
      )}
    </div>
  );
}
