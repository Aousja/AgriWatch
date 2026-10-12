import { useEffect, useState } from "react";
import { useTour } from "./TourContext";
import { X } from "lucide-react";
import { addRipple } from "../utils/ripple";

export default function TourOverlay() {
  const { activeRole, stepIndex, next, back, endTour } = useTour();
  const [rect, setRect] = useState(null);

  const step = activeRole?.steps[stepIndex];

  useEffect(() => {
    if (!step) {
      setRect(null);
      return;
    }
    function measure() {
      const el = document.querySelector(step.selector);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    }
    measure();
    window.addEventListener("resize", measure);
    const t = setTimeout(measure, 50); // allow layout to settle
    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(t);
    };
  }, [step]);

  if (!activeRole || !step) return null;

  const pad = 8;
  const spotlightStyle = rect
    ? {
        position: "fixed",
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        borderRadius: 12,
        boxShadow: "0 0 0 9999px rgba(10, 14, 8, 0.65)",
        transition: "all 0.25s ease",
        pointerEvents: "none",
        zIndex: 300,
      }
    : {
        position: "fixed",
        inset: 0,
        background: "rgba(10, 14, 8, 0.65)",
        zIndex: 300,
      };

  // Position the tooltip near the spotlighted element, falling back to
  // center-screen if there's nothing to anchor to.
  const tooltipStyle = rect
    ? {
        position: "fixed",
        top: Math.min(rect.bottom + pad + 12, window.innerHeight - 220),
        left: Math.min(Math.max(rect.left, 16), window.innerWidth - 336),
        zIndex: 301,
      }
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 301,
      };

  const isLast = stepIndex === activeRole.steps.length - 1;

  return (
    <>
      <div style={spotlightStyle} aria-hidden="true" />
      <div
        style={tooltipStyle}
        role="dialog"
        aria-modal="true"
        aria-label="Guided tour"
        className="bg-surface rounded-xl shadow-2xl p-4 w-80 max-w-[90vw]"
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="font-display font-semibold text-sm">{step.title}</p>
          <button onClick={endTour} aria-label="Skip tour" className="text-ink/35 hover:text-ink/70 shrink-0">
            <X size={15} />
          </button>
        </div>
        <p className="text-sm text-ink/60 leading-relaxed">{step.body}</p>

        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-1">
            {activeRole.steps.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${i === stepIndex ? "bg-primary" : "bg-line"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <button onClick={back} onMouseDown={addRipple} className="btn-animated text-xs font-medium text-ink/55 px-2.5 py-1.5 hover:text-ink">
                Back
              </button>
            )}
            <button
              onClick={next}
              onMouseDown={addRipple}
              className="btn-animated text-xs font-medium bg-primary text-white rounded-lg px-3 py-1.5 hover:bg-primary-light"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
