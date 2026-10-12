import Topbar from "../../components/Topbar";
import PdmaPageHero from "../../components/PdmaPageHero";
import { useLanguage } from "../../i18n/LanguageContext";
import ProfileEditor from "../../components/ProfileEditor";

export default function Settings() {
  const { t } = useLanguage();
  return (
    <>
      <Topbar title={t("ptAdminSettingsTitle")} subtitle={t("ptAdminSettingsSub")} />
      <main className="p-4 sm:p-8 space-y-6 pdma-page" dir="ltr">
        <PdmaPageHero
          title="Officer profile and preferences"
          copy="Keep your PDMA officer details, assigned district and account preferences current across the AgriWatch operational portal."
          stats={[
            { label: "Portal", value: "PDMA" },
            { label: "Access", value: "Officer" },
            { label: "Account", value: "Verified profile" },
          ]}
        />
        <ProfileEditor role="pdma" />
      </main>
    </>
  );
}
