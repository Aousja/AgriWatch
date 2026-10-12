import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { LogOut, MapPin, User } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { useSupabaseAuth } from "../supabase/useSupabaseAuth";

const PANEL_WIDTH = 220;

// The avatar+name trigger in the Topbar, plus a small portal'd dropdown
// with a "Your Profile" link to that portal's editable profile page.
// Positioned against the real button (not a plain absolute child) for the
// same reason NotificationDropdown is — so it's never clipped by the
// sticky, backdrop-blurred header.
export default function ProfileDropdown({ displayName, subtitle, initials, avatarUrl, email, profileHref }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { signOut } = useSupabaseAuth();
  const [signingOut, setSigningOut] = useState(false);

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

  function goToProfile() {
    setOpen(false);
    navigate(profileHref);
  }

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      setOpen(false);
      navigate("/login", { replace: true });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="topbar-profile-trigger flex items-center gap-2.5 min-h-10 pl-2 pr-2 sm:pr-3 sm:pl-3 border-l border-line rounded-xl hover:bg-paper-dim transition-colors min-w-0"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/15 shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-display text-xs font-semibold shrink-0 ring-2 ring-primary/10">
            {initials}
          </div>
        )}
        <div className="hidden sm:block leading-tight text-left min-w-0 max-w-[190px]">
          <p className="text-sm font-semibold truncate">{displayName}</p>
          <p className="text-[11px] text-ink/45 truncate mt-0.5">{subtitle}</p>
        </div>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: PANEL_WIDTH }}
          className="dropdown-panel bg-surface border border-line rounded-xl shadow-2xl z-[999] overflow-hidden"
        >
          <div className="px-4 py-4 border-b border-line bg-paper-dim/35">
            <div className="flex items-center gap-3 min-w-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-display text-xs font-semibold shrink-0">{initials}</div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{displayName}</p>
                {email && <p className="text-[11px] text-ink/40 truncate mt-0.5">{email}</p>}
              </div>
            </div>
            <div className="mt-3 flex items-start gap-1.5 text-xs text-ink/55">
              <MapPin size={13} className="mt-0.5 shrink-0 text-primary" />
              <span>{subtitle}</span>
            </div>
          </div>
          <button
            onClick={goToProfile}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-ink/80 hover:bg-paper-dim transition-colors text-left"
          >
            <User size={15} className="text-ink/50 shrink-0" /> {t("yourProfile")}
          </button>
          <div className="border-t border-line" />
          <button
            onClick={handleLogout}
            disabled={signingOut}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-danger hover:bg-danger/5 transition-colors text-left disabled:opacity-50"
          >
            <LogOut size={15} className="shrink-0" /> {signingOut ? "Signing out..." : t("signOut")}
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
