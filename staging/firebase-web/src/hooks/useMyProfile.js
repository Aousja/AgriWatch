import { useCallback, useEffect, useState } from "react";
import { useSupabaseAuth } from "../supabase/useSupabaseAuth";
import { supabase } from "../supabase/config";

// Only these fields are ever sent in an update — status/role/documents are
// decided by admins in the portal, not editable by the account owner.
// (The database also enforces this server-side via a trigger, this is just
// so the client never even tries.)
const EDITABLE_FIELDS = ["full_name", "phone", "district", "tehsil", "crop", "farm_size", "designation"];

export function useMyProfile() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("website_signup_requests")
      .select("*")
      .eq("user_id", user.id)
      .eq("role", "farmer")
      .maybeSingle()
      .then(({ data, error: readErr }) => {
        if (readErr) {
          console.error("Couldn't load profile:", readErr);
          setError(readErr);
        } else {
          setProfile(data);
          setError(null);
        }
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  const updateProfile = useCallback(
    async (fields) => {
      if (!user) throw new Error("Not signed in.");
      const safeFields = {};
      for (const key of EDITABLE_FIELDS) {
        if (key in fields) safeFields[key] = fields[key];
      }
      const { data, error: updateErr } = await supabase
        .from("website_signup_requests")
        .update(safeFields)
        .eq("user_id", user.id)
        .eq("role", "farmer")
        .select()
        .single();
      if (updateErr) throw updateErr;
      setProfile(data);
      return data;
    },
    [user]
  );

  return { user, profile, loading: authLoading || loading, error, updateProfile, refresh };
}