import { createContext, useContext, useEffect, useState } from "react";

const TourContext = createContext(null);

function seenKey(role) {
  return `agriwatch_tour_seen_${role}`;
}

export function TourProvider({ children }) {
  const [activeRole, setActiveRole] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);

  function startTour(role, steps) {
    setActiveRole({ role, steps });
    setStepIndex(0);
  }

  function maybeStartTour(role, steps) {
    try {
      if (!localStorage.getItem(seenKey(role))) {
        startTour(role, steps);
      }
    } catch {
      // storage unavailable — just skip auto-start, tour can still be
      // triggered manually via startTour
    }
  }

  function next() {
    setStepIndex((i) => {
      if (!activeRole) return i;
      if (i + 1 >= activeRole.steps.length) {
        endTour();
        return i;
      }
      return i + 1;
    });
  }

  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function endTour() {
    if (activeRole) {
      try {
        localStorage.setItem(seenKey(activeRole.role), "1");
      } catch {
        // ignore
      }
    }
    setActiveRole(null);
    setStepIndex(0);
  }

  return (
    <TourContext.Provider value={{ activeRole, stepIndex, startTour, maybeStartTour, next, back, endTour }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}
