import { useCallback, useEffect, useState } from "react";
import { supabase } from "./config";
import { useSupabaseAuth } from "./useSupabaseAuth";
import { currentFarmer, currentOfficer, currentPublicUser } from "../data/dummyData";

// Demo fallback profile per portal — shown only when nobody actually signed
// in via Google (the phone/OTP demo flow doesn't create a Supabase session).
const fallbackProfiles = {
  farmer: currentFarmer,
  pdma: currentOfficer,
  public: currentPublicUser,
};

// Demo accounts have no Supabase row to write to, so edits made while not
// signed in are kept per-portal in localStorage — same "quietly fall back
// to a local mirror" pattern ComplaintsContext uses when Supabase is
// unreachable, just scoped to one visitor's profile instead of the shared
// complaints table.
function overrideKey(role) {
  return `agriwatch_profile_override_${role}`;
}

function readOverride(role) {
  try {
    const raw = localStorage.getItem(overrideKey(role));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Who is this? Used both to prefill a complaint/bug-report form and to
// drive the "Your Profile" card in Settings.
//
// If the person signed in with Google, their approved details live in
// website_signup_requests — name, role, district, phone, crop, farm size —
// and edits are written back there. If they came in through the demo
// phone/OTP flow there's no Supabase session, so we fall back to a demo
// profile (and keep any local edits in localStorage) instead.
export function useCurrentProfile(fallbackRole = "farmer") {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [override, setOverride] = useState(() => readOverride(fallbackRole));

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    supabase
      .from("website_signup_requests")
      .select("full_name, role, district, phone, crop, farm_size")
      .eq("user_id", user.id)
      .eq("role", fallbackRole)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.warn("Couldn't load profile for report form:", error.message);
        setProfile(data || null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, fallbackRole]);

  const isFarmerish = fallbackRole === "farmer";
  const fallback = fallbackProfiles[fallbackRole] || null;

  const name =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    override.name ||
    fallback?.name ||
    "";
  const district = profile?.district || override.district || fallback?.district || "";
  const phone = profile?.phone || override.phone || "";
  const crop = profile?.crop || override.crop || (isFarmerish ? currentFarmer.crop : "");
  const farmSize = profile?.farm_size || override.farmSize || (isFarmerish ? currentFarmer.farmSize : "");
  // No Supabase column for this one — it's decorative demo detail only,
  // so it always lives in the local override regardless of sign-in state.
  const tehsil = override.tehsil || (isFarmerish ? currentFarmer.tehsil : "");

  // fields: any of { name, district, phone, crop, farmSize, tehsil }.
  // Returns { error } — null on success.
  const updateProfile = useCallback(
    async (fields) => {
      const { tehsil: newTehsil, ...rest } = fields;
      let error = null;

      if (user && Object.keys(rest).length) {
        const payload = {};
        if (rest.name !== undefined) payload.full_name = rest.name;
        if (rest.district !== undefined) payload.district = rest.district;
        if (rest.phone !== undefined) payload.phone = rest.phone;
        if (rest.crop !== undefined) payload.crop = rest.crop;
        if (rest.farmSize !== undefined) payload.farm_size = rest.farmSize;

        const res = await supabase.from("website_signup_requests").update(payload).eq("user_id", user.id).eq("role", fallbackRole);
        error = res.error || null;
        if (!error) setProfile((p) => ({ ...(p || {}), ...payload }));
      }

      // Signed-in accounts still keep tehsil locally (no DB column for it);
      // demo accounts keep everything locally since there's no row at all.
      const localFields = user ? (newTehsil !== undefined ? { tehsil: newTehsil } : {}) : fields;
      if (Object.keys(localFields).length) {
        const merged = { ...readOverride(fallbackRole), ...localFields };
        try {
          localStorage.setItem(overrideKey(fallbackRole), JSON.stringify(merged));
        } catch {
          // storage full/unavailable — edits still apply for this session via state
        }
        setOverride(merged);
      }

      return { error };
    },
    [user, fallbackRole]
  );

  return {
    loading: authLoading || loading,
    userId: user?.id ?? null,
    email: user?.email ?? "",
    name,
    role: profile?.role || fallbackRole,
    district,
    phone,
    crop,
    farmSize,
    tehsil,
    signedIn: !!user,
    updateProfile,
  };
}
