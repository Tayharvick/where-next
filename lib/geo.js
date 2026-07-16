// Parse county / state from town.sub and optional state tab abbr.

import { US } from "@/lib/data";

/**
 * @param {{ name?: string, sub?: string }} town
 * @param {string} [stateAbbr] — from state tab (e.g. "FL")
 */
export function parseTownGeo(town, stateAbbr) {
  const sub = (town.sub || "").trim();
  const head = sub.split("·")[0].trim();

  let county = null;
  let state = stateAbbr?.toUpperCase() || null;
  let stateName = state ? US[state] : null;

  const countyComma = head.match(/^(.+?)\s+County,\s*([A-Z]{2})\s*$/i);
  if (countyComma) {
    county = countyComma[1].trim();
    state = countyComma[2].toUpperCase();
    stateName = US[state];
  } else {
    const placeComma = head.match(/^(.+?),\s*([A-Z]{2})\s*$/);
    if (placeComma) {
      state = placeComma[2].toUpperCase();
      stateName = US[state];
    } else if (/^[A-Za-z\s]+$/.test(head) && !head.toLowerCase().includes("county")) {
      const name = head.trim();
      const abbr = Object.entries(US).find(([, n]) => n.toLowerCase() === name.toLowerCase());
      if (abbr) {
        state = abbr[0];
        stateName = abbr[1];
      } else {
        stateName = name;
      }
    } else if (head.toLowerCase().includes("county")) {
      county = head.replace(/\s+county\s*$/i, "").trim();
    }
  }

  return { county, state, stateName, name: town.name || "" };
}

/**
 * Search queries from most specific to broadest (town → county → state).
 * @param {{ name?: string, sub?: string }} town
 * @param {string} [stateAbbr]
 */
export function geoImageQueries(town, stateAbbr) {
  const { county, state, stateName, name } = parseTownGeo(town, stateAbbr);
  const st = stateName || (state ? US[state] : null);

  const queries = [];
  if (name && st) {
    queries.push(`${name} ${st} downtown main street`);
    queries.push(`${name} ${st} historic`);
    queries.push(`${name} ${st} downtown`);
    queries.push(`${name} ${st}`);
  }
  if (name && county && st) {
    queries.push(`${name} ${county} County ${st}`);
  }
  if (county && st) {
    queries.push(`${county} County ${st} landscape`);
    queries.push(`${county} County ${st} scenery`);
    queries.push(`${county} County ${st}`);
  }
  if (st) {
    queries.push(`${st} landscape`);
    queries.push(`${st} scenery`);
  }

  return [...new Set(queries.filter(Boolean))];
}
