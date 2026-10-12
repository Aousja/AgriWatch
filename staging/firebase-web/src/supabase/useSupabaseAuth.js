import { useEffect, useState } from "react";
import { supabase } from "./config";
import { clearPortalAccess, clearLoginAttempt } from "../utils/authAccess";

// Same shape as the old Firebase useGoogleAuth() hook — user / loading /
// error / signIn / signOut — so the rest of the app barely had to change.
//
// Note: Supabase's OAuth flow redirects the whole page (it isn't a popup
// like Firebase's signInWithPopup), so signIn() sends the browser to Google
// and back to `redirectTo` below. Make sure that URL is added under
// Supabase → Authentication → URL Configuration → Redirect URLs.
export function useSupabaseAuth() {
  const [user, setUser] = useState(undefined); // undefined = still checking, null = signed out
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(redirectTo = `${window.location.origin}/admin-portal`, { forceAccountChoice = false } = {}) {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        ...(forceAccountChoice ? { queryParams: { prompt: "select_account" } } : {}),
      },
    });
    if (error) {
      console.error("Google sign-in failed:", error);
      setError(error);
    }
  }

  async function signOut() {
    clearPortalAccess();
    clearLoginAttempt();
    await supabase.auth.signOut();
  }

  return { user, loading: user === undefined, error, signIn, signOut };
}