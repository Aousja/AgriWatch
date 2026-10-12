import { useLanguage } from "../i18n/LanguageContext";

export default function Card({ children, className = "", scan = false, ...rest }) {
  // If the caller passes their own bg-* class (e.g. "bg-forest"), skip the
  // default bg-white entirely — otherwise Tailwind's generated stylesheet
  // order can make bg-white silently win over the intended override,
  // regardless of class order in the JSX.
  const hasCustomBg = /(^|\s)bg-/.test(className);
  return (
    <div
      className={`${hasCustomBg ? "" : "bg-surface"} dashboard-card border border-line rounded-xl p-5 ${scan ? "scan-line" : ""} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, value, unit, delta, deltaTone = "ok", icon: Icon }) {
  const toneColor = { ok: "text-primary", warn: "text-warn", danger: "text-danger" }[deltaTone];
  return (
    <Card className="flex flex-col gap-2" scan>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-ink/45 font-medium">{label}</p>
        {Icon && <Icon size={16} className="text-ink/30" />}
      </div>
      <p className="font-display text-2xl font-semibold text-ink">
        {value}
        {unit && <span className="text-sm text-ink/40 ml-1 font-body">{unit}</span>}
      </p>
      {delta && <p className={`text-xs font-mono ${toneColor}`}>{delta}</p>}
    </Card>
  );
}

const severityKeyMap = {
  Normal: "sevNormal",
  Moderate: "sevModerate",
  Severe: "sevSevere",
  Extreme: "sevExtreme",
};

const statusKeyMap = {
  Delivered: "statusDelivered",
  "Under Review": "statusUnderReview",
  Forwarded: "statusForwarded",
  Resolved: "statusResolved",
};

export function SeverityBadge({ level }) {
  const { t, lang } = useLanguage();
  const map = {
    Normal: "bg-primary/10 text-primary",
    Moderate: "bg-warn/10 text-warn",
    Severe: "bg-danger/10 text-danger",
    Extreme: "bg-[#7A1F13]/10 text-[#7A1F13]",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${lang === "ur" ? "i18n-ur" : ""} ${map[level] || "bg-line text-ink/60"}`}>
      {severityKeyMap[level] ? t(severityKeyMap[level]) : level}
    </span>
  );
}

export function StatusBadge({ status }) {
  const { t, lang } = useLanguage();
  const map = {
    Delivered: "bg-primary/10 text-primary",
    "Under Review": "bg-warn/10 text-warn",
    Forwarded: "bg-info/10 text-info",
    Resolved: "bg-primary/10 text-primary",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${lang === "ur" ? "i18n-ur" : ""} ${map[status] || "bg-line text-ink/60"}`}>
      {statusKeyMap[status] ? t(statusKeyMap[status]) : status}
    </span>
  );
}