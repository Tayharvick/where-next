// Town facts framework — shared by UI, research API, and future facts endpoints.
// Static towns in lib/data.js do not include facts; they arrive via API or enrichment later.

/** @typedef {"schools"|"crime"|"population"|"income"|"walkability"|"internet"|"weather"|"propertyTax"} FactKey */

/** @typedef {{ schools?: string, crime?: string, population?: string, income?: string, walkability?: string, internet?: string, weather?: string, propertyTax?: string }} TownFacts */

export const PENDING_LABEL = "Coming soon";

export const FACT_FIELDS = [
  { key: "schools", label: "Schools", icon: "school", hint: "Rating or short qualitative label" },
  { key: "crime", label: "Crime", icon: "shield", hint: "Lower | Average | Higher vs state avg" },
  { key: "population", label: "Population", icon: "people", hint: "~00,000" },
  { key: "income", label: "Median income", icon: "income", hint: "$00k median" },
  { key: "walkability", label: "Walkability", icon: "walk", hint: "Walkable | Mixed | Car-dependent" },
  { key: "internet", label: "Internet", icon: "wifi", hint: "Fiber + cable — short label" },
  { key: "weather", label: "Weather", icon: "weather", hint: "One short phrase" },
  { key: "propertyTax", label: "Property tax", icon: "tax", hint: "Low | Moderate | High" },
];

/** @type {FactKey[]} */
export const FACT_KEYS = FACT_FIELDS.map((f) => f.key);

export function popFromSub(sub) {
  if (!sub) return null;
  const m = sub.match(/pop\.?\s*~?\s*([\d,]+)/i);
  return m ? `~${m[1]}` : null;
}

/**
 * Resolve a single fact for display. API `town.facts` wins; population may fall back to `sub`.
 * @param {{ facts?: TownFacts, sub?: string }} town
 * @param {FactKey} key
 * @returns {string|null}
 */
export function getFactValue(town, key) {
  const v = town.facts?.[key];
  if (v != null && String(v).trim()) return String(v).trim();
  if (key === "population") return popFromSub(town.sub);
  return null;
}

/**
 * All facts formatted for card UI.
 * @param {{ facts?: TownFacts, sub?: string }} town
 */
export function getTownFactsDisplay(town) {
  return FACT_FIELDS.map(({ key, label, icon }) => {
    const value = getFactValue(town, key);
    return {
      key,
      label,
      icon,
      value: value || PENDING_LABEL,
      pending: !value,
    };
  });
}

/** JSON schema fragment for research prompts. */
export function factsSchemaJson() {
  return `{
        "schools": "7/10 or B+ — short label only",
        "crime": "Lower | Average | Higher — qualitative vs state avg, no raw FBI stats",
        "population": "~00,000",
        "income": "$00k median",
        "walkability": "Walkable | Mixed | Car-dependent",
        "internet": "Fiber + cable — short label",
        "weather": "Hot humid summers — one short phrase",
        "propertyTax": "Low | Moderate | High"
      }`;
}

/** Prompt rules for populating facts during live research. */
export const FACTS_PROMPT_RULES = [
  '"facts" must be populated for every town. Use researched values; qualitative labels where precise scores aren\'t reliable.',
  "Crime: compare to state average, never cite a single FBI number.",
];
