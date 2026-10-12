import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.jpeg";
import {
  Satellite, Sprout, Users2, ShieldCheck, ArrowRight, MapPinned,
  MessageSquareWarning, Languages, Radio, Eye, Droplets, Leaf, CloudRain,
} from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import ThemeToggle from "../components/ThemeToggle";
import { addRipple } from "../utils/ripple";
import { clearPortalAccess } from "../utils/authAccess";
import pakistanOutline from "../assets/pakistan-outline.png";
import "./home.css";

const platformKeys = [
  { icon: ShieldCheck, titleKey: "platformWebTitle", bodyKey: "platformWebBody" },
  { icon: Radio, titleKey: "platformMobileAdminTitle", bodyKey: "platformMobileAdminBody" },
  { icon: Languages, titleKey: "platformMobileAppTitle", bodyKey: "platformMobileAppBody" },
];

const roleCardKeys = [
  { icon: Sprout, titleKey: "cardFarmerTitle", bodyKey: "cardFarmerBody", to: "/login" },
  { icon: Users2, titleKey: "cardPublicTitle", bodyKey: "cardPublicBody", to: "/login" },
  { icon: ShieldCheck, titleKey: "cardAdminTitle", bodyKey: "cardAdminBody", to: "/login" },
];

const featureKeys = [
  { icon: MapPinned, titleKey: "featurePrecisionTitle", bodyKey: "featurePrecisionBody" },
  { icon: MessageSquareWarning, titleKey: "featureCommTitle", bodyKey: "featureCommBody" },
  { icon: Languages, titleKey: "featureUrduTitle", bodyKey: "featureUrduBody" },
];

const dataSources = ["Sentinel-2 (NDVI)", "CHIRPS (SPI-3)", "NASA SMAP (Soil Moisture)", "ERA5 (SPEI)", "OpenWeatherMap"];

/* ---------- helpers ---------- */

// Adds .hm-in once the element scrolls into view.
function Reveal({ children, delay = 0, className = "", as: Tag = "div" }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { el.classList.add("hm-in"); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add("hm-in"); io.disconnect(); }
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`hm-reveal ${className}`} style={{ "--d": `${delay}ms` }}>{children}</Tag>;
}

// Counts from 0 to `to` when scrolled into view.
function CountUp({ to, suffix = "", prefix = "", duration = 1600 }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) { setVal(to); return; }
    let raf;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * to));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, duration]);
  return <span ref={ref} dir="ltr">{prefix}{val}{suffix}</span>;
}

// Mouse-follow spotlight + subtle 3D tilt for cards.
function useCardFx() {
  return {
    onMouseMove: (e) => {
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", `${x * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
      el.style.setProperty("--ry", `${(x - 0.5) * 7}deg`);
      el.style.setProperty("--rx", `${(0.5 - y) * 7}deg`);
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.setProperty("--rx", "0deg");
      e.currentTarget.style.setProperty("--ry", "0deg");
    },
  };
}

/* ---------- hero visual: animated Pakistan scan ---------- */

const scanPoints = [
  { left: "59%", top: "25%", c: "var(--color-primary-light)", d: 450, label: "GB" },
  { left: "51%", top: "38%", c: "var(--color-accent)", d: 700, label: "KPK" },
  { left: "58%", top: "43%", c: "var(--color-primary-light)", d: 900, label: "ISB" },
  { left: "62%", top: "56%", c: "var(--color-primary-light)", d: 1080, label: "Punjab" },
  { left: "37%", top: "58%", c: "var(--color-danger)", d: 1260, label: "Balochistan" },
  { left: "46%", top: "77%", c: "var(--color-accent)", d: 1440, label: "Sindh" },
];

function PakistanScanCard({ t }) {
  return (
    <div className="hm-pak-card" dir="ltr">
      <div className="hm-pak-glow" />
      <div className="hm-orbit hm-orbit-1" />
      <div className="hm-orbit hm-orbit-2" />

      <div className="hm-scan-header">
        <div>
          <div className="hm-scan-kicker"><span className="hm-live-dot" /> GEOAI LIVE SCAN</div>
          <h3>Pakistan Drought Intelligence</h3>
        </div>
        <div className="hm-satellite-badge"><Satellite size={18} /></div>
      </div>

      <div className="hm-pak-stage">
        <div className="hm-scan-line"><span /></div>
        <div className="hm-scan-haze" />
        <div className="hm-satellite-orbit">
          <div className="hm-satellite"><Satellite size={16} /></div>
        </div>
        <div className="hm-pak-map-wrap" role="img" aria-label="Pakistan drought monitoring map">
          <img
            src={pakistanOutline}
            alt=""
            aria-hidden="true"
            className="hm-pak-outline-img"
          />
          <div className="hm-pak-map-fill" />
          {scanPoints.map((p, i) => (
            <span
              key={p.label}
              className="hm-map-point hm-map-point-html"
              title={p.label}
              style={{ left: p.left, top: p.top, "--d": `${p.d}ms`, "--point-color": p.c }}
            >
              <i className="hm-pulse-ring-html" />
              <i className="hm-pin-html" />
              {i === 2 && <i className="hm-point-halo" />}
            </span>
          ))}
        </div>

        <div className="hm-scan-status hm-scan-status-a">
          <Leaf size={13} /> <span>NDVI</span><b>0.61</b>
        </div>
        <div className="hm-scan-status hm-scan-status-b">
          <Droplets size={13} /> <span>SOIL</span><b>34%</b>
        </div>
        <div className="hm-scan-status hm-scan-status-c">
          <CloudRain size={13} /> <span>RAIN</span><b>42 mm</b>
        </div>
      </div>

      <div className="hm-scan-footer">
        <span><i className="hm-scan-dot" /> Monitoring active</span>
        <span>Satellite + ML</span>
        <span>{t("districtsMonitoredStrip")}</span>
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function Home() {
  const { t, lang } = useLanguage();
  const fx = useCardFx();
  const progressRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  // Returning to the public landing page ends the active portal grant.
  // The Supabase session may still exist briefly, but protected portal routes
  // will require the user to authenticate again from /login.
  useEffect(() => {
    clearPortalAccess();
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${max > 0 ? h.scrollTop / max : 0})`;
        setScrolled(h.scrollTop > 8);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div dir={lang === "ur" ? "rtl" : undefined} className={`min-h-screen bg-paper overflow-x-clip ${lang === "ur" ? "i18n-ur" : ""}`}>
      <div ref={progressRef} className="hm-progress" />

      {/* Nav */}
      <nav className={`hm-nav ${scrolled ? "is-scrolled" : ""} sticky top-0 z-40 bg-paper/80 backdrop-blur-md border-b border-line px-6 sm:px-10 py-3.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="AgriWatch Pakistan" className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/30" />
          <span className="font-display font-semibold text-sm">AgriWatch Pakistan</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          <ThemeToggle />
          <LanguageToggle />
          <Link to="/guest" className="hidden sm:block text-sm font-medium text-ink/60 hover:text-ink transition-colors">{t("viewAsGuest")}</Link>
          <Link to="/login" onMouseDown={addRipple} className="btn-animated bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-light transition-colors">
            {t("login")}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="hm-hero relative px-6 sm:px-10 max-w-7xl mx-auto">
        <div className="hm-dots" />
        <div className="hm-blob hm-blob-1" />
        <div className="hm-blob hm-blob-2" />

        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-10 xl:gap-16 items-center">
          <div>
            <p className="hm-hero-item inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-primary font-semibold mb-5 px-3 py-1.5 rounded-full border border-primary/25 bg-primary/5" style={{ "--d": "50ms" }}>
              <Satellite size={14} /> {t("fypLabel")}
            </p>
            <h1 className="hm-hero-item font-display text-4xl sm:text-5xl lg:text-[3.15rem] xl:text-[3.5rem] font-semibold leading-[1.05]" style={{ "--d": "180ms" }}>
              {t("heroHeadline1")} <span className="hm-gradient-text">{t("heroHeadline2")}</span>
            </h1>
            <p className="hm-hero-item text-ink/60 mt-6 max-w-xl leading-relaxed" style={{ "--d": "320ms" }}>
              {t("heroBody")}
            </p>
            <div className="hm-hero-item flex flex-wrap gap-3 mt-9" style={{ "--d": "460ms" }}>
              <Link to="/login" onMouseDown={addRipple} className="btn-animated btn-pulse flex items-center gap-2 bg-forest text-white px-6 py-3.5 rounded-xl text-sm font-medium hover:bg-forest-light transition-colors">
                {t("openDashboard")} <ArrowRight size={15} className="rtl:rotate-180" />
              </Link>
              <Link to="/guest" onMouseDown={addRipple} className="btn-animated flex items-center gap-2 bg-surface border border-line px-6 py-3.5 rounded-xl text-sm font-medium hover:bg-paper-dim transition-colors">
                <Eye size={15} /> {t("previewNoAccount")}
              </Link>
            </div>
          </div>

          <div className="hm-hero-item lg:pl-4" style={{ "--d": "400ms" }}>
            <PakistanScanCard t={t} />
          </div>
        </div>
      </header>

      {/* Data sources marquee */}
      <section className="border-y border-line bg-surface/60 py-4">
        <div className="hm-marquee" dir="ltr">
          <div className="hm-marquee-track text-xs text-ink/50 font-mono">
            {[...dataSources, ...dataSources, ...dataSources, ...dataSources].map((d, i) => (
              <span key={i} className="flex items-center gap-3 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {d}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Problem stats */}
      <section className="hm-stats px-6 sm:px-10 py-20 text-mist">
        <div className="relative z-10 max-w-6xl mx-auto">
          <Reveal>
            <p className="text-xs uppercase tracking-widest text-primary-light font-semibold mb-8">{t("problemLabel")}</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { node: <CountUp to={19} suffix="%" />, key: "statGdp" },
              { node: <CountUp to={38} suffix="%" />, key: "statWorkforce" },
              { node: <CountUp to={10} prefix="Top " />, key: "statVulnerable" },
            ].map((s, i) => (
              <Reveal key={s.key} delay={i * 120}>
                <div className="hm-stat-card rounded-2xl p-6 h-full">
                  <p className="font-display text-5xl font-semibold text-mist">{s.node}</p>
                  <p className="text-mist/65 text-sm mt-3">{t(s.key)}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={150}>
            <p className="text-mist/75 text-sm mt-10 max-w-2xl leading-relaxed">{t("problemBody")}</p>
          </Reveal>
        </div>
      </section>

      {/* Solution — three platforms */}
      <section className="px-6 sm:px-10 py-20 max-w-6xl mx-auto">
        <Reveal>
          <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">{t("solutionLabel")}</p>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-12">{t("solutionHeading")}</h2>
        </Reveal>
        <div className="hm-connector grid grid-cols-1 md:grid-cols-3 gap-6">
          {platformKeys.map((p, i) => (
            <Reveal key={p.titleKey} delay={i * 120}>
              <div {...fx} className="hm-card border border-line rounded-2xl p-6 bg-surface h-full">
                <div className="hm-icon w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <p.icon size={20} className="text-primary" />
                </div>
                <p className="font-display font-semibold mb-2">{t(p.titleKey)}</p>
                <p className="text-sm text-ink/55 leading-relaxed">{t(p.bodyKey)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Role selection */}
      <section className="px-6 sm:px-10 py-20 bg-paper-dim">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">{t("getStartedLabel")}</p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-12">{t("getStartedHeading")}</h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roleCardKeys.map((r, i) => (
              <Reveal key={r.titleKey} delay={i * 120}>
                <Link
                  to={r.to}
                  {...fx}
                  className="hm-card group border border-line rounded-2xl p-6 bg-surface flex flex-col h-full"
                >
                  <div className="hm-icon w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary transition-colors">
                    <r.icon size={20} className="text-primary group-hover:text-white transition-colors" />
                  </div>
                  <p className="font-display font-semibold mb-2">{t(r.titleKey)}</p>
                  <p className="text-sm text-ink/55 leading-relaxed flex-1">{t(r.bodyKey)}</p>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-primary mt-5">
                    {t("continueCta")} <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-1.5" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="px-6 sm:px-10 py-20 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
        {featureKeys.map((f, i) => (
          <Reveal key={f.titleKey} delay={i * 120} className="flex gap-4">
            <div className="shrink-0 w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
              <f.icon size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{t(f.titleKey)}</p>
              <p className="text-sm text-ink/50 mt-1 leading-relaxed">{t(f.bodyKey)}</p>
            </div>
          </Reveal>
        ))}
      </section>

      {/* Closing CTA */}
      <section className="px-6 sm:px-10 pb-20">
        <Reveal className="max-w-6xl mx-auto">
          <div className="hm-stats rounded-3xl px-8 py-12 sm:py-14 text-center text-mist">
            <p className="relative z-10 font-display text-2xl sm:text-3xl font-semibold max-w-2xl mx-auto">
              {t("heroHeadline1")}
            </p>
            <div className="relative z-10 flex flex-wrap justify-center gap-3 mt-8">
              <Link to="/login" onMouseDown={addRipple} className="btn-animated flex items-center gap-2 bg-accent text-ink px-6 py-3.5 rounded-xl text-sm font-semibold">
                {t("openDashboard")} <ArrowRight size={15} className="rtl:rotate-180" />
              </Link>
              <Link to="/guest" onMouseDown={addRipple} className="btn-animated flex items-center gap-2 border border-white/25 text-mist px-6 py-3.5 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors">
                <Eye size={15} /> {t("previewNoAccount")}
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="hm-footer px-6 sm:px-10 py-8 text-mist/55 text-xs flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <img src={logo} alt="" className="w-6 h-6 rounded-full object-cover" /> {t("footerProject")}
        </span>
        <span className="font-mono tracking-widest">{t("tagline")}</span>
      </footer>
    </div>
  );
}
