import { useEffect, useState } from "react";
import { supabase } from "../supabase/config";
import { ShieldAlert, Clock, XCircle } from "lucide-react";

// Shown when a Google account signs in successfully but isn't (yet) on the
// `admins` allowlist. Instead of silently bouncing them, we record a request
// in `admin_access_requests` so an existing admin can approve it from the
// portal, and show the person a clear status here.
export default function NotAdminPending({ user, onSignOut }) {
  const [state, setState] = useState("checking"); // checking | pending | rejected | error

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Do we already have a request on file for this user?
      const { data: existing, error: readErr } = await supabase
        .from("admin_access_requests")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (readErr) {
        console.error("Couldn't check admin request status:", readErr);
        setState("error");
        return;
      }

      if (existing) {
        setState(existing.status === "rejected" ? "rejected" : "pending");
        return;
      }

      // First time this account has tried — file a new request.
      const { error: insertErr } = await supabase
        .from("admin_access_requests")
        .insert({ user_id: user.id, email: user.email });

      if (cancelled) return;

      if (insertErr) {
        console.error("Couldn't submit admin request:", insertErr);
        setState("error");
        return;
      }
      setState("pending");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-forest flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-surface rounded-xl p-6 shadow-xl text-center">
        {state === "checking" && (
          <div className="py-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
            <p className="text-sm text-ink/60">Checking your account…</p>
          </div>
        )}

        {state === "pending" && (
          <>
            <div className="w-14 h-14 rounded-full bg-warn/10 flex items-center justify-center mx-auto mb-4">
              <Clock size={26} className="text-warn" />
            </div>
            <p className="font-display font-semibold">You're not an approved admin yet</p>
            <p className="text-sm text-ink/55 leading-relaxed mt-2">
              {user.email} isn't on the admin list. Your request has been sent to existing
              admins for approval — check back later.
            </p>
          </>
        )}

        {state === "rejected" && (
          <>
            <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
              <XCircle size={26} className="text-danger" />
            </div>
            <p className="font-display font-semibold">Access request declined</p>
            <p className="text-sm text-ink/55 leading-relaxed mt-2">
              An admin reviewed and declined access for {user.email}. Contact an existing
              admin if you think this is a mistake.
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={26} className="text-danger" />
            </div>
            <p className="font-display font-semibold">Something went wrong</p>
            <p className="text-sm text-ink/55 leading-relaxed mt-2">
              Couldn't check or submit your admin access request. Try again shortly.
            </p>
          </>
        )}

        <button
          onClick={onSignOut}
          className="mt-6 w-full border border-line rounded-lg py-2.5 text-sm font-medium hover:bg-paper-dim transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
