import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { alerts } from "../data/dummyData";
import { addRipple } from "../utils/ripple";
import { useLanguage } from "../i18n/LanguageContext";

const iconFor = {
  Extreme: AlertTriangle,
  Severe: AlertTriangle,
  Moderate: Info,
  Normal: CheckCircle2,
};

const toneFor = {
  Extreme: "text-danger bg-danger/10",
  Severe: "text-danger bg-danger/10",
  Moderate: "text-warn bg-warn/10",
  Normal: "text-primary bg-primary/10",
};

const PANEL_WIDTH = 320;

export default function NotificationDropdown({ viewAllHref = "/pdma/alerts", label = "Alerts" }) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState([]);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const { lang } = useLanguage();

  const items = alerts.slice(0, 5);
  const unreadCount = items.filter((a) => !readIds.includes(a.id)).length;

  // Close on outside click — checks both the button and the portal'd panel
  useEffect(() => {
    function onClickOutside(e) {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Position the portal'd panel against the real button location, so it's
  // never clipped by a sticky header, backdrop-blur, or a Leaflet map's
  // internal z-index stack — recalculated on open, resize, and scroll.
  useEffect(() => {
    if (!open) return;
    function updatePosition() {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      let left = lang === "ur" ? rect.left : rect.right - PANEL_WIDTH;
      left = Math.max(8, Math.min(left, window.innerWidth - PANEL_WIDTH - 8));
      setPos({ top: rect.bottom + 8, left });
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, lang]);

  function toggle() {
    setOpen((o) => {
      const next = !o;
      if (next) setReadIds(items.map((a) => a.id));
      return next;
    });
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        onMouseDown={addRipple}
        data-tour="notifications"
        className="topbar-alert-button relative min-h-10 px-3 rounded-xl border border-line bg-surface hover:bg-paper-dim transition-colors flex items-center gap-2"
        aria-label={label}
      >
        <Bell size={17} className="text-ink/70 shrink-0" />
        <span className="hidden lg:inline text-sm font-semibold text-ink/75">{label}</span>
        {unreadCount > 0 && (
          <span className="topbar-alert-badge absolute -top-2 -right-2 w-[19px] h-[19px] rounded-full bg-danger text-white text-[10px] flex items-center justify-center font-mono font-semibold ring-2 ring-paper z-20">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: PANEL_WIDTH }}
          className="dropdown-panel max-w-[90vw] bg-surface border border-line rounded-xl shadow-2xl z-[999] overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <p className="font-display font-semibold text-sm">Notifications</p>
            <span className="text-xs text-ink/40">{items.length} recent</span>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.map((a) => {
              const Icon = iconFor[a.severity] || Info;
              return (
                <div
                  key={a.id}
                  className="flex items-start gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-paper-dim/60 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${toneFor[a.severity] || "text-ink/50 bg-line"}`}>
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{a.district} · {a.severity}</p>
                    <p className="text-xs text-ink/55 mt-0.5 line-clamp-2">{a.message}</p>
                    <p className="text-[10px] text-ink/35 font-mono mt-1">{a.date}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <Link
            to={viewAllHref}
            onClick={() => setOpen(false)}
            className="block text-center text-xs font-medium text-primary py-2.5 hover:bg-paper-dim transition-colors"
          >
            View all alerts
          </Link>
        </div>,
        document.body
      )}
    </>
  );
}
