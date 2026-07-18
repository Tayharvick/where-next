import fs from "fs/promises";
import path from "path";
import { geocodeTown, haversineMi, estimateDriveTime } from "@/lib/townLocation";
import { parseTownGeo } from "@/lib/geo";

const CACHE_DIR = path.join(process.cwd(), ".cache", "education");
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const USER_AGENT = "WhereNext/1.0 (relocation scout; contact: hello@wherenext.app)";

const PRIVATE_RADIUS_MI = 40;
const FEATURED_PUBLIC_MAX = 3;
const PRIVATE_MAX = 3;

function cacheKey(townId, stateAbbr) {
  const safe = (townId || "town").replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  return `${safe}_${(stateAbbr || "xx").toLowerCase()}_v2.json`;
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

async function runOverpass(query) {
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(35000),
      });
      const text = await res.text();
      if (!text.trim().startsWith("{")) continue;
      return JSON.parse(text)?.elements || [];
    } catch {
      continue;
    }
  }
  return [];
}

function elementCenter(el) {
  if (el.lat != null && el.lon != null) return { lat: el.lat, lon: el.lon };
  if (el.center) return { lat: el.center.lat, lon: el.center.lon };
  return null;
}

function pickName(tags = {}) {
  return tags.name || tags["name:en"] || tags.official_name || "";
}

function greatSchoolsScore(tags = {}) {
  const gs = tags["greatschools:rating"] || tags["greatschools:score"];
  if (gs && /^\d+(\.\d+)?$/.test(String(gs))) return parseFloat(String(gs));
  return null;
}

function isExcludedInstitution(tags = {}, name = "") {
  const n = name.toLowerCase();
  const amenity = tags.amenity || "";

  if (amenity === "childcare" || tags["social_facility"] === "nursery") return true;
  if (tags.building === "church" && !/school|academy|prep|university/i.test(n)) return true;
  if (/^(the )?(st\.|saint )?\w+ (church|parish|ministry)/i.test(n) && !/school|academy/i.test(n)) return true;
  if (/\b(camp|daycare|day care|day-care|child care|childcare|preschool only|learning center|learning centre|tutoring|montessori center|kids club|after school program)\b/i.test(n)) {
    return !/\b(school|academy|prep|high school|elementary|middle school)\b/i.test(n);
  }
  if (/ymca|ywca|boys & girls club|recreation center/i.test(n)) return true;
  if (tags.kindergarten === "yes" && amenity !== "school" && !tags.school) return true;

  return false;
}

function isPrivateSchool(tags = {}, name = "") {
  if (isExcludedInstitution(tags, name)) return false;
  if (tags.school === "private" || tags["isced:level"] === "private") return true;
  if (tags.school === "public" || tags["school:type"] === "public" || tags.operator?.includes("School District")) {
    return false;
  }
  if (/charter|magnet/i.test(name) && !/private/i.test(name)) return false;
  return /\b(private|prep|academy|montessori|christian|catholic|lutheran|episcopal|jewish|islamic|quaker|friends school|seminary)\b/i.test(name);
}

function inferLevel(tags = {}, name = "") {
  const blob = `${tags["school:levels"] || ""} ${tags.grades || ""} ${name}`.toLowerCase();
  if (/elementary|primary|grade school|k-5|k-6|pk-5|pre-k/i.test(blob)) return "elementary";
  if (/middle|junior high|intermediate|6-8|7-8/i.test(blob)) return "middle";
  if (/high school|senior high|9-12/i.test(blob)) return "high";
  if (/k-12|k–12|1-12|pre-k.?12/i.test(blob)) return "k12";
  return "general";
}

function formatGrades(tags = {}, level = "general", name = "") {
  if (tags.grades) return normalizeGrades(tags.grades);
  if (tags["school:levels"]) return normalizeGrades(tags["school:levels"]);
  if (level === "elementary") return "K–5";
  if (level === "middle") return "6–8";
  if (level === "high") return "9–12";
  if (level === "k12") return "K–12";
  if (/high school/i.test(name)) return "9–12";
  if (/middle|junior/i.test(name)) return "6–8";
  if (/elementary|primary/i.test(name)) return "K–5";
  return null;
}

function normalizeGrades(text) {
  return String(text)
    .replace(/\s*-\s*/g, "–")
    .replace(/k/gi, "K")
    .trim();
}

function schoolDescription(tags = {}, name = "", { isPrivate = false, level = "general" } = {}) {
  const raw = tags.description || tags.note || tags["description:en"];
  if (raw && raw.length >= 12 && raw.length <= 160 && !/^yes$/i.test(raw)) {
    return raw.trim().replace(/\.$/, "") + ".";
  }

  if (/laboratory|lab school/i.test(name)) {
    const uni = tags.operator || tags["operator:wikidata"];
    if (/university|college|etsu|state/i.test(`${name} ${tags.operator || ""}`)) {
      return "Public laboratory school affiliated with a regional university.";
    }
    return "Public laboratory school with a specialized academic focus.";
  }
  if (/magnet/i.test(name)) return "Magnet program drawing students from across the district.";
  if (/high school/i.test(name)) return "Principal public high school serving the local district.";
  if (level === "k12" || /k-12|k–12/i.test(name)) return "Full K–12 public school serving multiple grade bands.";
  if (isPrivate && /prep|academy/i.test(name)) return "Private college-preparatory school serving the wider region.";
  if (isPrivate && /christian|catholic|lutheran|episcopal|jewish|islamic/i.test(name)) {
    return "Faith-based private school open to qualifying families in the area.";
  }
  if (/community college|technical college/i.test(name)) return "Two-year college offering associate degrees and workforce training.";
  if (/university/i.test(name)) return "Four-year university with undergraduate and graduate programs.";

  return null;
}

function parseSchoolElements(elements, lat, lon) {
  /** @type {Array<object>} */
  const schools = [];
  const seen = new Set();

  for (const el of elements) {
    const tags = el.tags || {};
    if (tags.amenity !== "school" && tags.amenity !== "kindergarten") continue;

    const name = pickName(tags);
    if (!name || name.length < 4) continue;
    if (isExcludedInstitution(tags, name)) continue;

    const center = elementCenter(el);
    if (!center) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const dist = haversineMi(lat, lon, center.lat, center.lon);
    const level = inferLevel(tags, name);
    const isPrivate = isPrivateSchool(tags, name);
    const grades = formatGrades(tags, level, name);
    const gsScore = greatSchoolsScore(tags);

    schools.push({
      name,
      grades,
      driveTime: estimateDriveTime(dist, dist < 12),
      distanceMi: Math.round(dist * 10) / 10,
      lat: center.lat,
      lon: center.lon,
      level,
      isPrivate,
      gsScore,
      hasNces: Boolean(tags["ref:nces"]),
      description: schoolDescription(tags, name, { isPrivate, level }),
      tags,
    });
  }

  return schools;
}

function scorePublicSchool(s) {
  let score = 120 - s.distanceMi * 2.5;
  if (/high school/i.test(s.name)) score += 22;
  if (s.level === "k12") score += 18;
  if (/university school|laboratory|magnet|academy/i.test(s.name) && !s.isPrivate) score += 20;
  if (s.level === "middle") score += 8;
  if (s.level === "elementary") score += 4;
  if (s.gsScore) score += s.gsScore * 3;
  if (s.hasNces) score += 6;
  if (s.description) score += 4;
  if (/primary|elementary/i.test(s.name) && /high school/i.test(s.name) === false && s.level === "elementary") {
    score += 2;
  }
  return score;
}

function scorePrivateSchool(s) {
  let score = 100 - s.distanceMi * 2;
  if (s.gsScore) score += s.gsScore * 4;
  if (/prep|academy|school/i.test(s.name)) score += 10;
  if (s.description) score += 5;
  if (/camp|center|church/i.test(s.name)) score -= 40;
  return score;
}

function pickFeaturedPublic(schools) {
  const publicSchools = schools.filter((s) => !s.isPrivate && s.grades);
  const ranked = [...publicSchools].sort((a, b) => scorePublicSchool(b) - scorePublicSchool(a));

  /** @type {typeof ranked} */
  const picked = [];
  const usedLevels = new Set();

  for (const school of ranked) {
    if (picked.length >= FEATURED_PUBLIC_MAX) break;
    const sig = school.level === "general"
      ? (school.name.match(/high|middle|elementary|primary|k-12|k–12/i)?.[0]?.toLowerCase() || school.name)
      : school.level;
    if (usedLevels.has(sig) && picked.length >= 1) continue;
    usedLevels.add(sig);
    picked.push(formatSchoolCard(school));
  }

  return picked;
}

function pickPrivateSchools(schools) {
  return schools
    .filter((s) => s.isPrivate && s.distanceMi <= PRIVATE_RADIUS_MI && s.grades)
    .sort((a, b) => scorePrivateSchool(b) - scorePrivateSchool(a))
    .slice(0, PRIVATE_MAX)
    .map(formatSchoolCard);
}

function formatSchoolCard(s) {
  return {
    name: s.name,
    grades: s.grades,
    driveTime: s.driveTime,
    ...(s.description ? { description: s.description } : {}),
    lat: s.lat,
    lon: s.lon,
  };
}

function parseHigherEd(elements, lat, lon) {
  /** @type {object[]} */
  const colleges = [];
  /** @type {object[]} */
  const universities = [];

  for (const el of elements) {
    const tags = el.tags || {};
    const amenity = tags.amenity;
    if (!["college", "university"].includes(amenity)) continue;

    const center = elementCenter(el);
    if (!center) continue;

    const name = pickName(tags) || (amenity === "university" ? "University" : "Community College");
    if (name.length < 4) continue;

    const dist = haversineMi(lat, lon, center.lat, center.lon);
    const institutionType = amenity === "university" ? "University" : "Community college";
    const entry = {
      name,
      institutionType,
      driveTime: estimateDriveTime(dist, dist < 15),
      distanceMi: Math.round(dist * 10) / 10,
      lat: center.lat,
      lon: center.lon,
      description: schoolDescription(tags, name, { isPrivate: false }),
    };

    if (amenity === "university") universities.push(entry);
    else colleges.push(entry);
  }

  colleges.sort((a, b) => a.distanceMi - b.distanceMi);
  universities.sort((a, b) => a.distanceMi - b.distanceMi);

  const formatHigher = (e) => ({
    name: e.name,
    institutionType: e.institutionType,
    driveTime: e.driveTime,
    ...(e.description ? { description: e.description } : {}),
    lat: e.lat,
    lon: e.lon,
  });

  return {
    communityCollege: colleges[0] ? formatHigher(colleges[0]) : null,
    university: universities[0] ? formatHigher(universities[0]) : null,
  };
}

async function fetchCensusDistrict(lat, lon) {
  try {
    const url = new URL("https://geocoding.geo.census.gov/geocoder/geographies/coordinates");
    url.searchParams.set("x", String(lon));
    url.searchParams.set("y", String(lat));
    url.searchParams.set("benchmark", "Public_AR_Current");
    url.searchParams.set("vintage", "Current_Current");
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const geographies = data?.result?.geographies || {};
    const district =
      geographies["Unified School Districts"]?.[0] ||
      geographies["Secondary School Districts"]?.[0] ||
      geographies["Elementary School Districts"]?.[0];

    if (!district?.NAME) return null;

    return {
      name: district.NAME,
      geoid: district.GEOID || null,
      stateFips: district.STATE || null,
    };
  } catch {
    return null;
  }
}

async function fetchDistrictStats(censusDistrict) {
  if (!censusDistrict?.geoid) return {};

  const geoid = censusDistrict.geoid;
  const endpoints = [
    `https://educationdata.urban.org/api/v1/school-districts/ccd/directory/2022/?leaid=${geoid}&limit=1`,
    `https://educationdata.urban.org/api/v1/school-districts/ccd/directory/2022/?district_id=${geoid}&limit=1`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) continue;
      const body = await res.json();
      const row = body?.results?.[0] || (Array.isArray(body) ? body[0] : null);
      if (!row) continue;

      /** @type {Record<string, string>} */
      const stats = {};
      const enrollment = row.enrollment ?? row.enrollment_total ?? row.total_enrollment;
      if (enrollment && Number(enrollment) > 0) {
        stats.enrollment = `${Number(enrollment).toLocaleString()} students`;
      }
      const schoolCount = row.number_of_schools ?? row.schools;
      if (schoolCount && Number(schoolCount) > 0) {
        stats.schoolCount = `${Number(schoolCount)} schools`;
      }
      const ratio = row.student_teacher_ratio ?? row.pupil_teacher_ratio;
      if (ratio && Number(ratio) > 0) {
        stats.studentTeacherRatio = `${ratio}:1`;
      }
      const grad = row.graduation_rate ?? row.cohort_graduation_rate;
      if (grad && Number(grad) > 0 && Number(grad) <= 100) {
        stats.graduationRate = `${Math.round(Number(grad))}%`;
      }
      if (Object.keys(stats).length) return stats;
    } catch {
      continue;
    }
  }

  return {};
}

async function resolveDistrict(lat, lon, publicSchools) {
  const census = await fetchCensusDistrict(lat, lon);

  if (census?.name) {
    const stats = await fetchDistrictStats(census);
    return {
      name: census.name,
      ...stats,
    };
  }

  const operatorCounts = new Map();
  for (const s of publicSchools) {
    const op = s.tags?.operator;
    if (op && /school district|schools|isd|usd/i.test(op)) {
      operatorCounts.set(op, (operatorCounts.get(op) || 0) + 1);
    }
  }

  if (operatorCounts.size > 0) {
    const [name] = [...operatorCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    return { name };
  }

  const namedDistrict = publicSchools.find((s) =>
    /school district| city schools| county schools/i.test(s.tags?.operator || s.name)
  );
  if (namedDistrict?.tags?.operator) {
    return { name: namedDistrict.tags.operator };
  }

  return null;
}

function buildEducationSummary({ district, featuredPublic, privateSchools, higherEd }) {
  const hasPrivate = privateSchools.length > 0;
  const hasHigher = higherEd.communityCollege || higherEd.university;
  const hasK12 = featuredPublic.length > 0;
  const hasDistrict = Boolean(district?.name);

  if (hasK12 && hasPrivate) {
    return "Strong public options anchor the district, with recognized private schools within commuting distance.";
  }
  if (hasK12 && featuredPublic.some((s) => /high school|k–12|k-12|laboratory|magnet/i.test(s.name))) {
    return "Public schools include standout options at the secondary level, with additional choices nearby.";
  }
  if (hasK12 && hasHigher) {
    return "Local public schools pair with accessible colleges and universities in the region.";
  }
  if (hasK12) {
    return hasDistrict
      ? "Public schools serve the town through an established district — confirm zoning by address."
      : "Public schools in the area offer a mix of grade levels worth comparing before you buy.";
  }
  if (hasPrivate && hasHigher) {
    return "Private and higher-education options nearby supplement limited mapped public schools.";
  }
  if (hasHigher) {
    return "Higher education is within reach, though local K–12 options should be verified by address.";
  }
  return null;
}

function toMapMarkers(schools, higherEd, featuredPublic, privateSchools) {
  /** @type {Array<{ lat: number, lon: number, name: string, type: string }>} */
  const markers = [];
  const seen = new Set();

  const add = (item, type) => {
    if (!item?.lat || seen.has(item.name)) return;
    seen.add(item.name);
    markers.push({ lat: item.lat, lon: item.lon, name: item.name, type });
  };

  for (const s of featuredPublic) add(s, "public");
  for (const s of privateSchools) add(s, "private");
  if (higherEd.communityCollege) add(higherEd.communityCollege, "college");
  if (higherEd.university) add(higherEd.university, "university");

  return markers;
}

/**
 * @param {{ id?: string, name?: string, sub?: string }} town
 * @param {string} [stateAbbr]
 */
export async function resolveTownEducation(town, stateAbbr) {
  const key = cacheKey(town.id || town.name, stateAbbr);
  const cached = await readCache(key);
  if (cached) return cached;

  const geo = await geocodeTown(town, stateAbbr);
  if (!geo) return { ok: false, error: "Could not locate this town" };

  const { lat, lon } = geo;

  await new Promise((r) => setTimeout(r, 1100));

  const schoolQuery = `[out:json][timeout:25];
(
  node["amenity"~"school|kindergarten|college|university"](around:32000,${lat},${lon});
  way["amenity"~"school|kindergarten|college|university"](around:32000,${lat},${lon});
  node["amenity"~"college|university"](around:60000,${lat},${lon});
  way["amenity"~"college|university"](around:60000,${lat},${lon});
);
out center tags;`;

  const elements = await runOverpass(schoolQuery);
  const allSchools = parseSchoolElements(elements, lat, lon);
  const higherEd = parseHigherEd(elements, lat, lon);
  const featuredPublic = pickFeaturedPublic(allSchools);
  const privateSchools = pickPrivateSchools(allSchools);
  const district = await resolveDistrict(lat, lon, allSchools.filter((s) => !s.isPrivate));

  const summary = buildEducationSummary({ district, featuredPublic, privateSchools, higherEd });

  const payload = {
    ok: true,
    summary,
    district,
    featuredPublic,
    privateSchools,
    higherEd,
    mapMarkers: toMapMarkers(allSchools, higherEd, featuredPublic, privateSchools),
    coords: { lat, lon },
  };

  await writeCache(key, payload);
  return payload;
}
