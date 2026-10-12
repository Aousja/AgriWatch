import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import ProfileEditor from "../../components/ProfileEditor";
import { Settings, ShieldCheck, UserRound, Sparkles } from "lucide-react";

export default function FarmerSettings() {
  const { t } = useLanguage();

  return (
    <>
      <Topbar title={t("ptFarmerSettingsTitle")} subtitle={t("ptFarmerSettingsSub")} />
      <main className="farmer-page p-4 sm:p-8 space-y-6" dir="ltr">
        <section className="farmer-page-hero">
          <div className="farmer-hero-content">
            <span className="farmer-hero-eyebrow"><Sparkles size={13} /> Farmer profile</span>
            <h2 className="farmer-hero-title">Keep your farm details accurate</h2>
            <p className="farmer-hero-copy">
              Your district, crop and farm information are used throughout AgriWatch to personalize drought monitoring, irrigation guidance and advisory screens.
            </p>
            <div className="farmer-hero-stats">
              <div className="farmer-hero-stat"><span>Profile</span><strong><UserRound size={18} className="inline me-2" />Farmer</strong></div>
              <div className="farmer-hero-stat"><span>Security</span><strong><ShieldCheck size={18} className="inline me-2" />Protected</strong></div>
              <div className="farmer-hero-stat"><span>Preferences</span><strong><Settings size={18} className="inline me-2" />Editable</strong></div>
            </div>
          </div>
        </section>

        <section>
          <div className="farmer-section-title mb-3">
            <div><h2>Your account information</h2><p>Review and update the information used by your farmer portal.</p></div>
          </div>
          <ProfileEditor role="farmer" className="max-w-none" />
        </section>
      </main>
    </>
  );
}
