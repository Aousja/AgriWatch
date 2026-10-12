import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { useMobileNav } from "./MobileNavContext";
import { useCurrentProfile } from "../supabase/useCurrentProfile";
import NotificationDropdown from "./NotificationDropdown";
import ProfileDropdown from "./ProfileDropdown";
import DistrictSearch from "./DistrictSearch";

// Maps the current portal to the fallbackRole useCurrentProfile expects,
// and to the translation key for the small role label under the name.
const portalMeta = {
  "/farmer": { fallbackRole: "farmer", roleLabelKey: "roleFarmerLabel" },
  "/public": { fallbackRole: "public", roleLabelKey: "rolePublicLabel" },
  "/pdma": { fallbackRole: "pdma", roleLabelKey: "roleAdminLabel" },
};

export default function Topbar({ title, subtitle }) {
  const { t, lang } = useLanguage();
  const { toggle } = useMobileNav();
  const { pathname } = useLocation();
  const urduClass = lang === "ur" ? "i18n-ur" : "";

  const base = pathname.startsWith("/farmer") ? "/farmer" : pathname.startsWith("/public") ? "/public" : "/pdma";
  const alertsHref = `${base}/alerts`;

  // Whoever is actually signed in for this portal — falls back to a demo
  // profile only when there's no real Supabase session (see
  // useCurrentProfile), so a farmer logging in sees their own name here
  // instead of a hardcoded PDMA officer.
  const { fallbackRole, roleLabelKey } = portalMeta[base];
  const profile = useCurrentProfile(fallbackRole);
  const displayName = profile.name || t(roleLabelKey);
  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  const displaySubtitle = [t(roleLabelKey), profile.district].filter(Boolean).join(" · ");
  const profileHref = `${base}/settings`;

  return (
    <header className="dashboard-topbar sticky top-0 z-30 bg-paper/88 backdrop-blur-xl border-b border-line/80 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-3 page-enter">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggle}
          className="lg:hidden shrink-0 p-2 rounded-lg border border-line bg-surface hover:bg-paper-dim transition-colors"
          aria-label="Open menu"
        >
          <Menu size={18} className="text-ink/70" />
        </button>
        <div className="min-w-0" dir={lang === "ur" ? "rtl" : undefined}>
          <h1 className={`font-display text-lg sm:text-xl font-semibold text-ink truncate ${urduClass}`}>{title}</h1>
          {subtitle && <p className={`text-xs sm:text-sm text-ink/50 mt-0.5 truncate ${urduClass}`}>{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <DistrictSearch />

        <NotificationDropdown viewAllHref={alertsHref} label={t("navAlerts")} />

        <ProfileDropdown
          displayName={displayName}
          subtitle={displaySubtitle}
          initials={initials}
          avatarUrl={profile.avatarUrl}
          email={profile.email}
          profileHref={profileHref}
        />
      </div>
    </header>
  );
}
