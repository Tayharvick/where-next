// Hidden Find feature pages — editorial copy and quick facts per town.

import { formatQuickFactValue } from "@/lib/stateProfiles";

export const FIND_QUICK_FACT_LABELS = [
  { key: "population", label: "Population" },
  { key: "medianHomePrice", label: "Median home price" },
  { key: "populationGrowth5y", label: "Population growth (5-year)" },
  { key: "medianIncome", label: "Median household income" },
  { key: "costOfLiving", label: "Cost of living" },
  { key: "closestMetro", label: "Closest major metro" },
];

/** @type {Record<string, { quickFacts: Record<string, string>, whyWePickedIt: string, thingsToKnow: string[] }>} */
const FIND_PROFILES = {
  coolidge: {
    quickFacts: {
      population: "~19,700",
      medianHomePrice: "$277k",
      populationGrowth5y: "+46% (2020–2024)",
      medianIncome: "~$52k",
      costOfLiving: "Below Phoenix metro average",
      closestMetro: "Phoenix (~50 mi)",
    },
    whyWePickedIt:
      "Coolidge is what early looks like in the Sun Belt — a farm town that grew 46% in four years while most of Arizona priced people out. You can still buy a house for $277k with prices actually down this year, which is rare anywhere within an hour of a major metro. It is not charming in a postcard sense; it is a working Pinal County town catching spillover from Phoenix's semiconductor and logistics build-out. That combination — real growth, real affordability, and almost zero national attention — is exactly what Hidden Finds is for.",
    thingsToKnow: [
      "Summer heat is extreme: triple-digit days are normal, and extreme heat days are projected to rise sharply over the next thirty years.",
      "Commute reality: most residents work toward Phoenix or Casa Grande; this is a car town, not a walkable village.",
      "Healthcare is adequate for basics but specialists usually mean a trip to the Phoenix metro.",
      "The local economy runs on manufacturing, logistics, and construction tied to regional growth — not a diversified downtown job base.",
      "Daily amenities are limited; grocery, dining, and services exist, but you will drive for anything specialized.",
      "Wildfire risk and insurance costs are real in Pinal County — get a quote on the address before you fall in love with the price.",
    ],
  },
  johnsoncity: {
    quickFacts: {
      population: "~72,000",
      medianHomePrice: "$339k",
      populationGrowth5y: "Trending toward 80k by 2030",
      medianIncome: "~$58k",
      costOfLiving: "Below U.S. average",
      closestMetro: "Tri-Cities hub · Asheville ~1 hr",
    },
    whyWePickedIt:
      "Johnson City quietly became one of the most-searched relocation destinations in the country — not because it marketed itself, but because the math still works. You get Appalachian foothills, a real university town, and a median sale price roughly twenty percent below the national average, with Tennessee's lack of state income tax on top. Ballad Health and East Tennessee State University anchor the economy in a region that most coastal movers have never considered. The window is narrowing — prices rose nearly ten percent in a year — but it still feels like discovery rather than chase.",
    thingsToKnow: [
      "Weather follows mountain foothill patterns: milder summers than the Deep South, real winter, and occasional ice on the ridges.",
      "Commute is local unless you need Nashville or Asheville regularly — both are a meaningful drive, not a daily errand.",
      "Healthcare is a strength here: Ballad Health is the regional system, and the medical campus is part of why the town works.",
      "Jobs cluster in healthcare and higher education; outside those sectors the market is thinner than the headlines suggest.",
      "Downtown has come back with breweries, restaurants, and outdoor access — more amenity than you'd expect for the size.",
      "Prices are rising fast: the relocation discount that made Johnson City famous is closing while you read this.",
    ],
  },
  wildwood: {
    quickFacts: {
      population: "~36,500",
      medianHomePrice: "$366k",
      populationGrowth5y: "Doubled in three years",
      medianIncome: "~$55k",
      costOfLiving: "Near Florida average · insurance above",
      closestMetro: "Orlando (~1 hr)",
    },
    whyWePickedIt:
      "Wildwood is the fastest-growing town in the United States — its population doubled in three years — and it still reads like a crossroads until you look at the numbers. You are buying into Sumter County at the edge of The Villages, with new infrastructure following retirement migration whether locals asked for it or not. Median prices near $366k are not cheap in absolute terms, but they are cheap relative to what Florida coastal movers are fleeing. The trade is explicit: you get Gulf and Orlando within an hour, and you live inside someone else's retirement boom.",
    thingsToKnow: [
      "Climate is classic inland Florida: hot, humid summers and mild winters — hurricane exposure is lower than the coast but insurance still matters.",
      "Commute patterns split between Orlando employment, Villages-adjacent service jobs, and remote work; plan on driving.",
      "Healthcare follows retirement growth — access is improving quickly but still centers on regional hospitals, not a major medical city.",
      "The economy is healthcare, retail, and construction serving the retirement corridor; diversity is limited.",
      "Amenities are expanding with growth but still lag the population curve — schools, roads, and doctors feel the strain.",
      "You are not buying a quaint small town; you are buying growth adjacent to the largest retirement development in the country.",
    ],
  },
  tontitown: {
    quickFacts: {
      population: "~7,900",
      medianHomePrice: "$450k",
      populationGrowth5y: "+70% (2020–2024)",
      medianIncome: "~$78k",
      costOfLiving: "Above Arkansas average",
      closestMetro: "Fayetteville / Bentonville (~15 mi)",
    },
    whyWePickedIt:
      "Tontitown is the story of a place that stayed itself for a century — an Italian-American grape-farming village — until Northwest Arkansas grew up around it. Population jumped seventy percent in four years because Walmart, Tyson, and the supplier economy pulled the region into one of the strongest job markets in the country. You are not buying cheap Arkansas anymore; you are buying Ozark scenery with Bentonville wages ten minutes away. We feature it as a Hidden Find because the transformation is real, but so is the sticker shock: this is now the priciest housing in the state.",
    thingsToKnow: [
      "Weather includes four seasons with spring storm season; tornado and severe-wind exposure is part of Ozark life.",
      "Commute is short to Fayetteville, Springdale, and Bentonville — most residents work in the NWA triangle, not in town.",
      "Healthcare is excellent by small-town standards because of the regional medical infrastructure tied to the metro.",
      "The economy is overwhelmingly tied to Northwest Arkansas corporate headquarters and their supplier network.",
      "Amenities are village-scale locally; everything serious happens in Fayetteville or Rogers, which is the point.",
      "You missed the cheap years: median prices near $450k mean you are paying a premium for proximity, not discovering a bargain.",
    ],
  },
  hoschton: {
    quickFacts: {
      population: "~4,000",
      medianHomePrice: "$535k",
      populationGrowth5y: "+45% (2020–2024)",
      medianIncome: "~$72k",
      costOfLiving: "Above Georgia rural average",
      closestMetro: "Atlanta (~45 mi)",
    },
    whyWePickedIt:
      "We include Hoschton as a cautionary Hidden Find — the kind of place that shows what happens when Atlanta's sprawl finds a village that was not planning for it. The median sale price hit $535k after a twenty-six percent jump in a single year, in a town that was under three thousand people half a decade ago. There is still a one-street charm if you squint, and the commute-to-Atlanta math works for some households. But this is not early; it is what 'too late' looks like when a boom town gets discovered without growing the infrastructure to match.",
    thingsToKnow: [
      "Climate is humid subtropical: hot summers, mild winters, and occasional ice storms that paralyze exurban roads.",
      "Commute to Atlanta is the deal — plan on forty-five miles each way unless you work remotely or locally.",
      "Healthcare means regional hospitals in Gainesville or northeast Atlanta; nothing walkable in village center.",
      "Local jobs are scarce; the economy is residential growth itself, plus whatever spills over from Jackson County.",
      "Amenities are still village-limited despite the price tag — dining and services lag the housing market.",
      "Price momentum outran demand: long days-on-market suggest the run-up reflects sprawl pressure more than a deep local job market.",
    ],
  },
};

/**
 * @param {string} townId
 * @returns {{ quickFacts: Record<string, string>, whyWePickedIt: string, thingsToKnow: string[] } | null}
 */
export function getFindProfile(townId) {
  const profile = FIND_PROFILES[townId];
  if (!profile) return null;
  return {
    ...profile,
    quickFacts: Object.fromEntries(
      Object.entries(profile.quickFacts).map(([key, value]) => [key, formatQuickFactValue(value)])
    ),
  };
}
