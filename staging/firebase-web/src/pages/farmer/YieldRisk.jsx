import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card from "../../components/Card";
import { yieldRisk, currentFarmer } from "../../data/dummyData";
import {
  AlertTriangle,
  ShieldCheck,
  TrendingDown,
  Activity,
  Sprout,
  Sparkles,
} from "lucide-react";

export default function YieldRisk() {
  const { t } = useLanguage();
  const riskPercent = Math.min(Math.max(Number(yieldRisk.percent || 0), 0), 100);

  return (
    <>
      <Topbar title={t("ptFarmerYieldTitle")} subtitle={`${currentFarmer.crop} · ${currentFarmer.district}`} />
      <main className="farmer-page p-4 sm:p-8 space-y-6" dir="ltr">
        <section className="farmer-page-hero">
          <div className="farmer-hero-content grid lg:grid-cols-[1.2fr_.8fr] gap-6 items-center">
            <div>
              <span className="farmer-hero-eyebrow"><Sparkles size={13} /> Seasonal yield outlook</span>
              <h2 className="farmer-hero-title">Understand the factors affecting your crop yield</h2>
              <p className="farmer-hero-copy">
                The yield-risk view summarizes drought pressure and crop risk factors so you can focus on the actions that matter most for the current season.
              </p>
              <div className="farmer-hero-actions">
                <span className="farmer-hero-button"><Sprout size={14} /> {currentFarmer.crop}</span>
                <span className="farmer-hero-button"><Activity size={14} /> {currentFarmer.district}</span>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="farmer-risk-ring" style={{ "--risk": `${riskPercent}%` }}>
                <div>
                  <strong>{yieldRisk.score}</strong>
                  <span>{riskPercent}% index</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="farmer-data-card">
            <div className="flex items-start justify-between">
              <div><p className="farmer-card-label">Risk score</p><p className="farmer-card-value text-danger">{yieldRisk.score}</p></div>
              <div className="farmer-data-icon !text-danger !bg-danger/10"><TrendingDown size={17} /></div>
            </div>
            <div className="farmer-progress-track"><span className="!bg-danger" style={{ width: `${riskPercent}%` }} /></div>
          </Card>
          <Card className="farmer-data-card">
            <div className="flex items-start justify-between">
              <div><p className="farmer-card-label">Risk index</p><p className="farmer-card-value">{riskPercent}%</p></div>
              <div className="farmer-data-icon"><Activity size={17} /></div>
            </div>
            <p className="text-xs text-ink/45 mt-3">Seasonal modeled risk indicator</p>
          </Card>
          <Card className="farmer-data-card">
            <div className="flex items-start justify-between">
              <div><p className="farmer-card-label">Crop profile</p><p className="farmer-card-value capitalize">{currentFarmer.crop}</p></div>
              <div className="farmer-data-icon"><Sprout size={17} /></div>
            </div>
            <p className="text-xs text-ink/45 mt-3">Current farmer crop selection</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Card className="farmer-form-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center"><AlertTriangle size={18} className="text-danger" /></div>
              <div>
                <p className="font-display font-semibold">Key risk factors</p>
                <p className="text-xs text-ink/45 mt-0.5">Conditions contributing to the current score.</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {yieldRisk.factors.map((factor, index) => (
                <div key={index} className="farmer-advice-item !border-danger/10 !bg-danger/5">
                  <span className="farmer-advice-dot !bg-danger !shadow-none" />
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="farmer-form-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><ShieldCheck size={18} className="text-primary" /></div>
              <div>
                <p className="font-display font-semibold">Mitigation actions</p>
                <p className="text-xs text-ink/45 mt-0.5">Steps that can reduce drought-related yield pressure.</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {yieldRisk.mitigation.map((action, index) => (
                <div key={index} className="farmer-advice-item">
                  <span className="farmer-advice-dot" />
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="farmer-callout">
          <p className="text-xs text-ink/55">Model: regression trained on FAO GAEZ yield data and historical drought indices.</p>
        </div>
      </main>
    </>
  );
}
