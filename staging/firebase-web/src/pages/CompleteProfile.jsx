import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  CheckCircle2,
  FileCheck2,
  Loader2,
  MapPin,
  Plus,
  ShieldCheck,
  Sparkles,
  Sprout,
  Trash2,
  UploadCloud,
  Users2,
  X,
} from "lucide-react";
import logo from "../assets/logo.jpeg";
import LanguageToggle from "../components/LanguageToggle";
import ThemeToggle from "../components/ThemeToggle";
import { getDistricts } from "../services/droughtService";
import { createFarmerFields } from "../services/farmerFieldService";
import { addRipple } from "../utils/ripple";
import {
  normalizePakistanLocalPhone,
  pakistanPhoneError,
  personNameError,
  positiveDecimal,
  sanitizeFieldName,
  sanitizeLettersText,
  sanitizePersonName,
  toPakistanE164,
} from "../utils/formValidation";
import { useSupabaseAuth } from "../supabase/useSupabaseAuth";
import { supabase } from "../supabase/config";
import { clearLoginAttempt, grantPortalAccess } from "../utils/authAccess";

const roleOptions = [
  { key: "farmer", label: "Farmer", icon: Sprout },
  { key: "public", label: "General Public", icon: Users2 },
  { key: "pdma", label: "PDMA Officer", icon: ShieldCheck },
];

const DOCS_BUCKET = "verification-documents";

function routeForRole(role) {
  if (role === "pdma") return "/pdma";
  if (role === "public") return "/public";
  return "/farmer";
}

export default function CompleteProfile() {
  const { user, loading: authLoading, signOut } = useSupabaseAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState(() =>
    localStorage.getItem("pendingSignupRole") === "admin"
      ? "pdma"
      : localStorage.getItem("pendingSignupRole") || "farmer"
  );
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("");
  const [tehsil, setTehsil] = useState("");
  const [districts, setDistricts] = useState([]);
  const [districtsLoading, setDistrictsLoading] = useState(true);
  const [fields, setFields] = useState([{ fieldName: "Field 1", crop: "", areaAcres: "" }]);
  const [designation, setDesignation] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const nameValidation = useMemo(() => (fullName ? personNameError(fullName) : ""), [fullName]);
  const phoneValidation = useMemo(() => (phone ? pakistanPhoneError(phone) : ""), [phone]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    let cancelled = false;
    getDistricts()
      .then((result) => {
        if (cancelled) return;
        const list = Array.isArray(result) ? result : result?.districts || [];
        setDistricts(
          list
            .map((d, i) => ({ id: d.id ?? i, name: d.name || d.district }))
            .filter((d) => d.name)
        );
      })
      .catch((err) => setError(err.message || "Could not load districts."))
      .finally(() => !cancelled && setDistrictsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  function updateField(index, key, value) {
    setFields((prev) => prev.map((field, i) => (i === index ? { ...field, [key]: value } : field)));
  }

  function addField() {
    setFields((prev) => [
      ...prev,
      { fieldName: `Field ${prev.length + 1}`, crop: "", areaAcres: "" },
    ]);
  }

  function removeField(index) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function addFiles(e) {
    const chosen = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...chosen]);
    e.target.value = "";
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const nameErr = personNameError(fullName);
    if (nameErr) return setError(nameErr);
    const phoneErr = pakistanPhoneError(phone);
    if (phoneErr) return setError(phoneErr);
    if (!district) return setError("Please select your district.");

    if (role === "farmer") {
      if (!tehsil.trim()) return setError("Please enter your tehsil.");
      const invalidField = fields.some(
        (field) =>
          !field.fieldName.trim() ||
          !field.crop.trim() ||
          !field.areaAcres ||
          Number(field.areaAcres) <= 0
      );
      if (invalidField) return setError("Complete the field name, crop and acreage for every field.");
    }

    if (role === "pdma" && !designation.trim()) {
      return setError("Please enter your PDMA designation.");
    }

    if (files.length === 0) {
      return setError("Attach at least one verification document before submitting.");
    }

    setBusy(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${Date.now()}_${safeName}`;
        const { error: uploadErr } = await supabase.storage.from(DOCS_BUCKET).upload(path, file);
        if (uploadErr) throw uploadErr;
        uploaded.push({ name: file.name, path });
      }

      const { data: existingRole, error: existingRoleError } = await supabase
        .from("website_signup_requests")
        .select("status, role, user_id")
        .eq("user_id", user.id)
        .eq("role", role)
        .maybeSingle();
      if (existingRoleError) throw existingRoleError;
      if (existingRole) {
        throw new Error(`This Google account is already registered as ${role === "pdma" ? "PDMA Officer" : role}. Use Log in and select that role.`);
      }

      const roleStatus = role === "public" ? "approved" : "pending";

      const { error: insertErr } = await supabase.from("website_signup_requests").insert({
        user_id: user.id,
        email: user.email,
        full_name: fullName.trim(),
        role,
        phone: toPakistanE164(phone),
        district,
        tehsil: role === "farmer" ? tehsil.trim() : null,
        crop: role === "farmer" ? fields[0]?.crop || null : null,
        farm_size:
          role === "farmer"
            ? `${fields.reduce((sum, field) => sum + Number(field.areaAcres || 0), 0)} acres`
            : null,
        designation: role === "pdma" ? designation.trim() : null,
        documents: uploaded,
        status: roleStatus,
      });
      if (insertErr) throw insertErr;

      if (role === "farmer") await createFarmerFields(user.id, fields);

      localStorage.removeItem("pendingSignupRole");
      clearLoginAttempt();

      if (role === "public") {
        grantPortalAccess(user.id, "public");
        navigate(routeForRole(role), { replace: true });
      } else {
        await signOut();
        navigate("/login", { replace: true });
      }
    } catch (err) {
      console.error("Failed to submit verification request:", err);
      setError(err.message || "Something went wrong submitting your request.");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) {
    return (
      <div className="auth-page flex items-center justify-center">
        <Loader2 size={26} className="animate-spin text-primary-light" />
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />

      <div className="auth-layout">
        <section className="hidden lg:flex flex-col justify-between rounded-[2rem] p-10 xl:p-12 auth-visual-panel auth-equal-panel animate-fade-up">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <img src={logo} alt="AgriWatch Pakistan" className="w-12 h-12 rounded-2xl object-cover bg-white shadow-lg" />
              <div>
                <p className="font-display text-xl font-semibold text-white">AgriWatch Pakistan</p>
                <p className="text-xs tracking-[0.18em] uppercase text-white/55">Google account verification</p>
              </div>
            </Link>

            <div className="mt-20 max-w-md">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-xs text-white/80">
                <Sparkles size={13} /> One final verification step
              </span>
              <h2 className="font-display text-4xl xl:text-5xl leading-tight font-semibold text-white mt-5">
                Complete your profile before entering AgriWatch.
              </h2>
              <p className="mt-5 text-white/65 leading-relaxed">
                Your Google identity is connected. Add your role, Pakistani phone number and verification details so access can be reviewed securely.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              [ShieldCheck, "Google verified"],
              [MapPin, "District linked"],
              [FileCheck2, "Admin reviewed"],
            ].map(([Icon, label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur text-white/70">
                <Icon size={18} className="text-primary-light" />
                <p className="text-xs mt-3 font-semibold">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="auth-form-column">
          <div className="auth-form-wrap animate-fade-up animation-delay-100">
            <form onSubmit={handleSubmit} className="auth-form-card auth-equal-card auth-scroll-card space-y-4">
              <div className="auth-card-header">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Complete profile</p>
                  <h1 className="font-display text-2xl sm:text-3xl font-semibold mt-2">Finish your account setup</h1>
                  <p className="text-sm text-ink/50 mt-2">
                    Signed in as <span className="font-semibold text-ink">{user?.email}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => signOut().then(() => navigate("/login", { replace: true }))}
                    className="text-xs text-primary hover:underline font-semibold mt-1"
                  >
                    Not you? Sign out
                  </button>
                </div>
                <div className="auth-card-tools">
                  <ThemeToggle />
                  <LanguageToggle />
                </div>
              </div>
              <div className="auth-card-body-scroll flex-1 space-y-4">

              <div className="signup-progress !mb-5">
                <div className="signup-progress-item is-complete"><div className="signup-step-badge"><CheckCircle2 size={15} /></div><span>Google</span></div>
                <div className="signup-progress-item is-active"><div className="signup-step-badge">2</div><span>Profile</span></div>
                <div className="signup-progress-item"><div className="signup-step-badge">3</div><span>Approval</span></div>
              </div>

              <Field label="I am a">
                <div className="grid grid-cols-3 gap-2">
                  {roleOptions.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRole(key)}
                      onMouseDown={addRipple}
                      className={`role-choice ${role === key ? "role-choice-active" : ""}`}
                    >
                      <Icon size={17} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Full name" hint="Letters only">
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(sanitizePersonName(e.target.value))}
                  placeholder="Your full name"
                  className={`form-input ${nameValidation ? "!border-danger" : fullName ? "!border-primary" : ""}`}
                  autoComplete="name"
                />
                {nameValidation && <p className="text-[11px] text-danger mt-1">{nameValidation}</p>}
              </Field>

              <Field label="Pakistani phone number" hint="10 digits after +92">
                <div className={`phone-control ${phoneValidation ? "field-invalid" : phone.length === 10 ? "field-valid" : ""}`} dir="ltr">
                  <span className="text-lg">🇵🇰</span>
                  <span className="font-semibold text-sm">+92</span>
                  <span className="w-px h-6 bg-line" />
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(normalizePakistanLocalPhone(e.target.value))}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="3XX XXXXXXX"
                    className="outline-none bg-transparent w-full text-sm font-mono"
                  />
                  {phone.length === 10 && !phoneValidation && <CheckCircle2 size={17} className="text-primary" />}
                </div>
                <p className={`text-[11px] mt-1 ${phoneValidation ? "text-danger" : "text-ink/40"}`}>
                  {phoneValidation || "Numbers only. Pakistani mobile numbers start with 3."}
                </p>
              </Field>

              <Field label="District">
                <select required value={district} onChange={(e) => setDistrict(e.target.value)} className="form-select">
                  <option value="">Select district</option>
                  {districtsLoading ? (
                    <option disabled>Loading districts…</option>
                  ) : (
                    districts.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)
                  )}
                </select>
              </Field>

              {role === "farmer" && (
                <>
                  <Field label="Tehsil" hint="Letters only">
                    <input
                      required
                      value={tehsil}
                      onChange={(e) => setTehsil(sanitizeLettersText(e.target.value))}
                      placeholder="Your tehsil"
                      className="form-input"
                    />
                  </Field>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="auth-label">Your cultivated fields</p>
                        <p className="text-[11px] text-ink/40 mt-0.5">You can register more than one crop field.</p>
                      </div>
                      <button type="button" onClick={addField} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        <Plus size={13} /> Add field
                      </button>
                    </div>

                    {fields.map((field, index) => (
                      <div key={index} className="profile-field-card">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">Field {index + 1}</p>
                          {fields.length > 1 && (
                            <button type="button" onClick={() => removeField(index)} className="text-danger flex items-center gap-1 text-xs">
                              <Trash2 size={13} /> Remove
                            </button>
                          )}
                        </div>
                        <input required value={field.fieldName} onChange={(e) => updateField(index, "fieldName", sanitizeFieldName(e.target.value))} placeholder="Field name" className="form-input" />
                        <input required value={field.crop} onChange={(e) => updateField(index, "crop", sanitizeLettersText(e.target.value))} placeholder="Crop, e.g. Cotton" className="form-input" />
                        <div className="flex items-center gap-2">
                          <input required inputMode="decimal" value={field.areaAcres} onChange={(e) => updateField(index, "areaAcres", positiveDecimal(e.target.value))} placeholder="Area" className="form-input" />
                          <span className="text-xs text-ink/50 shrink-0">acres</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {role === "pdma" && (
                <Field label="Designation" hint="Letters only">
                  <input required value={designation} onChange={(e) => setDesignation(sanitizeLettersText(e.target.value))} placeholder="e.g. Field Officer" className="form-input" />
                </Field>
              )}

              <Field label={role === "pdma" ? "PDMA ID card / appointment letter" : role === "farmer" ? "CNIC / proof of land ownership" : "CNIC or other ID"} hint="Image or PDF">
                <label className="signup-upload-zone">
                  <UploadCloud size={19} className="text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">Choose verification document</p>
                    <p className="text-[11px] text-ink/40 mt-0.5">Click to attach one or more files.</p>
                  </div>
                  <input type="file" multiple accept="image/*,.pdf" onChange={addFiles} className="hidden" />
                </label>
                {files.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {files.map((file, index) => (
                      <li key={`${file.name}-${index}`} className="flex items-center justify-between text-xs bg-surface border border-line rounded-lg px-3 py-2">
                        <span className="truncate flex items-center gap-2"><FileCheck2 size={13} className="text-primary" /> {file.name}</span>
                        <button type="button" onClick={() => removeFile(index)} className="text-ink/40 hover:text-danger shrink-0 ms-2"><X size={13} /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </Field>

              {error && <div className="auth-error">{error}</div>}

              <button
                type="submit"
                disabled={busy || Boolean(nameValidation) || Boolean(phoneValidation)}
                onMouseDown={addRipple}
                className="btn-animated auth-primary-btn"
              >
                {busy && <Loader2 size={15} className="animate-spin" />}
                Submit for verification
              </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="auth-label">{label}</label>
        {hint && <span className="text-[10px] text-ink/35">{hint}</span>}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
