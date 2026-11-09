import * as React from "react";

/** Seconds left until `until` (epoch ms), ticking every second; 0 once passed. */
export function useCountdown(until: number | null): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (until === null) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [until]);
  return until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000));
}
