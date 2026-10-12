export default function PdmaPageHero({ eyebrow = "PDMA operations", title, copy, stats = [], right = null, children = null }) {
  return (
    <section className="pdma-page-hero">
      <div className="pdma-hero-content">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="pdma-hero-eyebrow">{eyebrow}</span>
            <h2 className="pdma-hero-title">{title}</h2>
            {copy && <p className="pdma-hero-copy">{copy}</p>}
          </div>
          {right && <div className="relative z-[2] shrink-0">{right}</div>}
        </div>

        {stats.length > 0 && (
          <div className="pdma-hero-stats">
            {stats.map((stat, index) => (
              <div key={`${stat.label}-${index}`} className="pdma-hero-stat">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
        )}

        {children && <div className="pdma-hero-actions">{children}</div>}
      </div>
    </section>
  );
}
