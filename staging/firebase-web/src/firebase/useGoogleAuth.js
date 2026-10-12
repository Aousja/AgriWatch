import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { auth, googleProvider } from "./config";

export function useGoogleAuth() {
  const [user, setUser] = useState(undefined); // undefined = still checking, null = signed out
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  async function signIn() {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Google sign-in failed:", err);
      setError(err);
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return { user, loading: user === undefined, error, signIn, signOut };
}
