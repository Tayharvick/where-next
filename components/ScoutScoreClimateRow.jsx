"use client";

import { useEffect, useState } from "react";
import ClimateAtAGlance from "@/components/ClimateAtAGlance";

const CACHE_PREFIX = "wn-climate:v1";

export default function ScoutScoreClimateRow({ town, stateAbbr, budget, Scorecard }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);

    const cacheKey = `${CACHE_PREFIX}:${town.id || town.name}:${stateAbbr || ""}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.ok) {
          setData(parsed);
          setLoading(false);
        }
      }
    } catch {}

    (async () => {
      try {
        const res = await fetch("/api/climate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            town: { id: town.id, name: town.name, sub: town.sub, watch: town.watch, cost: town.cost, facts: town.facts, hook: town.hook, never: town.never, why: town.why },
            stateAbbr,
          }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (json.ok) {
          setData(json);
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(json));
          } catch {}
        }
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [town.id, town.name, town.sub, town.watch, town.cost, town.facts, town.hook, town.never, town.why, stateAbbr]);

  const showClimate = loading || data?.ok;

  return (
    <section className="scout-score-section" aria-label="Scout Score and Climate">
      <Scorecard t={town} budget={budget} />
      {showClimate && <ClimateAtAGlance data={data} loading={loading} />}
    </section>
  );
}
