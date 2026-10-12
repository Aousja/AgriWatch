import { useEffect, useState } from "react";

// Simulates a network fetch delay so pages don't just snap-render dummy
// data instantly — makes the app feel like it's actually talking to a
// backend. Swap this out for a real loading state once data is live.
export function useSimulatedLoading(delay = 550) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return loading;
}
