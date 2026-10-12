import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Sprout,
  Users2,
  XCircle,
} from "lucide-react";
import logo from "../assets/logo.jpeg";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import ThemeToggle from "../components/ThemeToggle";
import { addRipple } from "../utils/ripple";
import { useSupabaseAuth } from "../supabase/useSupabaseAuth";
import {
  digitsOnly,
  normalizePakistanLocalPhone,
  otpError,
  pakistanPhoneError,
  toPakistanE164,
} from "../utils/formValidation";
import { getSignupRequest, normalizeDbRole, sendPhoneOtp, verifyPhoneOtp } from "../services/authService";
import {
  clearLoginAttempt,
  getLoginAttempt,
  grantPortalAccess,
  markLoginAttempt,
} from "../utils/authAccess";

const roles = [
  { key: "farmer", labelKey: "roleFarmerLabel", icon: Sprout, dest: "/farmer" },
  { key: "public", labelKey: "rolePublicLabel", icon: Users2, dest: "/public" },
  { key: "admin", labelKey: "roleAdminLabel", icon: ShieldCheck, dest: "/pdma" },
];

const GOOGLE_REDIRECT = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;

function routeForRole(role) {
  const normalized = role === "pdma" ? "admin" : role;
  return roles.find((item) => item.key === normalized)?.dest || "/";
}

export default function Login() {
  const { t, lang } = useLanguage();
  const { user, loading: authLoading, signIn: supabaseSignIn, signOut } = useSupabaseAuth();
  const [role, setRole] = useState(() => {
    const pending = localStorage.getItem("pendingSignupRole");
    if (pending === "pdma") return "admin";
    return ["farmer", "public", "admin"].includes(pending) ? pending : "farmer";
  });
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [googleState, setGoogleState] = useState(null);
  const navigate = useNavigate();

  const phoneError = useMemo(() => (phone ? pakistanPhoneError(phone) : ""), [phone]);
  const prettyPhone = phone ? `+92 ${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}` : "+92";

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setGoogleState(null);
      return;
    }

    // A Supabase/Google session can survive browser navigation. We do not
    // auto-enter a dashboard just because an old session exists. Only a
    // login callback that was explicitly started from this page may route.
    const loginAttempt = getLoginAttempt();
    if (!loginAttempt) {
      signOut();
      setGoogleState(null);
      return;
    }

    // Google redirects back to this page, recreating React state. Keep the role
    // selected before OAuth and use it as part of the account lookup.
    const requestedUiRole = loginAttempt.role || role;
    const requestedDbRole = normalizeDbRole(requestedUiRole);
    setRole(requestedDbRole === "pdma" ? "admin" : requestedDbRole);
    localStorage.setItem("pendingSignupRole", requestedUiRole);

    let cancelled = false;
    setGoogleState("checking");

    getSignupRequest(user.id, requestedDbRole)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          // The Gmail can still have other roles; only this selected role is
          // missing, so let the user create that role-specific profile.
          clearLoginAttempt();
          navigate("/complete-profile", { replace: true });
          return;
        }

        clearLoginAttempt();
        localStorage.removeItem("pendingSignupRole");
        if (data.status === "approved") {
          grantPortalAccess(user.id, requestedDbRole);
          navigate(routeForRole(requestedDbRole), { replace: true });
          return;
        }
        setGoogleState(data.status === "rejected" ? "rejected" : "pending");
      })
      .catch(() => {
        if (cancelled) return;
        clearLoginAttempt();
        setError("Couldn't check the selected role for this account. Try again.");
        setGoogleState(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  async function requestOtp(e) {
    e.preventDefault();
    const validationError = pakistanPhoneError(phone);
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError("");
    try {
      await sendPhoneOtp(phone);
      localStorage.setItem("pendingSignupRole", role);
      setStep("otp");
    } catch (err) {
      setError(err?.message || "Could not send OTP. Check the phone provider configuration and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    const validationError = otpError(otp);
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const result = await verifyPhoneOtp(phone, otp);
      const signedInUser = result?.user;
      if (!signedInUser) throw new Error("Phone verification succeeded but no user session was returned.");

      const request = await getSignupRequest(signedInUser.id, role);
      if (!request) {
        navigate("/complete-profile", { replace: true });
        return;
      }
      if (request.status === "approved") {
        const selectedDbRole = normalizeDbRole(role);
        grantPortalAccess(signedInUser.id, selectedDbRole);
        navigate(routeForRole(selectedDbRole), { replace: true });
        return;
      }
      setGoogleState(request.status === "rejected" ? "rejected" : "pending");
    } catch (err) {
      setError(err?.message || "The OTP is invalid or expired.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setBusy(true);
    localStorage.setItem("pendingSignupRole", role);
    markLoginAttempt("google", role);
    try {
      // Force Google to show account selection again instead of silently
      // reusing the previous Google identity.
      await supabaseSignIn(GOOGLE_REDIRECT, { forceAccountChoice: true });
    } catch (err) {
      clearLoginAttempt();
      setError(err?.message || "Google sign-in could not be started.");
    } finally {
      setBusy(false);
    }
  }

  if (googleState === "checking") {
    return <FullScreenLoader />;
  }

  if (googleState === "pending" || googleState === "rejected") {
    return (
      <div className="auth-page flex items-center justify-center p-5">
        <div className="auth-status-card animate-pop-in">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${googleState === "pending" ? "bg-warn/10" : "bg-danger/10"}`}>
            {googleState === "pending" ? <Clock size={30} className="text-warn" /> : <XCircle size={30} className="text-danger" />}
          </div>
          <h1 className="font-display text-xl font-semibold">
            {googleState === "pending" ? "Your account is awaiting approval" : "Access request declined"}
          </h1>
          <p className="text-sm text-ink/55 leading-relaxed mt-3">
            {googleState === "pending"
              ? "Your details were received. A system administrator must approve the account before dashboard access is enabled."
              : "Your request was declined. Please contact the AgriWatch administrator if you believe this needs review."}
          </p>
          <button onClick={signOut} className="mt-6 w-full border border-line rounded-xl py-3 text-sm font-semibold hover:bg-paper-dim transition-colors">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir={lang === "ur" ? "rtl" : undefined} className={`auth-page ${lang === "ur" ? "i18n-ur" : ""}`}>
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />

      <div className="auth-layout">
        <section className="hidden lg:flex flex-col justify-between rounded-[2rem] p-10 xl:p-12 auth-visual-panel auth-equal-panel animate-fade-up">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <img src={logo} alt="AgriWatch Pakistan" className="w-12 h-12 rounded-2xl object-cover bg-white shadow-lg" />
              <div>
                <p className="font-display text-xl font-semibold text-white">AgriWatch Pakistan</p>
                <p className="text-xs tracking-[0.18em] uppercase text-white/55">GeoAI drought intelligence</p>
              </div>
            </Link>

            <div className="mt-20 max-w-lg">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-xs text-white/80">
                <Sparkles size={13} /> Secure role-based access
              </span>
              <h2 className="font-display text-4xl xl:text-5xl leading-tight font-semibold text-white mt-5">
                Sign in to Pakistan's drought monitoring workspace.
              </h2>
              <p className="mt-5 text-white/65 leading-relaxed">
                One account connects farmers, public users and PDMA officers with live district intelligence, alerts and advisory tools.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              ["+92", "Pakistan-ready OTP"],
              ["3 roles", "Role-aware access"],
              ["24/7", "Cloud dashboard"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                <p className="font-display text-xl text-white font-semibold">{value}</p>
                <p className="text-[11px] text-white/55 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="auth-form-column">
          <div className="auth-form-wrap animate-fade-up animation-delay-100">
            <div className="auth-form-card auth-equal-card auth-login-card">
              <div className="auth-card-header">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Welcome back</p>
                  <h1 className="font-display text-2xl sm:text-3xl font-semibold mt-2">Access your AgriWatch account</h1>
                  <p className="text-sm text-ink/50 mt-2 max-w-md">Use your Pakistani mobile number or continue with Google.</p>
                </div>
                <div className="auth-card-tools">
                  <ThemeToggle />
                  <LanguageToggle />
                </div>
              </div>

              <div className="auth-card-body-scroll flex-1">

              {step === "phone" ? (
                <>
                  <p className="auth-label mb-2">{t("loginIAmA")}</p>
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    {roles.map(({ key, labelKey, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setRole(key)}
                        onMouseDown={addRipple}
                        className={`role-choice ${role === key ? "role-choice-active" : ""}`}
                      >
                        <Icon size={17} />
                        <span>{t(labelKey)}</span>
                      </button>
                    ))}
                  </div>

                  <form onSubmit={requestOtp} className="space-y-4">
                    <div>
                      <label className="auth-label">{t("phoneNumber")}</label>
                      <div className={`phone-control mt-1.5 ${phoneError ? "field-invalid" : phone.length === 10 ? "field-valid" : ""}`} dir="ltr">
                        <span className="text-lg" aria-hidden="true">🇵🇰</span>
                        <span className="font-semibold text-sm text-ink/75">+92</span>
                        <span className="w-px h-6 bg-line" />
                        <input
                          value={phone}
                          onChange={(e) => {
                            setPhone(normalizePakistanLocalPhone(e.target.value));
                            setError("");
                          }}
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder="3XX XXXXXXX"
                          maxLength={10}
                          className="outline-none text-sm w-full bg-transparent font-mono tracking-wide"
                        />
                        {phone.length === 10 && !phoneError && <CheckCircle2 size={17} className="text-primary" />}
                      </div>
                      <div className="flex items-center justify-between gap-3 mt-1.5">
                        <p className={`text-[11px] ${phoneError ? "text-danger" : "text-ink/40"}`}>
                          {phoneError || "10 digits after +92, e.g. 3001234567"}
                        </p>
                        <span className="text-[11px] text-ink/35" dir="ltr">{phone.length}/10</span>
                      </div>
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button
                      type="submit"
                      disabled={busy || Boolean(pakistanPhoneError(phone))}
                      onMouseDown={addRipple}
                      className="btn-animated auth-primary-btn"
                    >
                      {busy ? <Loader2 size={16} className="animate-spin" /> : <LockKeyhole size={16} />}
                      {t("sendOtp")}
                    </button>

                    {role === "admin" && <p className="text-xs text-ink/40 text-center">{t("adminApprovalNote")}</p>}
                  </form>

                  <div className="auth-divider"><span>or</span></div>

                  <button type="button" onClick={handleGoogleSignIn} disabled={busy} onMouseDown={addRipple} className="btn-animated auth-google-btn">
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
                    Continue with Google
                  </button>

                </>
              ) : (
                <form onSubmit={verifyOtp} className="space-y-5 animate-fade-in">
                  <button type="button" onClick={() => { setStep("phone"); setOtp(""); setError(""); }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/50 hover:text-ink">
                    <ArrowLeft size={14} /> Change number
                  </button>

                  <div className="rounded-2xl bg-primary/8 border border-primary/15 p-4">
                    <p className="text-xs text-ink/45">Verification code sent to</p>
                    <p className="font-display font-semibold mt-1" dir="ltr">{prettyPhone}</p>
                  </div>

                  <div>
                    <label className="auth-label">{t("enterOtp")}</label>
                    <input
                      value={otp}
                      onChange={(e) => { setOtp(digitsOnly(e.target.value, 6)); setError(""); }}
                      placeholder="••••••"
                      maxLength={6}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      dir="ltr"
                      className="otp-input mt-1.5"
                      autoFocus
                    />
                    <p className="text-[11px] text-ink/40 mt-1.5">Enter the 6-digit SMS code. Only numbers are accepted.</p>
                  </div>

                  {error && <div className="auth-error">{error}</div>}

                  <button type="submit" disabled={busy || otp.length !== 6} onMouseDown={addRipple} className="btn-animated auth-primary-btn">
                    {busy && <Loader2 size={16} className="animate-spin" />}
                    {t("verifyContinueAs")} {t(roles.find((r) => r.key === role).labelKey)}
                  </button>
                </form>
              )}
              </div>

              {step === "phone" && (
                <div className="auth-card-footer mt-3 pt-3 border-t border-line flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-xs">
                  <span className="text-ink/50">{t("newHereSignUp")}</span>
                  <Link to="/signup" className="font-semibold text-primary hover:underline">{t("signUp")}</Link>
                  <span className="text-ink/25">•</span>
                  <Link to="/guest" className="inline-flex items-center gap-1 font-medium text-ink/55 hover:text-ink"><Eye size={13} /> {t("continueAsGuest")}</Link>
                </div>
              )}
            </div>

            <Link to="/admin-portal/login" className="auth-portal-link">
              <ShieldCheck size={14} /> Need administrator access? Open Admin Portal login
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function FullScreenLoader() {
  return (
    <div className="auth-page flex items-center justify-center p-6">
      <div className="w-10 h-10 rounded-full border-[3px] border-white/20 border-t-white animate-spin" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.6C29.6 34.9 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.5 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z"/>
    </svg>
  );
}
