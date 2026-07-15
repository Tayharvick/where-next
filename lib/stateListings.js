// Static outbound state listing URLs — no API, no generation at runtime beyond this map.

import { US } from "@/lib/data";

export const STATE_LISTINGS_PROVIDER = "Redfin";

/** @type {Record<string, string>} */
export const STATE_LISTINGS_URLS = Object.fromEntries(
  Object.entries(US).map(([abbr, name]) => [
    abbr,
    `https://www.redfin.com/state/${name.replace(/ /g, "-")}`,
  ])
);

export function getStateListingsUrl(abbr) {
  return STATE_LISTINGS_URLS[abbr] || null;
}
