import { AlertTriangle } from "lucide-react";
import { addRipple } from "../utils/ripple";

export default function ConfirmDialog({ open, title, body, confirmLabel = "Confirm", tone = "primary", onConfirm, onCancel }) {
  if (!open) return null;

  const toneClasses = tone === "danger"
    ? "bg-danger text-white hover:bg-danger/90"
    : "bg-primary text-white hover:bg-primary-light";

  return (
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="bg-surface rounded-xl max-w-sm w-full shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-warn/10 flex items-center justify-center shrink-0">
            <AlertTriangle size={17} className="text-warn" />
          </div>
          <div className="min-w-0">
            <p id="confirm-dialog-title" className="font-display font-semibold">{title}</p>
            {body && <p className="text-sm text-ink/60 mt-1">{body}</p>}
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <button
            onClick={onCancel}
            onMouseDown={addRipple}
            className="btn-animated text-sm font-medium border border-line rounded-lg px-4 py-2 hover:bg-paper-dim"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            onMouseDown={addRipple}
            className={`btn-animated text-sm font-medium rounded-lg px-4 py-2 transition-colors ${toneClasses}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
