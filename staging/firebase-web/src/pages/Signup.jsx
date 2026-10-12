import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Plus,
  ShieldCheck,
  Sparkles,
  Sprout,
  Trash2,
  Users2,
} from "lucide-react";
import logo from "../assets/logo.jpeg";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import ThemeToggle from "../components/ThemeToggle";
import { getDistricts } from "../services/droughtService";
import { createFarmerFields } from "../services/farmerFieldService";
import { addRipple } from "../utils/ripple";
import { supabase } from "../supabase/config";
import { useSupabaseAuth } from "../supabase/useSupabaseAuth";
import { sendPhoneOtp, verifyPhoneOtp } from "../services/authService";
import { clearLoginAttempt, grantPortalAccess, markLoginAttempt } from "../utils/authAccess";
import {
  digitsOnly,
  normalizePakistanLocalPhone,
  otpError,
  pakistanPhoneError,
  personNameError,
  positiveDecimal,
  sanitizeFieldName,
  sanitizeLettersText,
  sanitizePersonName,
  toPakistanE164,
} from "../utils/formValidation";

const roles = [
  { key: "farmer", labelKey: "roleFarmerLabel", icon: Sprout, dest: "/farmer" },
  { key: "public", labelKey: "rolePublicLabel", icon: Users2, dest: "/public" },
  { key: "admin", labelKey: "roleAdminLabel", icon: ShieldCheck, dest: "/pdma" },
];

const crops = [
  { value: "wheat", labelKey: "cropWheat" },
  { value: "cotton", labelKey: "cropCotton" },
  { value: "sugarcane", labelKey: "cropSugarcane" },
  { value: "rice", labelKey: "cropRice" },
  { value: "other", labelKey: "cropOther" },
];

const GOOGLE_SIGNUP_REDIRECT = typeof window !== "undefined" ? `${window.location.origin}/complete-profile` : undefined;

export default function Signup() {
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const { signIn: supabaseSignIn, signOut: supabaseSignOut } = useSupabaseAuth();
  const [role, setRole] = useState("farmer");
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);
  const [districts, setDistricts] = useState([]);

  const [farmerForm, setFarmerForm] = useState({
    district: "",
    tehsil: "",
    language: lang,
    fields: [{ fieldName: "Field 1", crop: "", areaAcres: "" }],
  });
  const [publicForm, setPublicForm] = useState({ district: "", language: lang });
  const [adminForm, setAdminForm] = useState({ designation: "", district: "" });

  const phoneValidation = useMemo(() => (phone ? pakistanPhoneError(phone) : ""), [phone]);
  const nameValidation = useMemo(() => (fullName ? personNameError(fullName) : ""), [fullName]);

  useEffect(() => {
    getDistricts()
      .then((result) => {
        const list = Array.isArray(result) ? result : result?.districts || [];
        setDistricts(list.map((d, i) => ({ id: d.id ?? i, name: d.name || d.district })).filter((d) => d.name));
      })
      .catch(() => setError("Could not load districts from the AgriWatch API."));
  }, []);

  function updateFarmerField(index, key, value) {
    setFarmerForm((prev) => ({
      ...prev,
      fields: prev.fields.map((field, i) => (i === index ? { ...field, [key]: value } : field)),
    }));
  }

  function addFarmerField() {
    setFarmerForm((prev) => ({
      ...prev,
      fields: [...prev.fields, { fieldName: `Field ${prev.fields.length + 1}`, crop: "", areaAcres: "" }],
    }));
  }

  function removeFarmerField(index) {
    setFarmerForm((prev) => ({ ...prev, fields: prev.fields.filter((_, i) => i !== index) }));
  }

  async function requestOtp(e) {
    e.preventDefault();
    const validationError = pakistanPhoneError(phone);
    if (validationError) return setError(validationError);

    setBusy(true);
    setError("");
    try {
      await sendPhoneOtp(phone);
      localStorage.setItem("pendingSignupRole", role);
      setStep("otp");
    } catch (err) {
      setError(err?.message || "Could not send OTP. Make sure the Supabase/Twilio phone provider is configured.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    const validationError = otpError(otp);
    if (validationError) return setError(validationError);

    setBusy(true);
    setError("");
    try {
      const result = await verifyPhoneOtp(phone, otp);
      if (!result?.user?.id) throw new Error("Could not create a verified phone session.");
      setUserId(result.user.id);
      setStep("details");
    } catch (err) {
      setError(err?.message || "The verification code is invalid or expired.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignup() {
    setBusy(true);
    setError("");
    try {
      // Do not silently reuse an old Supabase identity while registering.
      await supabaseSignOut();
      localStorage.setItem("pendingSignupRole", role);
      markLoginAttempt("google-signup", role);
      await supabaseSignIn(GOOGLE_SIGNUP_REDIRECT, { forceAccountChoice: true });
    } catch (err) {
      clearLoginAttempt();
      setError(err?.message || "Google signup could not be started.");
      setBusy(false);
    }
  }

  function validateDetails() {
    const nameErr = personNameError(fullName);
    if (nameErr) return nameErr;

    if (role === "farmer") {
      if (!farmerForm.district) return "Select your district.";
      if (!farmerForm.tehsil.trim()) return "Enter your tehsil.";
      const invalidField = farmerForm.fields.find((field) => !field.fieldName.trim() || !field.crop || Number(field.areaAcres) <= 0);
      if (invalidField) return "Complete the field name, crop and acreage for every field.";
    }
    if (role === "public" && !publicForm.district) return "Select your district.";
    if (role === "admin") {
      if (!adminForm.designation.trim()) return "Enter your designation.";
      if (!adminForm.district) return "Select your assigned district.";
    }
    return "";
  }

  async function submitDetails(e) {
    e.preventDefault();
    const validationError = validateDetails();
    if (validationError) return setError(validationError);
    if (!userId) return setError("Your phone session expired. Please verify the number again.");

    setBusy(true);
    setError("");
    try {
      if (role === "farmer" && farmerForm.language !== lang) setLang(farmerForm.language);
      if (role === "public" && publicForm.language !== lang) setLang(publicForm.language);

      const dbRole = role === "admin" ? "pdma" : role;
      const status = role === "public" ? "approved" : "pending";
      const district = role === "farmer" ? farmerForm.district : role === "public" ? publicForm.district : adminForm.district;
      const totalAcres = farmerForm.fields.reduce((sum, field) => sum + Number(field.areaAcres || 0), 0);

      const payload = {
        user_id: userId,
        email: null,
        full_name: fullName.trim(),
        role: dbRole,
        phone: toPakistanE164(phone),
        district,
        tehsil: role === "farmer" ? farmerForm.tehsil.trim() : null,
        crop: role === "farmer" ? farmerForm.fields[0]?.crop || null : null,
        farm_size: role === "farmer" ? `${totalAcres} acres` : null,
        designation: role === "admin" ? adminForm.designation.trim() : null,
        documents: [],
        status,
      };

      const { data: existingRole, error: existingRoleError } = await supabase
        .from("website_signup_requests")
        .select("status, role, user_id")
        .eq("user_id", userId)
        .eq("role", dbRole)
        .maybeSingle();
      if (existingRoleError) throw existingRoleError;
      if (existingRole) {
        throw new Error(`This account is already registered as ${dbRole === "pdma" ? "PDMA Officer" : dbRole}. Please use Log in instead.`);
      }

      const { error: insertError } = await supabase.from("website_signup_requests").insert(payload);
      if (insertError) throw insertError;

      if (role === "farmer") await createFarmerFields(userId, farmerForm.fields);

      localStorage.removeItem("pendingSignupRole");
      if (role === "public") {
        grantPortalAccess(userId, "public");
        navigate("/public", { replace: true });
      } else {
        setStep("pending");
      }
    } catch (err) {
      setError(err?.message || "Could not create your account.");
    } finally {
      setBusy(false);
    }
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
                <p className="text-xs tracking-[0.18em] uppercase text-white/55">Smart drought resilience</p>
              </div>
            </Link>

            <div className="mt-20 max-w-md">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-xs text-white/80">
                <Sparkles size={13} /> Create a verified account
              </span>
              <h2 className="font-display text-4xl xl:text-5xl leading-tight font-semibold text-white mt-5">Join the AgriWatch network.</h2>
              <p className="mt-5 text-white/65 leading-relaxed">Register once, verify your Pakistani mobile number, then receive the right tools for your role.</p>
            </div>
          </div>

          <div className="space-y-3">
            {["SMS verification with +92 formatting", "Strict input validation for cleaner records", "Separate access for farmers, public and PDMA"].map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] border border-white/10 px-4 py-3 text-sm text-white/75">
                <span className="w-7 h-7 rounded-full bg-primary-light/20 flex items-center justify-center text-primary-light font-mono text-xs">0{index + 1}</span>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="auth-form-column">
          <div className="auth-form-wrap animate-fade-up animation-delay-100">
            <div className="auth-form-card auth-equal-card auth-scroll-card">
              <div className="auth-card-header">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Secure registration</p>
                  <h1 className="font-display text-2xl sm:text-3xl font-semibold mt-2">
                    {step === "phone" ? "Create your AgriWatch account" : step === "otp" ? "Verify your Pakistani number" : step === "details" ? "Tell us about your profile" : "Registration submitted"}
                  </h1>
                  {step !== "pending" && <p className="text-sm text-ink/50 mt-2 max-w-md">Three quick steps. Your role decides which tools become available after approval.</p>}
                </div>
                <div className="auth-card-tools">
                  <ThemeToggle />
                  <LanguageToggle />
                </div>
              </div>
              <div className="auth-card-body-scroll flex-1">

              {step !== "pending" && <SignupProgress step={step} />}

              {step === "phone" && (
                <div className="signup-trust-row mb-6">
                  <span className="signup-trust-chip"><ShieldCheck size={13} /> Verified access</span>
                  <span className="signup-trust-chip">🇵🇰 +92 protected</span>
                  <span className="signup-trust-chip"><CheckCircle2 size={13} /> Clean validated data</span>
                </div>
              )}

              {step === "phone" && (
                <>
                  <p className="auth-label mb-2">{t("loginIAmA")}</p>
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    {roles.map(({ key, labelKey, icon: Icon }) => (
                      <button key={key} type="button" onClick={() => setRole(key)} onMouseDown={addRipple} className={`role-choice ${role === key ? "role-choice-active" : ""}`}>
                        <Icon size={17} /> <span>{t(labelKey)}</span>
                      </button>
                    ))}
                  </div>

                  <form onSubmit={requestOtp} className="space-y-4">
                    <Field label={t("phoneNumber")} hint="Pakistani mobile number only">
                      <div className={`phone-control ${phoneValidation ? "field-invalid" : phone.length === 10 ? "field-valid" : ""}`} dir="ltr">
                        <span className="text-lg">🇵🇰</span><span className="font-semibold text-sm">+92</span><span className="w-px h-6 bg-line" />
                        <input value={phone} onChange={(e) => { setPhone(normalizePakistanLocalPhone(e.target.value)); setError(""); }} inputMode="numeric" maxLength={10} placeholder="3XX XXXXXXX" className="outline-none bg-transparent w-full text-sm font-mono" />
                        {phone.length === 10 && !phoneValidation && <CheckCircle2 size={17} className="text-primary" />}
                      </div>
                      <p className={`text-[11px] mt-1.5 ${phoneValidation ? "text-danger" : "text-ink/40"}`}>{phoneValidation || "Only 10 numeric digits are accepted after +92."}</p>
                    </Field>
                    {error && <div className="auth-error">{error}</div>}
                    <button type="submit" disabled={busy || Boolean(pakistanPhoneError(phone))} onMouseDown={addRipple} className="btn-animated auth-primary-btn">
                      {busy && <Loader2 size={16} className="animate-spin" />} {t("sendOtp")}
                    </button>
                  </form>

                  <div className="auth-divider"><span>or</span></div>

                  <button
                    type="button"
                    onClick={handleGoogleSignup}
                    disabled={busy}
                    onMouseDown={addRipple}
                    className="btn-animated auth-google-btn"
                  >
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
                    Continue with Google
                  </button>
                  <p className="text-[11px] text-ink/40 text-center mt-2">
                    One Gmail can have separate Farmer, Public and PDMA registrations.
                  </p>
                </>
              )}

              {step === "otp" && (
                <form onSubmit={verifyOtp} className="space-y-5 animate-fade-in">
                  <button type="button" onClick={() => { setStep("phone"); setOtp(""); setError(""); }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/50 hover:text-ink"><ArrowLeft size={14} /> Change number</button>
                  <div className="rounded-2xl bg-primary/8 border border-primary/15 p-4">
                    <p className="text-xs text-ink/45">SMS sent to</p>
                    <p className="font-display font-semibold mt-1" dir="ltr">+92 {phone.slice(0, 3)} {phone.slice(3, 6)} {phone.slice(6)}</p>
                  </div>
                  <Field label={t("enterOtp")} hint="6 digits only">
                    <input value={otp} onChange={(e) => { setOtp(digitsOnly(e.target.value, 6)); setError(""); }} inputMode="numeric" autoComplete="one-time-code" maxLength={6} dir="ltr" placeholder="••••••" className="otp-input" autoFocus />
                  </Field>
                  {error && <div className="auth-error">{error}</div>}
                  <button type="submit" disabled={busy || otp.length !== 6} onMouseDown={addRipple} className="btn-animated auth-primary-btn">{busy && <Loader2 size={16} className="animate-spin" />} Verify number</button>
                </form>
              )}

              {step === "details" && (
                <form onSubmit={submitDetails} className="space-y-4 animate-fade-in">
                  <Field label="Full name" hint="Letters only — numbers are blocked">
                    <input required value={fullName} onChange={(e) => { setFullName(sanitizePersonName(e.target.value)); setError(""); }} placeholder="Your full name" className={`form-input ${nameValidation ? "!border-danger" : fullName ? "!border-primary" : ""}`} autoComplete="name" />
                    {nameValidation && <p className="text-[11px] text-danger mt-1">{nameValidation}</p>}
                  </Field>

                  {role === "farmer" && (
                    <>
                      <SectionTitle icon={MapPin} text={t("signupFarmerDetails")} />
                      <DistrictField districts={districts} value={farmerForm.district} onChange={(district) => setFarmerForm({ ...farmerForm, district })} label={t("fieldDistrict")} t={t} />
                      <Field label={t("fieldTehsil")} hint="Letters only">
                        <input required value={farmerForm.tehsil} onChange={(e) => setFarmerForm({ ...farmerForm, tehsil: sanitizeLettersText(e.target.value) })} placeholder={t("fieldTehsilPlaceholder")} className="form-input" />
                      </Field>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div><p className="auth-label">Your fields</p><p className="text-[11px] text-ink/40 mt-0.5">Add one or more cultivated fields.</p></div>
                          <button type="button" onClick={addFarmerField} className="text-xs text-primary font-semibold flex items-center gap-1"><Plus size={13} /> Add field</button>
                        </div>
                        {farmerForm.fields.map((field, index) => (
                          <div key={index} className="profile-field-card">
                            <div className="flex justify-between items-center"><span className="text-sm font-semibold">Field {index + 1}</span>{farmerForm.fields.length > 1 && <button type="button" onClick={() => removeFarmerField(index)} className="text-xs text-danger flex gap-1 items-center"><Trash2 size={12} /> Remove</button>}</div>
                            <input required value={field.fieldName} onChange={(e) => updateFarmerField(index, "fieldName", sanitizeFieldName(e.target.value))} placeholder="Field name" className="form-input" />
                            <select required value={field.crop} onChange={(e) => updateFarmerField(index, "crop", e.target.value)} className="form-select"><option value="">{t("selectOption")}</option>{crops.map((crop) => <option key={crop.value} value={crop.value}>{t(crop.labelKey)}</option>)}</select>
                            <div className="flex items-center gap-2"><input required inputMode="decimal" value={field.areaAcres} onChange={(e) => updateFarmerField(index, "areaAcres", positiveDecimal(e.target.value))} placeholder="Area" className="form-input" /><span className="text-xs text-ink/45">acres</span></div>
                          </div>
                        ))}
                      </div>
                      <LanguagePreference value={farmerForm.language} onChange={(language) => setFarmerForm({ ...farmerForm, language })} />
                    </>
                  )}

                  {role === "public" && (
                    <>
                      <SectionTitle icon={MapPin} text={t("signupPublicDetails")} />
                      <DistrictField districts={districts} value={publicForm.district} onChange={(district) => setPublicForm({ ...publicForm, district })} label={t("fieldDistrict")} t={t} />
                      <LanguagePreference value={publicForm.language} onChange={(language) => setPublicForm({ ...publicForm, language })} />
                    </>
                  )}

                  {role === "admin" && (
                    <>
                      <SectionTitle icon={ShieldCheck} text={t("signupAdminDetails")} />
                      <Field label={t("fieldDesignation")} hint="Letters and standard title punctuation only">
                        <input required value={adminForm.designation} onChange={(e) => setAdminForm({ ...adminForm, designation: sanitizeLettersText(e.target.value) })} placeholder={t("fieldDesignationPlaceholder")} className="form-input" />
                      </Field>
                      <DistrictField districts={districts} value={adminForm.district} onChange={(district) => setAdminForm({ ...adminForm, district })} label={t("fieldAssignedDistrict")} t={t} />
                    </>
                  )}

                  {error && <div className="auth-error">{error}</div>}
                  <button type="submit" disabled={busy || Boolean(personNameError(fullName))} onMouseDown={addRipple} className="btn-animated auth-primary-btn">
                    {busy && <Loader2 size={16} className="animate-spin" />} {t("createAccount")}
                  </button>
                </form>
              )}

              {step === "pending" && (
                <div className="py-5 flex flex-col items-center text-center gap-3 animate-pop-in">
                  <div className="w-16 h-16 rounded-2xl bg-warn/10 flex items-center justify-center"><Clock size={28} className="text-warn" /></div>
                  <p className="font-display text-xl font-semibold">{t("adminPendingTitle")}</p>
                  <p className="text-sm text-ink/55 leading-relaxed max-w-sm">{role === "farmer" ? t("farmerPendingBody") : t("adminPendingBody")}</p>
                  <Link to="/login" className="btn-animated auth-primary-btn !w-auto px-6 mt-2">Back to login</Link>
                </div>
              )}

              {step === "phone" && (
                <div className="mt-6 pt-5 border-t border-line flex items-center justify-center gap-1.5 text-xs">
                  <span className="text-ink/50">{t("alreadyHaveAccount")}</span>
                  <Link to="/login" className="font-semibold text-primary hover:underline">{t("login")}</Link>
                </div>
              )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SignupProgress({ step }) {
  const steps = [
    { key: "phone", label: "Phone" },
    { key: "otp", label: "Verify" },
    { key: "details", label: "Profile" },
  ];
  const current = Math.max(0, steps.findIndex((item) => item.key === step));

  return (
    <div className="signup-progress" aria-label="Signup progress">
      {steps.map((item, index) => {
        const complete = index < current;
        const active = index === current;
        return (
          <div key={item.key} className={`signup-progress-item ${complete ? "is-complete" : ""} ${active ? "is-active" : ""}`}>
            <div className="signup-step-badge">{complete ? <CheckCircle2 size={15} /> : index + 1}</div>
            <span>{item.label}</span>
            {index < steps.length - 1 && <div className="signup-progress-line" />}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3"><label className="auth-label">{label}</label>{hint && <span className="text-[10px] text-ink/35">{hint}</span>}</div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function SectionTitle({ icon: Icon, text }) {
  return <div className="flex items-center gap-2 pt-1"><div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Icon size={15} className="text-primary" /></div><p className="text-sm font-semibold">{text}</p></div>;
}

function DistrictField({ districts, value, onChange, label, t }) {
  return (
    <Field label={label}>
      <select required value={value} onChange={(e) => onChange(e.target.value)} className="form-select">
        <option value="">{t("selectOption")}</option>
        {districts.map((district) => <option key={district.id} value={district.name}>{district.name}</option>)}
      </select>
    </Field>
  );
}

function LanguagePreference({ value, onChange }) {
  return (
    <Field label="Language preference">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onChange("en")} className={`role-choice !flex-row !py-2.5 ${value === "en" ? "role-choice-active" : ""}`}>English</button>
        <button type="button" onClick={() => onChange("ur")} className={`role-choice !flex-row !py-2.5 ${value === "ur" ? "role-choice-active" : ""}`}>اردو</button>
      </div>
    </Field>
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
