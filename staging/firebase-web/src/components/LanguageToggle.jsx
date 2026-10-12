import { useLanguage } from "../i18n/LanguageContext";
import { Languages } from "lucide-react";

export default function LanguageToggle({ className = "" }) {
  const { lang, toggleLang } = useLanguage();
  return (
    <button
      onClick={toggleLang}
      className={`flex items-center gap-1.5 text-xs font-medium border border-line rounded-lg px-3 py-1.5 bg-surface hover:bg-paper-dim transition-colors ${className}`}
      title="Switch language / زبان تبدیل کریں"
    >
      <Languages size={13} />
      {lang === "en" ? "اردو" : "English"}
    </button>
  );
}
