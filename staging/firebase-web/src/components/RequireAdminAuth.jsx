import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSupabaseAuth } from "../supabase/useSupabaseAuth";
import { supabase } from "../supabase/config";
import NotAdminPending from "./NotAdminPending";

export default function RequireAdminAuth() {
  const { user, loading, signOut } = useSupabaseAuth();
  const [isAdmin, setIsAdmin] = useState(undefined); // undefined = still checking

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Admin check failed:", error);
          setIsAdmin(false);
          return;
        }
        setIsAdmin(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || (user && isAdmin === undefined)) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin-portal/login" replace />;
  }

  if (!isAdmin) {
    // Signed in with Google, but not on the admins allowlist — file/show an
    // access request instead of just bouncing them, so an existing admin
    // can approve it later. Session stays alive only long enough to submit
    // and check that request; "Sign out" fully ends it.
    return <NotAdminPending user={user} onSignOut={signOut} />;
  }

  return <Outlet />;
}
