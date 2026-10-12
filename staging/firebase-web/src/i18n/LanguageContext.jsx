import { createContext, useContext, useEffect, useState } from "react";
import dict from "./translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("agriwatch_lang") || "en");

  useEffect(() => {
    localStorage.setItem("agriwatch_lang", lang);
    // Deliberately NOT flipping document.documentElement.dir here.
    //
    // Only page chrome (Sidebar, Topbar title, Login/Signup/Home) is fully
    // translated — the rest of the app (tables, charts, forms, complaint
    // text) stays in English and is hardcoded dir="ltr" on purpose. Mirroring
    // the whole document used to fight that: the chrome would flip to RTL
    // while every page's content forced itself back to LTR, producing a
    // half-mirrored, broken-looking layout when switching to Urdu.
    //
    // Instead, `dir="rtl"` is applied locally — only on the components that
    // actually carry Urdu text (see the `lang === "ur" ? "rtl" : undefined`
    // pattern in Sidebar, Topbar, Login, Signup, Home, GuestDashboard). Each
    // of those scopes correctly right-aligns and mirrors just itself, and
    // Tailwind's rtl: utility variant matches on that local ancestor too, so
    // things like the sidebar's active-item indicator still flip correctly
    // without touching the rest of the page.
    document.documentElement.lang = lang;
  }, [lang]);

  function t(key) {
    const entry = dict[key];
    if (!entry) return key;
    return entry[lang] || entry.en;
  }

  function toggleLang() {
    setLang((l) => (l === "en" ? "ur" : "en"));
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
