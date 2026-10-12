import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import ProfileEditor from "../../components/ProfileEditor";

export default function PublicSettings() {
  const { t } = useLanguage();
  return (
    <>
      <Topbar title={t("ptPublicSettingsTitle")} subtitle={t("ptPublicSettingsSub")} />
      <main className="p-4 sm:p-8 space-y-6 public-page" dir="ltr">
        <section className="public-page-hero">
          <div className="public-hero-content">
            <span className="public-hero-eyebrow">Account preferences</span>
            <h2 className="public-hero-title">Keep your public profile and district information current</h2>
            <p className="public-hero-copy">Your saved district helps AgriWatch show the most relevant drought map, alerts, and regional information.</p>
          </div>
          <div className="public-hero-stats">
            <div className="public-hero-stat"><span>Portal</span><strong>General Public</strong></div>
            <div className="public-hero-stat"><span>Language</span><strong>English / Urdu</strong></div>
            <div className="public-hero-stat"><span>Access</span><strong>Role protected</strong></div>
          </div>
        </section>
        <ProfileEditor role="public" />
      </main>
    </>
  );
}
