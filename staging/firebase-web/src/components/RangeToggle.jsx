import { addRipple } from "../utils/ripple";

export default function RangeToggle({ range, setRange }) {
  return (
    <div className="flex gap-1 bg-paper-dim rounded-lg p-0.5">
      {["6mo", "12mo"].map((r) => (
        <button
          key={r}
          onClick={() => setRange(r)}
          onMouseDown={addRipple}
          className={`btn-animated px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            range === r ? "bg-surface text-ink shadow-sm" : "text-ink/45 hover:text-ink/70"
          }`}
        >
          {r === "6mo" ? "6 months" : "12 months"}
        </button>
      ))}
    </div>
  );
}
