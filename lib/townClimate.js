import fs from "fs/promises";
import path from "path";
import { geocodeTown } from "@/lib/townLocation";

const CACHE_DIR = path.join(process.cwd(), ".cache", "climate");
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const USER_AGENT = "WhereNext/1.0 (relocation scout; contact: hello@wherenext.app)";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function cacheKey(townId, stateAbbr) {
  const safe = (townId || "town").replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  return `${safe}_${(stateAbbr || "xx").toLowerCase()}_v3.json`;
}

async function readCache(key) {
  try {
    const raw = await fs.readFile(path.join(CACHE_DIR, key), "utf8");
    const data = JSON.parse(raw);
    if (Date.now() - data.cachedAt > CACHE_TTL_MS) return null;
    return data.payload;
  } catch {
    return null;
  }
}

async function writeCache(key, payload) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(
      path.join(CACHE_DIR, key),
      JSON.stringify({ cachedAt: Date.now(), payload }, null, 0),
      "utf8"
    );
  } catch {}
}

function cToF(c) {
  return Math.round((c * 9) / 5 + 32);
}

function mmToIn(mm) {
  return Math.round((mm / 25.4) * 10) / 10;
}

function avg(nums) {
  const v = nums.filter((n) => n != null && Number.isFinite(n));
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function townBlob(t) {
  return [
    t.hook,
    t.never,
    t.cost,
    t.sub,
    t.facts?.weather,
    ...(t.watch || []),
    ...(t.why || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

async function fetchClimateNormals(lat, lon) {
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("start_date", "2023-01-01");
  url.searchParams.set("end_date", "2023-12-31");
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration,wind_speed_10m_max,uv_index_max"
  );
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.daily?.time?.length) return null;
  return data.daily;
}

function aggregateMonthly(daily) {
  /** @type {Array<{ highs: number[], lows: number[], precip: number[], sunshine: number[], wind: number[], uv: number[], snowDays: number, sunnyDays: number }>} */
  const buckets = Array.from({ length: 12 }, () => ({
    highs: [],
    lows: [],
    precip: [],
    sunshine: [],
    wind: [],
    uv: [],
    snowDays: 0,
    sunnyDays: 0,
  }));

  for (let i = 0; i < daily.time.length; i++) {
    const month = new Date(`${daily.time[i]}T12:00:00`).getMonth();
    const b = buckets[month];
    if (daily.temperature_2m_max?.[i] != null) b.highs.push(daily.temperature_2m_max[i]);
    if (daily.temperature_2m_min?.[i] != null) b.lows.push(daily.temperature_2m_min[i]);
    if (daily.precipitation_sum?.[i] != null) b.precip.push(daily.precipitation_sum[i]);
    if (daily.sunshine_duration?.[i] != null) b.sunshine.push(daily.sunshine_duration[i]);
    if (daily.wind_speed_10m_max?.[i] != null) b.wind.push(daily.wind_speed_10m_max[i]);
    if (daily.uv_index_max?.[i] != null) b.uv.push(daily.uv_index_max[i]);
    if (daily.temperature_2m_max?.[i] <= 2 && daily.precipitation_sum?.[i] > 1) b.snowDays += 1;
    if (daily.sunshine_duration?.[i] > 3600) b.sunnyDays += 1;
  }

  return buckets.map((b, idx) => ({
    month: MONTHS[idx],
    highF: avg(b.highs) != null ? cToF(avg(b.highs)) : null,
    lowF: avg(b.lows) != null ? cToF(avg(b.lows)) : null,
    precipIn: b.precip.length ? mmToIn(b.precip.reduce((s, v) => s + v, 0)) : null,
    sunshineHours: b.sunshine.length
      ? Math.round(b.sunshine.reduce((s, v) => s + v, 0) / 3600)
      : null,
    windKmh: avg(b.wind) != null ? Math.round(avg(b.wind)) : null,
    uv: avg(b.uv) != null ? Math.round(avg(b.uv) * 10) / 10 : null,
    snowDays: b.snowDays,
    sunnyDays: b.sunnyDays,
  }));
}

function classifyClimate(monthly, lat, lon, blob) {
  const highs = monthly.map((m) => m.highF).filter(Number.isFinite);
  const lows = monthly.map((m) => m.lowF).filter(Number.isFinite);
  const annualHigh = Math.max(...highs);
  const annualLow = Math.min(...lows);
  const swing = annualHigh - annualLow;
  const summerHigh = avg(monthly.slice(5, 8).map((m) => m.highF));
  const winterLow = avg(monthly.slice(11, 12).concat(monthly.slice(0, 2)).map((m) => m.lowF));

  /** @type {Array<{ icon: string, text: string }>} */
  const highlights = [];

  if (/desert|arid|113|scottsdale|phoenix orbit|pinal|sun belt heat/i.test(blob) || (summerHigh > 95 && swing > 45)) {
    highlights.push({ icon: "🌵", text: "Desert / arid climate" });
  } else if (Math.abs(lat) < 28 && summerHigh > 88) {
    highlights.push({ icon: "🌴", text: "Humid subtropical / warm year-round" });
  } else if (lat > 42 && swing > 55) {
    highlights.push({ icon: "❄️", text: "Cold winters with real seasonal change" });
  } else if (/appalachian|ozark|foothill|mountain|elevation/i.test(blob) || (lat > 35 && lat < 42 && swing > 48)) {
    highlights.push({ icon: "⛰️", text: "Mountain / foothill climate" });
  } else if (swing >= 38) {
    highlights.push({ icon: "🍂", text: "Four distinct seasons" });
  } else {
    highlights.push({ icon: "☀️", text: "Moderate seasonal variation" });
  }

  if (/humid|humidity|muggy/i.test(blob)) {
    highlights.push({ icon: "💧", text: "Humid summers are common" });
  } else if (summerHigh > 95 && swing > 40) {
    highlights.push({ icon: "💧", text: "Dry air — low humidity most of the year" });
  } else if (monthly.some((m) => m.precipIn > 3)) {
    highlights.push({ icon: "💧", text: "Moderate humidity through much of the year" });
  }

  const avgWind = avg(monthly.map((m) => m.windKmh).filter(Number.isFinite));
  if (avgWind != null) {
    if (avgWind >= 22) highlights.push({ icon: "🌬️", text: `Prevailing breezes ~${Math.round(avgWind * 0.62)} mph` });
    else highlights.push({ icon: "🌬️", text: "Generally light to moderate winds" });
  }

  const sunnyDays = monthly.reduce((sum, m) => sum + (m.sunnyDays || 0), 0);
  if (sunnyDays > 180) {
    highlights.push({ icon: "☀️", text: `~${sunnyDays} sunny days annually` });
  } else if (sunnyDays > 0) {
    const totalSunHours = monthly.reduce((s, m) => s + (m.sunshineHours || 0), 0);
    if (totalSunHours > 2400) highlights.push({ icon: "☀️", text: `${Math.round(totalSunHours / 100) * 100}+ sunshine hours per year` });
  }

  let climateType = "moderate";
  if (/desert|arid|113|scottsdale|phoenix orbit|pinal|sun belt heat/i.test(blob) || (summerHigh > 95 && swing > 45)) {
    climateType = "desert";
  } else if (Math.abs(lat) < 28 && summerHigh > 88 && winterLow > 52) {
    climateType = "tropical";
  } else if (lat > 42 && swing > 55) {
    climateType = "northern";
  } else if (/appalachian|ozark|foothill|mountain|elevation/i.test(blob) || (lat > 35 && lat < 42 && swing > 48)) {
    climateType = "mountain";
  } else if (swing >= 38) {
    climateType = "fourSeason";
  }

  return {
    highlights: highlights.slice(0, 4),
    annualHigh,
    annualLow,
    swing,
    summerHigh,
    winterLow,
    climateType,
    sunnyDays,
    snowDays: monthly.reduce((s, m) => s + (m.snowDays || 0), 0),
    annualPrecipIn: monthly.reduce((s, m) => s + (m.precipIn || 0), 0),
  };
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function trimWords(text, maxWords) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ").replace(/[,;—–-]+$/, "")}.`;
}

function buildClimateSnapshot(meta, geo, blob) {
  const coastal = /coastal|ocean|sea|gulf|atlantic|pacific|lakefront|harbor|beach|shore|sound|bay/i.test(blob);
  const humid = /humid|humidity|muggy/i.test(blob);
  const hurricane = /hurricane/i.test(blob);
  const wildfire = /wildfire|smoke/i.test(blob);
  const monsoon = /monsoon/i.test(blob);
  const { summerHigh, winterLow, swing, climateType, sunnyDays, snowDays, annualPrecipIn } = meta;

  /** @type {string} */
  let text = "";

  if (climateType === "desert") {
    text =
      "Expect abundant sunshine, very little rainfall, and extremely hot summers balanced by mild winters. Outdoor living is excellent for much of the year, but peak summer heat shapes daily routines.";
    if (wildfire) {
      text =
        "Expect abundant sunshine, very little rainfall, and extremely hot summers balanced by mild winters. Outdoor life is strong in shoulder seasons, though peak heat and occasional wildfire smoke shape summer days.";
    }
  } else if (climateType === "tropical") {
    text =
      "Warm temperatures persist year-round with tropical humidity, frequent summer rain showers, and virtually no winter. Hurricane season is an important part of the annual weather cycle.";
    if (!hurricane && !coastal) {
      text =
        "Warm temperatures persist year-round with tropical humidity and frequent summer rain showers, with little meaningful winter cold. Daily life revolves around shade, A/C, and afternoon storm patterns.";
    }
  } else if (climateType === "mountain") {
    text =
      "Mild summers, crisp autumns, and occasional winter snowfall create a classic four-season climate. Elevation keeps temperatures noticeably cooler than surrounding regions.";
    if (snowDays >= 12) {
      text =
        "Mild summers, crisp autumns, and regular winter snowfall create a classic four-season climate. Elevation keeps things cooler — weather can shift quickly, and winter driving deserves respect.";
    }
  } else if (climateType === "northern" && coastal) {
    text =
      "Four distinct seasons with cool summers, colorful autumns, snowy winters, and refreshing sea breezes. Winters are long, but many residents consider the seasonal variety worth it.";
  } else if (climateType === "northern") {
    text =
      "Four distinct seasons with warm summers, vivid autumns, and cold, snowy winters. Heating costs and winter maintenance are part of everyday life, but the seasonal rhythm feels genuine.";
    if (snowDays < 8) {
      text =
        "Four distinct seasons with warm summers, vivid autumns, and cold winters that can still bite. Layered clothing and a reliable heating system matter more here than in milder climates.";
    }
  } else if (climateType === "fourSeason" && humid && summerHigh > 88) {
    text =
      "Four distinct seasons with warm, humid summers and cool winters — spring and fall often feel like the sweet spot. Air conditioning runs hard in July and August, but the rest of the year is comfortable for outdoor life.";
  } else if (climateType === "fourSeason") {
    text =
      "Four distinct seasons with warm summers, colorful autumns, and cool winters that rarely feel extreme. Most of the year supports everyday outdoor life without weather dominating your schedule.";
    if (snowDays >= 10) {
      text =
        "Four distinct seasons with warm summers, colorful autumns, and snowy winters that require real preparation. Spring and fall are often the most comfortable months for being outside.";
    }
  } else if (summerHigh > 92 && annualPrecipIn < 20) {
    text =
      "Long stretches of sunshine, dry air, and hot summers paired with mild winters define daily life here. Peak heat limits midday outdoor activity, but evenings and cooler months feel wide open.";
  } else if (humid && summerHigh > 85) {
    text =
      "Warm, humid summers and mild winters mean air conditioning and dehumidifiers do real work. Mornings and evenings are the best windows for outdoor errands and exercise.";
    if (monsoon) {
      text =
        "Warm, humid summers bring afternoon storms and monsoon bursts, while winters stay mild. Daily plans often account for sudden rain and the intensity of midday heat.";
    }
  } else if (sunnyDays > 280 && annualPrecipIn < 25) {
    text =
      "Sunshine dominates much of the year with modest rainfall and clear seasonal temperature swings. Outdoor plans are easy to make, though summer heat still commands respect.";
  } else {
    text =
      "Seasonal temperature shifts are moderate rather than dramatic, with enough variety to mark the year without extreme swings. Most months support ordinary outdoor routines without special planning.";
  }

  if (hurricane && climateType !== "tropical") {
    text = trimWords(
      `${text.replace(/\.$/, "")}. Hurricane season remains a factor worth weighing before you commit.`,
      58
    );
  } else if (wildfire && climateType !== "desert") {
    text = trimWords(
      `${text.replace(/\.$/, "")}. Wildfire smoke can affect air quality in drier months.`,
      58
    );
  }

  const words = wordCount(text);
  if (words < 30) {
    text = `${text.replace(/\.$/, "")}. Weather patterns here are steady enough to learn quickly once you have a season under your belt.`;
  }
  if (wordCount(text) > 60) text = trimWords(text, 60);

  return text;
}

function buildStats(monthly, meta, blob) {
  /** @type {Array<{ label: string, value: string }>} */
  const stats = [];

  const annualPrecipIn = monthly.reduce((s, m) => s + (m.precipIn || 0), 0);
  if (annualPrecipIn > 0) {
    stats.push({ label: "Annual precipitation", value: `${Math.round(annualPrecipIn * 10) / 10}"` });
  }

  const snowDays = monthly.reduce((s, m) => s + (m.snowDays || 0), 0);
  if (snowDays >= 5) {
    stats.push({ label: "Average snowfall", value: snowDays >= 20 ? "Significant" : "Moderate" });
  } else if (meta.winterLow != null && meta.winterLow < 28 && snowDays > 0) {
    stats.push({ label: "Average snowfall", value: "Light" });
  }

  const sunnyEstimate = monthly.reduce((sum, m) => sum + (m.sunnyDays || 0), 0);
  if (sunnyEstimate > 120) {
    stats.push({ label: "Sunny days per year", value: `~${sunnyEstimate}` });
  }

  if (/hurricane|tornado|wildfire|severe|113|storm|flood|ice storm/i.test(blob)) {
    if (/hurricane/i.test(blob)) stats.push({ label: "Severe weather risk", value: "Hurricane exposure" });
    else if (/wildfire/i.test(blob)) stats.push({ label: "Severe weather risk", value: "Wildfire season" });
    else if (/tornado|severe storm/i.test(blob)) stats.push({ label: "Severe weather risk", value: "Storm season" });
    else stats.push({ label: "Severe weather risk", value: "Elevated" });
  } else if (meta.summerHigh > 100) {
    stats.push({ label: "Severe weather risk", value: "Extreme heat" });
  }

  const avgUv = avg(monthly.map((m) => m.uv).filter(Number.isFinite));
  if (avgUv != null && avgUv >= 4) {
    stats.push({ label: "UV index", value: avgUv >= 7 ? "High" : "Moderate" });
  } else if (meta.swing != null) {
    stats.push({ label: "Temperature range", value: `${meta.annualLow}°–${meta.annualHigh}°F` });
  }

  return stats.slice(0, 5);
}

function buildBestTimes(monthly) {
  const scored = monthly
    .map((m, i) => ({
      i,
      month: m.month,
      score:
        m.highF != null && m.lowF != null
          ? 100 - Math.abs(m.highF - 70) - Math.max(0, 45 - m.lowF) * 0.5 - Math.max(0, m.highF - 85) * 0.8
          : -999,
    }))
    .filter((m) => m.score > -100)
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 4).sort((a, b) => a.i - b.i);
  if (top.length < 2) return null;

  const ranges = [];
  let start = top[0];
  let prev = top[0];
  for (let k = 1; k < top.length; k++) {
    if (top[k].i === prev.i + 1) prev = top[k];
    else {
      ranges.push(start.month === prev.month ? start.month : `${start.month}–${prev.month}`);
      start = top[k];
      prev = top[k];
    }
  }
  ranges.push(start.month === prev.month ? start.month : `${start.month}–${prev.month}`);

  return {
    months: ranges.join(" and "),
    note: "Milder temperatures and lower stress on heating and cooling systems.",
  };
}

function buildThingsToKnow(t, meta, blob) {
  /** @type {string[]} */
  const items = [];

  if (t.facts?.weather) items.push(t.facts.weather.replace(/\.$/, ""));

  if (meta.summerHigh > 92) items.push("Summers run hot — plan for heavy A/C use and outdoor limits midday.");
  if (/humid|muggy/i.test(blob)) items.push("Humidity spikes in summer, which can make heat feel more intense.");
  if (/monsoon|july|august rain/i.test(blob)) items.push("Late-summer monsoon or storm bursts can appear quickly.");
  if (/pollen|allerg/i.test(blob)) items.push("Pollen seasons can be heavy in spring.");
  if (/lake-effect|snow belt/i.test(blob)) items.push("Lake-effect snow can stack up fast in winter.");
  if (/ice storm|ice on/i.test(blob)) items.push("Occasional ice storms disrupt travel in winter.");
  if (meta.winterLow != null && meta.winterLow < 20) items.push("Winters get genuinely cold — not just mild Southern cool snaps.");
  if (/dry winter|low humidity winter/i.test(blob)) items.push("Dry winters are common — skin and static become noticeable.");
  if (/smoke|wildfire/i.test(blob)) items.push("Wildfire smoke season can affect air quality some summers.");
  if (/113|extreme heat|triple-digit/i.test(blob)) items.push("Extreme heat days are part of the annual rhythm, not outliers.");

  return [...new Set(items.map((s) => s.trim()).filter(Boolean))].slice(0, 5);
}

function buildConsiderations(t, blob) {
  /** @type {string[]} */
  const items = [];

  for (const line of t.watch || []) {
    if (/heat|113|humid|wildfire|hurricane|storm|flood|insurance|water|drought|smoke|ice|snow|climate|weather|monsoon|tornado|wind/i.test(line)) {
      items.push(line.replace(/\.$/, ""));
    }
  }

  if (/heat|wildfire/i.test(t.cost || "")) {
    const c = t.cost.replace(/\.$/, "");
    if (!items.some((i) => i.includes(c.slice(0, 20)))) items.push(c);
  }

  if (/insurance|premium/i.test(blob) && !items.some((i) => /insurance/i.test(i))) {
    items.push("Insurance and utility costs often reflect regional climate risk.");
  }

  return [...new Set(items)].slice(0, 5);
}

/**
 * @param {{ id?: string, name?: string, sub?: string, watch?: string[], cost?: string, facts?: object, hook?: string, never?: string, why?: string[] }} town
 * @param {string} [stateAbbr]
 */
export async function resolveTownClimate(town, stateAbbr) {
  const key = cacheKey(town.id || town.name, stateAbbr);
  const cached = await readCache(key);
  if (cached) return cached;

  const geo = await geocodeTown(town, stateAbbr);
  if (!geo) return { ok: false, error: "Could not locate this town" };

  const daily = await fetchClimateNormals(geo.lat, geo.lon);
  if (!daily) return { ok: false, error: "Climate data unavailable" };

  const monthly = aggregateMonthly(daily);
  if (!monthly.some((m) => m.highF != null && m.lowF != null)) {
    return { ok: false, error: "Climate data unavailable" };
  }

  const blob = townBlob(town);
  const meta = classifyClimate(monthly, geo.lat, geo.lon, blob);
  const stats = buildStats(monthly, meta, blob);
  const bestTimes = buildBestTimes(monthly);
  const thingsToKnow = buildThingsToKnow(town, meta, blob);
  const considerations = buildConsiderations(town, blob);
  const snapshot = buildClimateSnapshot(meta, geo, blob);

  const payload = {
    ok: true,
    snapshot,
    monthly: monthly.map(({ month, highF, lowF }) => ({ month, high: highF, low: lowF })),
    highlights: meta.highlights,
    stats,
    bestTimes,
    thingsToKnow,
    considerations,
  };

  await writeCache(key, payload);
  return payload;
}
