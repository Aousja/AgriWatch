import { NavLink, Link } from "react-router-dom";
import { LogOut, X, Command } from "lucide-react";
import logo from "../assets/logo.jpeg";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";
import { useMobileNav } from "./MobileNavContext";

export default function Sidebar({ navItems, roleLabelKey, basePath }) {
  const { t, lang } = useLanguage();
  const { open, close } = useMobileNav();

  return (
    <>
      {/* Dark overlay behind the drawer on mobile — tap to close */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={close}
        />
      )}

      <aside
        dir={lang === "ur" ? "rtl" : undefined}
        className={`sidebar-polished w-64 min-w-0 shrink-0 text-mist flex flex-col h-screen fixed lg:sticky top-0 left-0 z-50
          transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${lang === "ur" ? "i18n-ur" : ""}`}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-5 border-b border-white/10">
          <Link to="/" className="flex items-center gap-3 min-w-0" onClick={close}>
            <img src={logo} alt="AgriWatch Pakistan" className="w-10 h-10 rounded-full object-cover bg-white shrink-0" />
            <div className="min-w-0">
              <p className="font-display font-semibold text-sm leading-tight truncate">AgriWatch</p>
              <p className="text-[11px] tracking-widest text-primary-light/90 uppercase truncate">{t(roleLabelKey)}</p>
            </div>
          </Link>
          <button onClick={close} className="lg:hidden text-mist/60 hover:text-mist shrink-0" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav data-tour="sidebar-nav" className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={`${basePath}${to}`}
              end={to === ""}
              onClick={close}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                  isActive
                    ? "bg-primary/90 text-white"
                    : "text-mist/70 hover:bg-white/5 hover:text-mist"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute -left-3 rtl:-left-auto rtl:-right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent" />
                  )}
                  <Icon size={17} strokeWidth={2} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{t(labelKey)}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 pb-2">
          <div dir="ltr" className="flex items-center gap-2 text-[11px] text-mist/45 bg-white/5 rounded-lg px-3 py-2">
            <Command size={12} className="shrink-0" />
            <span>Press</span>
            <kbd className="bg-white/10 rounded px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
            <span>to search</span>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-white/10 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <LanguageToggle className="!bg-white/10 !border-white/10 !text-mist hover:!bg-white/15 justify-center" />
            <ThemeToggle className="!bg-white/10 !border-white/10 !text-mist hover:!bg-white/15 justify-center" />
          </div>
          <Link to="/" className="flex items-center gap-3 text-mist/70 hover:text-mist text-sm min-w-0">
            <LogOut size={16} className="shrink-0" /> <span className="min-w-0 truncate">{t("exitToHome")}</span>
          </Link>
          {basePath === "/pdma" && (
            <div className="space-y-1">
              <Link to="/admin-portal/login" className="sidebar-footer-link">
                <Command size={14} className="shrink-0" /> <span>Open Admin Portal login</span>
              </Link>
              <span className="sidebar-footer-link-subtle">User approvals and access requests</span>
            </div>
          )}
          <p className="text-[10px] text-mist/40 font-mono">{t("tagline")}</p>
        </div>
      </aside>
    </>
  );
}
