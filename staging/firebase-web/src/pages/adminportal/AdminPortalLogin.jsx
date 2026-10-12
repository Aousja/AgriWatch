import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../../assets/logo.jpeg";
import { useSupabaseAuth } from "../../supabase/useSupabaseAuth";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { addRipple } from "../../utils/ripple";

export default function AdminPortalLogin() {
  const { user, loading, error, signIn } = useSupabaseAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/admin-portal", { replace: true });
  }, [user, navigate]);

  return (
    <div className="auth-page flex items-center justify-center">
      <div className="w-full max-w-md page-enter">
        <div className="flex flex-col items-center mb-6">
          <Link to="/" className="flex flex-col items-center">
            <img src={logo} alt="AgriWatch Pakistan" className="w-16 h-16 rounded-full bg-white object-cover mb-3" />
            <h1 className="font-display text-mist text-lg font-semibold">AgriWatch Pakistan</h1>
          </Link>
          <p className="text-primary-light text-xs tracking-widest uppercase mt-1">Admin Portal</p>
        </div>

        <div className="auth-form-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-display font-semibold text-sm">Restricted access</p>
              <p className="text-xs text-ink/50">Sign in with your authorized Google account to review and approve access requests.</p>
            </div>
          </div>

          <button
            onClick={() => signIn()}
            onMouseDown={addRipple}
            disabled={loading}
            className="btn-animated w-full flex items-center justify-center gap-3 bg-surface border border-line rounded-lg py-2.5 text-sm font-medium hover:bg-paper-dim transition-colors disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google (Admin only)
          </button>

          {error && (
            <div className="flex items-start gap-2 mt-4 text-xs text-danger bg-danger/5 rounded-lg p-3">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{error.message}</span>
            </div>
          )}

          <p className="text-xs text-ink/40 text-center mt-5">
            This is separate from the Farmer / Public / PDMA Officer login.
          </p>
          <div className="mt-4 pt-4 border-t border-line text-center">
            <Link to="/login" className="text-xs font-medium text-primary hover:underline">← Back to regular login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.6C29.6 34.9 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.5 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z"/>
    </svg>
  );
}