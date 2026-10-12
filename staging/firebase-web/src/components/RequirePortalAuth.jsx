import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useSupabaseAuth } from "../supabase/useSupabaseAuth";
import { getPortalAccess } from "../utils/authAccess";
import { supabase } from "../supabase/config";

function normalizeRole(role) {
  if (role === "admin") return "pdma";
  return role;
}

export default function RequirePortalAuth({ role }) {
  const { user, loading } = useSupabaseAuth();
  const [checkingRole, setCheckingRole] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifyAccess() {
      if (loading) return;
      if (!user) {
        if (!cancelled) {
          setAllowed(false);
          setCheckingRole(false);
        }
        return;
      }

      const grant = getPortalAccess();
      if (!grant || grant.userId !== user.id || normalizeRole(grant.role) !== normalizeRole(role)) {
        if (!cancelled) {
          setAllowed(false);
          setCheckingRole(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("website_signup_requests")
        .select("status, role")
        .eq("user_id", user.id)
        .eq("role", normalizeRole(role))
        .maybeSingle();

      if (cancelled) return;

      const approved = !error && data?.status === "approved";
      const roleMatches = normalizeRole(data?.role) === normalizeRole(role);
      setAllowed(Boolean(approved && roleMatches));
      setCheckingRole(false);
    }

    verifyAccess();
    return () => {
      cancelled = true;
    };
  }, [user, loading, role]);

  if (loading || checkingRole) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-ink/55">
          <Loader2 size={18} className="animate-spin text-primary" />
          Checking secure access…
        </div>
      </div>
    );
  }

  if (!user || !allowed) {
    return <Navigate to="/login" replace state={{ reason: "auth-required" }} />;
  }

  return <Outlet />;
}
