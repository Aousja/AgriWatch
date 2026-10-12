export function SkeletonLine({ className = "" }) {
  return <div className={`skeleton h-4 ${className}`} />;
}

export function SkeletonBlock({ className = "" }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonStatCard() {
  return (
    <div className="bg-surface border border-line rounded-xl p-5 flex flex-col gap-3">
      <div className="skeleton h-3 w-20" />
      <div className="skeleton h-7 w-16" />
      <div className="skeleton h-3 w-24" />
    </div>
  );
}

export function SkeletonTableRows({ rows = 5, cols = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-line last:border-0">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="py-3 pr-4">
              <div className="skeleton h-3.5" style={{ width: `${55 + ((i + j) % 4) * 12}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonCardList({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-surface border border-line rounded-xl p-4 flex items-center gap-3">
          <div className="skeleton w-10 h-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-1/3" />
            <div className="skeleton h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
