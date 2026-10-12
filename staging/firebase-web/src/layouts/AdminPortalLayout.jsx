import { Outlet, NavLink, Link } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/logo.jpeg";
import { useSupabaseAuth } from "../supabase/useSupabaseAuth";
import {
  LayoutDashboard, ClipboardCheck, Users, FileBarChart, LogOut, Menu, X, FileWarning, Bug,
} from "lucide-react";

const navItems = [
  { to: "", label: "Overview", icon: LayoutDashboard },
  { to: "/requests", label: "Access Requests", icon: ClipboardCheck },
  { to: "/complaints", label: "Drought Reports", icon: FileWarning },
  { to: "/issues", label: "Software Issues", icon: Bug },
  { to: "/users", label: "Users & Officers", icon: Users },
  { to: "/reports", label: "Reports", icon: FileBarChart },
];

export default function AdminPortalLayout() {
  const { user, signOut } = useSupabaseAuth();
  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name;
  const [open, setOpen] = useState(false);

  return (
    <div className="dashboard-shell min-h-screen bg-paper flex" dir="ltr">
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`sidebar-polished w-64 shrink-0 text-mist flex flex-col h-screen fixed lg:sticky top-0 left-0 z-50
          transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-5 border-b border-white/10">
          <Link to="/" className="flex items-center gap-3 min-w-0" onClick={() => setOpen(false)}>
            <img src={logo} alt="AgriWatch Pakistan" className="w-10 h-10 rounded-full object-cover bg-white shrink-0" />
            <div className="min-w-0">
              <p className="font-display font-semibold text-sm leading-tight truncate">AgriWatch</p>
              <p className="text-[11px] tracking-widest text-primary-light/90 uppercase truncate">Admin Portal</p>
            </div>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden text-mist/60 hover:text-mist shrink-0" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={`/admin-portal${to}`}
              end={to === ""}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                  isActive ? "bg-primary/90 text-white" : "text-mist/70 hover:bg-white/5 hover:text-mist"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent" />}
                  <Icon size={17} strokeWidth={2} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-2.5">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold shrink-0">
                {user?.email?.[0]?.toUpperCase() || "A"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{displayName || "Admin"}</p>
              <p className="text-[10px] text-mist/45 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 text-mist/60 hover:text-mist text-sm"
          >
            <LogOut size={16} /> Sign out
          </button>
          <Link to="/login" className="block text-[11px] text-mist/40 hover:text-mist/70">
            ← Back to regular login
          </Link>
        </div>
      </aside>

      <div className="flex-1 min-w-0 dashboard-content">
        <header className="dashboard-topbar sticky top-0 z-30 bg-paper/88 backdrop-blur-xl border-b border-line/80 px-4 py-3 flex items-center lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg border border-line bg-surface hover:bg-paper-dim transition-colors"
            aria-label="Open menu"
          >
            <Menu size={18} className="text-ink/70" />
          </button>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
