import { supabase } from "../supabase/config";
import { toPakistanE164 } from "../utils/formValidation";

// Supabase sends SMS through the SMS provider configured in
// Supabase Dashboard > Authentication > Providers > Phone.
// Configure Twilio there with your Account SID, Messaging Service/Sender,
// and Auth Token. Never expose the Twilio Auth Token in Vite/browser code.
export async function sendPhoneOtp(localDigits) {
  const phone = toPakistanE164(localDigits);
  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
  return { data, phone };
}

export async function verifyPhoneOtp(localDigits, token) {
  const phone = toPakistanE164(localDigits);
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
  if (error) throw error;
  return data;
}

export function normalizeDbRole(role) {
  return role === "admin" ? "pdma" : role;
}

// A single Supabase identity may own a separate AgriWatch registration for
// Farmer, General Public and PDMA. Always look up the exact requested role.
export async function getSignupRequest(userId, role) {
  if (!userId || !role) return null;
  const dbRole = normalizeDbRole(role);
  const { data, error } = await supabase
    .from("website_signup_requests")
    .select("status, role, user_id")
    .eq("user_id", userId)
    .eq("role", dbRole)
    .maybeSingle();
  if (error) throw error;
  return data;
}
