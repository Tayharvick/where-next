// State-level scout pages — single file to update copy and facts per state.
// Placeholder figures are approximate; verify before treating as researched.

import { US, STATES, FINDS } from "@/lib/data";

/** @typedef {import("@/lib/data").Town} Town */

/**
 * @typedef {Object} StateQuickFacts
 * @property {string} population
 * @property {string} medianHome
 * @property {string} medianIncome
 * @property {string} costOfLiving
 * @property {string} incomeTax
 * @property {string} propertyTax
 * @property {string} summerTemp
 * @property {string} winterTemp
 */

/**
 * @typedef {Object} StateProfile
 * @property {string} overview
 * @property {string[]} whyMove
 * @property {string[]} thinkAbout
 * @property {StateQuickFacts} quickFacts
 * @property {string[]} growingAreas
 */

/** Approximate placeholder facts — update per state as research is completed. */
export const STATE_QUICK_FACTS = {
  AL: { population: "5.1M", medianHome: "~$223k", medianIncome: "~$59k", costOfLiving: "Below U.S. average", incomeTax: "2%–5%", propertyTax: "~0.41% effective", summerTemp: "High 80s–90s °F", winterTemp: "40s–50s °F" },
  AK: { population: "733k", medianHome: "~$345k", medianIncome: "~$80k", costOfLiving: "Above U.S. average", incomeTax: "None", propertyTax: "~1.2% effective", summerTemp: "50s–70s °F", winterTemp: "0s–20s °F" },
  AZ: { population: "7.4M", medianHome: "~$435k", medianIncome: "~$72k", costOfLiving: "Near U.S. average", incomeTax: "2.5% flat", propertyTax: "~0.62% effective", summerTemp: "100s °F (low desert)", winterTemp: "50s–60s °F" },
  AR: { population: "3.0M", medianHome: "~$251k", medianIncome: "~$56k", costOfLiving: "Below U.S. average", incomeTax: "2%–4.4%", propertyTax: "~0.62% effective", summerTemp: "High 80s–90s °F", winterTemp: "30s–40s °F" },
  CA: { population: "39M", medianHome: "~$785k", medianIncome: "~$91k", costOfLiving: "Well above U.S. average", incomeTax: "1%–13.3%", propertyTax: "~0.75% effective", summerTemp: "70s–90s °F (varies)", winterTemp: "40s–60s °F (varies)" },
  CO: { population: "5.8M", medianHome: "~$580k", medianIncome: "~$87k", costOfLiving: "Above U.S. average", incomeTax: "4.4% flat", propertyTax: "~0.51% effective", summerTemp: "80s °F", winterTemp: "20s–30s °F" },
  CT: { population: "3.6M", medianHome: "~$415k", medianIncome: "~$90k", costOfLiving: "Above U.S. average", incomeTax: "3%–6.99%", propertyTax: "~1.9% effective", summerTemp: "70s–80s °F", winterTemp: "20s–30s °F" },
  DE: { population: "1.0M", medianHome: "~$385k", medianIncome: "~$79k", costOfLiving: "Near U.S. average", incomeTax: "2.2%–6.6%", propertyTax: "~0.57% effective", summerTemp: "80s °F", winterTemp: "30s °F" },
  FL: { population: "22.6M", medianHome: "~$395k", medianIncome: "~$69k", costOfLiving: "Near U.S. average", incomeTax: "None", propertyTax: "~0.89% effective", summerTemp: "High 80s–90s °F", winterTemp: "60s–70s °F" },
  GA: { population: "11.0M", medianHome: "~$365k", medianIncome: "~$71k", costOfLiving: "Below U.S. average", incomeTax: "1%–5.49%", propertyTax: "~0.87% effective", summerTemp: "High 80s–90s °F", winterTemp: "40s–50s °F" },
  HI: { population: "1.4M", medianHome: "~$820k", medianIncome: "~$92k", costOfLiving: "Highest in the U.S.", incomeTax: "1.4%–11%", propertyTax: "~0.28% effective", summerTemp: "80s °F", winterTemp: "70s °F" },
  ID: { population: "1.9M", medianHome: "~$485k", medianIncome: "~$68k", costOfLiving: "Below U.S. average", incomeTax: "5.695% flat", propertyTax: "~0.69% effective", summerTemp: "80s °F", winterTemp: "20s–30s °F" },
  IL: { population: "12.6M", medianHome: "~$285k", medianIncome: "~$78k", costOfLiving: "Near U.S. average", incomeTax: "4.95% flat", propertyTax: "~2.1% effective", summerTemp: "80s °F", winterTemp: "20s–30s °F" },
  IN: { population: "6.8M", medianHome: "~$260k", medianIncome: "~$67k", costOfLiving: "Below U.S. average", incomeTax: "3.05% flat", propertyTax: "~0.85% effective", summerTemp: "80s °F", winterTemp: "20s–30s °F" },
  IA: { population: "3.2M", medianHome: "~$215k", medianIncome: "~$69k", costOfLiving: "Below U.S. average", incomeTax: "4.4%–5.7%", propertyTax: "~1.5% effective", summerTemp: "80s °F", winterTemp: "10s–20s °F" },
  KS: { population: "2.9M", medianHome: "~$240k", medianIncome: "~$68k", costOfLiving: "Below U.S. average", incomeTax: "3.1%–5.7%", propertyTax: "~1.4% effective", summerTemp: "High 80s–90s °F", winterTemp: "20s–30s °F" },
  KY: { population: "4.5M", medianHome: "~$255k", medianIncome: "~$61k", costOfLiving: "Below U.S. average", incomeTax: "4%–5%", propertyTax: "~0.86% effective", summerTemp: "80s °F", winterTemp: "30s °F" },
  LA: { population: "4.6M", medianHome: "~$245k", medianIncome: "~$57k", costOfLiving: "Below U.S. average", incomeTax: "1.85%–4.25%", propertyTax: "~0.55% effective", summerTemp: "High 80s–90s °F", winterTemp: "50s °F" },
  ME: { population: "1.4M", medianHome: "~$380k", medianIncome: "~$68k", costOfLiving: "Above U.S. average", incomeTax: "5.8%–7.15%", propertyTax: "~1.2% effective", summerTemp: "70s °F", winterTemp: "10s–20s °F" },
  MD: { population: "6.2M", medianHome: "~$430k", medianIncome: "~$98k", costOfLiving: "Above U.S. average", incomeTax: "2%–5.75%", propertyTax: "~1.0% effective", summerTemp: "80s °F", winterTemp: "30s °F" },
  MA: { population: "7.0M", medianHome: "~$610k", medianIncome: "~$96k", costOfLiving: "Well above U.S. average", incomeTax: "5% flat", propertyTax: "~1.1% effective", summerTemp: "70s–80s °F", winterTemp: "20s–30s °F" },
  MI: { population: "10.0M", medianHome: "~$245k", medianIncome: "~$67k", costOfLiving: "Below U.S. average", incomeTax: "4.25% flat", propertyTax: "~1.4% effective", summerTemp: "70s–80s °F", winterTemp: "20s °F" },
  MN: { population: "5.7M", medianHome: "~$340k", medianIncome: "~$84k", costOfLiving: "Near U.S. average", incomeTax: "5.35%–9.85%", propertyTax: "~1.1% effective", summerTemp: "70s–80s °F", winterTemp: "0s–10s °F" },
  MS: { population: "2.9M", medianHome: "~$195k", medianIncome: "~$52k", costOfLiving: "Lowest tier nationally", incomeTax: "0%–5%", propertyTax: "~0.79% effective", summerTemp: "High 80s–90s °F", winterTemp: "40s–50s °F" },
  MO: { population: "6.2M", medianHome: "~$255k", medianIncome: "~$65k", costOfLiving: "Below U.S. average", incomeTax: "1.5%–4.8%", propertyTax: "~0.97% effective", summerTemp: "80s °F", winterTemp: "30s °F" },
  MT: { population: "1.1M", medianHome: "~$505k", medianIncome: "~$66k", costOfLiving: "Near U.S. average", incomeTax: "1%–6.75%", propertyTax: "~0.83% effective", summerTemp: "70s–80s °F", winterTemp: "10s–20s °F" },
  NE: { population: "2.0M", medianHome: "~$280k", medianIncome: "~$71k", costOfLiving: "Below U.S. average", incomeTax: "2.46%–6.64%", propertyTax: "~1.6% effective", summerTemp: "80s °F", winterTemp: "10s–20s °F" },
  NV: { population: "3.2M", medianHome: "~$430k", medianIncome: "~$71k", costOfLiving: "Near U.S. average", incomeTax: "None", propertyTax: "~0.55% effective", summerTemp: "90s–100s °F", winterTemp: "30s–40s °F" },
  NH: { population: "1.4M", medianHome: "~$490k", medianIncome: "~$90k", costOfLiving: "Above U.S. average", incomeTax: "None (interest/dividends)", propertyTax: "~1.9% effective", summerTemp: "70s–80s °F", winterTemp: "10s–20s °F" },
  NJ: { population: "9.3M", medianHome: "~$530k", medianIncome: "~$96k", costOfLiving: "Well above U.S. average", incomeTax: "1.4%–10.75%", propertyTax: "~2.2% effective", summerTemp: "80s °F", winterTemp: "30s °F" },
  NM: { population: "2.1M", medianHome: "~$350k", medianIncome: "~$58k", costOfLiving: "Below U.S. average", incomeTax: "1.7%–5.9%", propertyTax: "~0.80% effective", summerTemp: "80s–90s °F", winterTemp: "30s–40s °F" },
  NY: { population: "19.6M", medianHome: "~$455k", medianIncome: "~$81k", costOfLiving: "Above U.S. average", incomeTax: "4%–10.9%", propertyTax: "~1.6% effective", summerTemp: "70s–80s °F", winterTemp: "20s °F" },
  NC: { population: "10.8M", medianHome: "~$365k", medianIncome: "~$69k", costOfLiving: "Below U.S. average", incomeTax: "4.5% flat", propertyTax: "~0.82% effective", summerTemp: "80s °F", winterTemp: "40s °F" },
  ND: { population: "780k", medianHome: "~$285k", medianIncome: "~$72k", costOfLiving: "Below U.S. average", incomeTax: "1.95%–2.5%", propertyTax: "~1.0% effective", summerTemp: "70s–80s °F", winterTemp: "0s–10s °F" },
  OH: { population: "11.8M", medianHome: "~$240k", medianIncome: "~$65k", costOfLiving: "Below U.S. average", incomeTax: "2.765%–3.75%", propertyTax: "~1.5% effective", summerTemp: "80s °F", winterTemp: "20s–30s °F" },
  OK: { population: "4.0M", medianHome: "~$235k", medianIncome: "~$61k", costOfLiving: "Below U.S. average", incomeTax: "0.25%–4.75%", propertyTax: "~0.90% effective", summerTemp: "High 80s–90s °F", winterTemp: "30s–40s °F" },
  OR: { population: "4.2M", medianHome: "~$510k", medianIncome: "~$76k", costOfLiving: "Above U.S. average", incomeTax: "4.75%–9.9%", propertyTax: "~0.90% effective", summerTemp: "70s–80s °F", winterTemp: "30s–40s °F" },
  PA: { population: "13.0M", medianHome: "~$290k", medianIncome: "~$73k", costOfLiving: "Below U.S. average", incomeTax: "3.07% flat", propertyTax: "~1.4% effective", summerTemp: "80s °F", winterTemp: "20s–30s °F" },
  RI: { population: "1.1M", medianHome: "~$460k", medianIncome: "~$82k", costOfLiving: "Above U.S. average", incomeTax: "3.75%–5.99%", propertyTax: "~1.4% effective", summerTemp: "70s–80s °F", winterTemp: "20s–30s °F" },
  SC: { population: "5.3M", medianHome: "~$345k", medianIncome: "~$64k", costOfLiving: "Below U.S. average", incomeTax: "0%–6.4%", propertyTax: "~0.57% effective", summerTemp: "High 80s–90s °F", winterTemp: "40s–50s °F" },
  SD: { population: "910k", medianHome: "~$320k", medianIncome: "~$69k", costOfLiving: "Below U.S. average", incomeTax: "None", propertyTax: "~1.2% effective", summerTemp: "80s °F", winterTemp: "10s–20s °F" },
  TN: { population: "7.1M", medianHome: "~$380k", medianIncome: "~$67k", costOfLiving: "Below U.S. average", incomeTax: "None (on wages)", propertyTax: "~0.64% effective", summerTemp: "80s °F", winterTemp: "30s–40s °F" },
  TX: { population: "30.5M", medianHome: "~$345k", medianIncome: "~$73k", costOfLiving: "Below U.S. average", incomeTax: "None", propertyTax: "~1.6% effective", summerTemp: "90s–100s °F", winterTemp: "40s–50s °F" },
  UT: { population: "3.4M", medianHome: "~$545k", medianIncome: "~$88k", costOfLiving: "Near U.S. average", incomeTax: "4.55% flat", propertyTax: "~0.57% effective", summerTemp: "80s–90s °F", winterTemp: "20s–30s °F" },
  VT: { population: "647k", medianHome: "~$410k", medianIncome: "~$75k", costOfLiving: "Above U.S. average", incomeTax: "3.35%–8.75%", propertyTax: "~1.8% effective", summerTemp: "70s °F", winterTemp: "10s–20s °F" },
  VA: { population: "8.6M", medianHome: "~$410k", medianIncome: "~$87k", costOfLiving: "Near U.S. average", incomeTax: "2%–5.75%", propertyTax: "~0.82% effective", summerTemp: "80s °F", winterTemp: "30s–40s °F" },
  WA: { population: "7.8M", medianHome: "~$620k", medianIncome: "~$91k", costOfLiving: "Above U.S. average", incomeTax: "None", propertyTax: "~0.92% effective", summerTemp: "70s–80s °F", winterTemp: "30s–40s °F" },
  WV: { population: "1.8M", medianHome: "~$165k", medianIncome: "~$55k", costOfLiving: "Below U.S. average", incomeTax: "2.36%–5.12%", propertyTax: "~0.58% effective", summerTemp: "70s–80s °F", winterTemp: "20s–30s °F" },
  WI: { population: "5.9M", medianHome: "~$310k", medianIncome: "~$72k", costOfLiving: "Below U.S. average", incomeTax: "3.5%–7.65%", propertyTax: "~1.7% effective", summerTemp: "70s–80s °F", winterTemp: "10s–20s °F" },
  WY: { population: "584k", medianHome: "~$340k", medianIncome: "~$72k", costOfLiving: "Near U.S. average", incomeTax: "None", propertyTax: "~0.61% effective", summerTemp: "70s–80s °F", winterTemp: "10s–20s °F" },
};

/** Notable metros and regions — placeholder lists, refine per state over time. */
export const STATE_GROWING_AREAS = {
  AL: ["Huntsville", "Birmingham suburbs", "Auburn–Opelika", "Mobile Bay", "Fairhope"],
  AK: ["Anchorage", "Fairbanks", "Juneau", "Mat-Su Valley", "Kenai Peninsula"],
  AZ: ["Phoenix metro", "Scottsdale", "Tucson", "Prescott", "Flagstaff"],
  AR: ["Northwest Arkansas", "Little Rock metro", "Bentonville", "Fayetteville", "Hot Springs"],
  CA: ["Sacramento", "Inland Empire", "Central Coast", "San Diego North County", "Redding"],
  CO: ["Denver metro", "Colorado Springs", "Fort Collins", "Grand Junction", "Durango"],
  CT: ["Hartford suburbs", "New Haven", "Stamford", "Litchfield County", "Mystic coast"],
  DE: ["Wilmington", "Dover", "Lewes", "Rehoboth Beach", "Middletown"],
  FL: ["Orlando", "Tampa Bay", "Jacksonville", "Naples", "Pensacola", "Space Coast"],
  GA: ["Atlanta suburbs", "Savannah", "Athens", "Augusta", "Blue Ridge"],
  HI: ["Honolulu", "Maui", "Kailua-Kona", "Lihue", "Hilo"],
  ID: ["Boise", "Coeur d'Alene", "Idaho Falls", "Twin Falls", "McCall"],
  IL: ["Chicago suburbs", "Springfield", "Champaign–Urbana", "Galena", "Carbondale"],
  IN: ["Indianapolis suburbs", "Fort Wayne", "Bloomington", "Carmel", "Columbus"],
  IA: ["Des Moines", "Cedar Rapids", "Iowa City", "Davenport", "Ames"],
  KS: ["Wichita", "Kansas City KS", "Lawrence", "Manhattan", "Hutchinson"],
  KY: ["Louisville", "Lexington", "Bowling Green", "Northern Kentucky", "Paducah"],
  LA: ["New Orleans", "Baton Rouge", "Lafayette", "Lake Charles", "Shreveport"],
  ME: ["Portland", "Bangor", "Augusta", "Bar Harbor", "Kennebunkport"],
  MD: ["Annapolis", "Frederick", "Eastern Shore", "Columbia", "Bethesda"],
  MA: ["Boston suburbs", "Cape Cod", "Northampton", "Worcester", "Pittsfield"],
  MI: ["Grand Rapids", "Traverse City", "Ann Arbor", "Kalamazoo", "Marquette"],
  MN: ["Minneapolis–St. Paul", "Rochester", "Duluth", "St. Cloud", "Mankato"],
  MS: ["Jackson suburbs", "Gulf Coast", "Oxford", "Hattiesburg", "Tupelo"],
  MO: ["Kansas City", "St. Louis suburbs", "Springfield", "Columbia", "Branson"],
  MT: ["Bozeman", "Missoula", "Kalispell", "Billings", "Helena"],
  NE: ["Omaha", "Lincoln", "Grand Island", "Kearney", "Scottsbluff"],
  NV: ["Reno–Sparks", "Henderson", "Carson City", "Mesquite", "Elko"],
  NH: ["Portsmouth", "Concord", "Manchester", "Keene", "Lakes Region"],
  NJ: ["Jersey Shore", "Princeton", "Morristown", "Hoboken", "Cape May"],
  NM: ["Santa Fe", "Albuquerque", "Las Cruces", "Taos", "Ruidoso"],
  NY: ["Hudson Valley", "Buffalo", "Syracuse", "Finger Lakes", "Adirondacks"],
  NC: ["Charlotte", "Raleigh–Durham", "Asheville", "Wilmington", "Outer Banks"],
  ND: ["Fargo", "Bismarck", "Grand Forks", "Minot", "Williston"],
  OH: ["Columbus", "Cincinnati suburbs", "Cleveland suburbs", "Dayton", "Athens"],
  OK: ["Oklahoma City", "Tulsa", "Norman", "Broken Arrow", "Stillwater"],
  OR: ["Portland metro", "Bend", "Eugene", "Medford", "Astoria"],
  PA: ["Philadelphia suburbs", "Pittsburgh", "Lancaster", "State College", "Pocono Mountains"],
  RI: ["Providence", "Newport", "Warwick", "Westerly", "Bristol"],
  SC: ["Charleston", "Greenville", "Bluffton", "Beaufort", "Myrtle Beach"],
  SD: ["Sioux Falls", "Rapid City", "Spearfish", "Aberdeen", "Deadwood"],
  TN: ["Nashville", "Knoxville", "Chattanooga", "Johnson City", "Franklin"],
  TX: ["Austin", "Dallas–Fort Worth", "San Antonio", "Hill Country", "El Paso"],
  UT: ["Salt Lake City", "St. George", "Park City", "Provo", "Moab"],
  VT: ["Burlington", "Montpelier", "Stowe", "Manchester", "Brattleboro"],
  VA: ["Charlottesville", "Roanoke", "Richmond suburbs", "Winchester", "Virginia Beach"],
  WA: ["Seattle suburbs", "Spokane", "Bellingham", "Wenatchee", "San Juan Islands"],
  WV: ["Charleston", "Morgantown", "Lewisburg", "Shepherdstown", "Harpers Ferry"],
  WI: ["Madison", "Milwaukee suburbs", "Green Bay", "Door County", "La Crosse"],
  WY: ["Cheyenne", "Casper", "Jackson Hole", "Laramie", "Sheridan"],
};

/** Hand-researched overrides — merge over generated defaults. */
const STATE_PROFILE_OVERRIDES = {
  FL: {
    overview:
      "Florida is sun, coast, and a housing market that runs on insurance math as much as list price. " +
      STATES.FL.blurb +
      " Living here generally means trading winter for humidity, planning around hurricane season, and choosing whether you want theme-park proximity, beach access, or inland affordability — rarely all three on one budget.",
    whyMove: [
      "No state income tax — a meaningful savings if you're bringing income from elsewhere.",
      "Year-round outdoor life: beaches, springs, paddling, and a culture built around being outside.",
      "Strong job growth in healthcare, aerospace, logistics, and tourism across multiple metros.",
      "Walkable historic downtowns still exist inland — DeLand, Mount Dora, and dozens of smaller gems.",
      "Buyer-friendly inventory in many markets after the post-pandemic run-up cooled.",
      "Easy air access through Orlando, Tampa, Miami, and Jacksonville depending on where you land.",
    ],
    thinkAbout: [
      "Homeowners insurance averages about $8,460/year statewide — coastal addresses can exceed $11,000. Quote the exact property.",
      "Wind and flood risk are real. A pretty listing price can hide an uninsurable address.",
      "Condo reserve rules (2026) are triggering large special assessments in older buildings — read the HOA books.",
      "Heat and humidity are relentless six months a year; mold and A/C costs follow.",
      "Population growth strains water, traffic, and school capacity in the fastest-growing counties.",
      "Wages in many smaller towns lag housing costs — remote work or retirement income often required.",
    ],
    growingAreas: STATE_GROWING_AREAS.FL,
  },

  NV: {
    overview:
      "Nevada is wide-open desert, no state income tax, and a housing market where the hidden cost is often water — not the mortgage. " +
      STATES.NV.blurb +
      " Living here means accepting extreme summer heat in the south, real remoteness in the north, and checking whether a property's water comes from a secure municipal source or a well with uncertain rights.",
    whyMove: [
      "No state income tax, with property tax among the lowest effective rates in the country.",
      "Home insurance is relatively cheap — often $1,500–$2,500/year — compared to coastal states.",
      "Reno–Sparks and Las Vegas offer real job markets; smaller towns offer space and value.",
      "Outdoor access: Sierra Nevada, Great Basin, Lake Tahoe within a few hours of most population centers.",
      "Primary-residence property tax increases capped at 3% annually — compounding savings over time.",
      "Growing logistics and manufacturing corridor east of Reno (Tesla, TRIC industrial park).",
    ],
    thinkAbout: [
      "Water rights and aquifer restrictions are already in force in Pahrump, Lyon County, and elsewhere.",
      "Standard insurance does not cover well failure or drought-related loss — read the policy.",
      "Extreme heat in southern Nevada; long, cold winters in northern mining towns like Elko.",
      "Healthcare and specialist medicine require travel in most rural counties.",
      "Economies in small towns can hinge on one industry — mining, tourism, or a single employer.",
      "Dust, wind, and wildfire smoke affect quality of life and insurance in western valleys.",
    ],
    growingAreas: STATE_GROWING_AREAS.NV,
  },

  MT: {
    overview:
      "Montana is the split state: postcard mountain towns at Bozeman and Whitefish prices, and plains towns a hundred miles east where the same house costs a fraction. " +
      STATES.MT.blurb +
      " Living here means weighing access to airports and hospitals against affordability, accepting long winters, and understanding that wildfire smoke has become a regular summer cost.",
    whyMove: [
      "Unmatched outdoor access — Glacier, Yellowstone gateways, fly fishing, and public land in every direction.",
      "Genuine small-town character in places that haven't been fully discovered yet.",
      "Strong community institutions in regional hubs: universities, hospitals, and air force bases.",
      "Affordable pockets still exist east of the Divide — arbitrage for remote workers willing to trade scenery for price.",
      "Low population density and a pace of life that rewards people who want space.",
      "Growing tech and remote-work migration to Missoula, Bozeman, and Kalispell — with jobs following.",
    ],
    thinkAbout: [
      "State income tax applies — unlike Nevada or Florida. Factor it into cross-state comparisons.",
      "Property tax reassessments have moved bills sharply; ask for the actual bill on the house.",
      "Wildfire smoke shuts down weeks of summer in bad years and drives insurance in western valleys.",
      "Healthcare access thins quickly outside Billings, Missoula, Great Falls, and Bozeman.",
      "Housing in gateway towns (Bozeman, Whitefish, Kalispell) is priced beyond local wages.",
      "Winters are long and serious — especially on the Hi-Line and eastern plains.",
    ],
    growingAreas: STATE_GROWING_AREAS.MT,
  },
};

function defaultOverview(name) {
  return (
    `${name} mixes regional cities, college towns, and rural communities — each with its own price curve and personality. ` +
    `What it offers depends heavily on which county you choose: climate, job access, healthcare, and housing costs swing widely within the same state line. ` +
    `Scout town-level research is rolling out state by state; use this page as a starting point before diving into individual places.`
  );
}

function defaultWhyMove(name) {
  return [
    `More affordable pockets than many coastal metros — if you're willing to live outside ${name}'s largest cities.`,
    "Appeal for remote workers who want space, lower density, and a slower daily rhythm.",
    "Regional hubs with hospitals, airports, and universities scattered across the state.",
    "Distinct local culture — food, architecture, and community life that vary town by town.",
    "Outdoor recreation and seasonal beauty that reward people who plan around the climate.",
    "Growing interest from relocators priced out of neighboring states — creating new opportunity and pressure.",
  ];
}

function defaultThinkAbout(name) {
  return [
    "Weather risks vary by region — verify flood, fire, storm, or extreme heat exposure for any address.",
    "Job markets concentrate in a handful of metros; smaller towns often mean commuting or working remote.",
    "Property taxes, insurance, and utility costs can surprise newcomers — quote the specific home.",
    "Healthcare access thins outside regional centers; specialist care may require travel.",
    "Wages in many counties lag housing costs in popular relocation destinations.",
    `Tax structure in ${name} may differ meaningfully from states you've compared — run the full cost picture.`,
  ];
}

function buildDefaultProfile(abbr) {
  const name = US[abbr];
  return {
    overview: defaultOverview(name),
    whyMove: defaultWhyMove(name),
    thinkAbout: defaultThinkAbout(name),
    quickFacts: STATE_QUICK_FACTS[abbr],
    growingAreas: STATE_GROWING_AREAS[abbr] || [],
  };
}

function formatQuickFacts(facts) {
  return Object.fromEntries(
    Object.entries(facts).map(([key, value]) => [key, formatQuickFactValue(value)])
  );
}

/**
 * Strip leading approximate markers from Quick Facts values for display.
 * Source data uses "~" for estimates (e.g. "~$245k"); in Newsreader with tight
 * letter-spacing it reads as a minus sign. Ranges (–) and real negatives are kept.
 */
export function formatQuickFactValue(value) {
  if (value == null) return "";
  const text = String(value);
  return text.startsWith("~") ? text.slice(1) : text;
}

/**
 * @param {string} abbr — two-letter state code
 * @returns {StateProfile & { abbr: string, name: string } | null}
 */
export function getStateProfile(abbr) {
  const name = US[abbr];
  if (!name) return null;

  const base = buildDefaultProfile(abbr);
  const override = STATE_PROFILE_OVERRIDES[abbr] || {};

  return {
    abbr,
    name,
    ...base,
    ...override,
    quickFacts: formatQuickFacts({ ...base.quickFacts, ...(override.quickFacts || {}) }),
    growingAreas: override.growingAreas || base.growingAreas,
  };
}

/** Parse state name from a FINDS town subtitle, e.g. "Arkansas · pop. ~7,900". */
export function stateNameFromFindSub(sub) {
  if (!sub || typeof sub !== "string") return null;
  return sub.split("·")[0]?.trim() || null;
}

/**
 * Collect researched towns for a state from state boards and Hidden Finds.
 * @param {string} abbr
 * @param {Record<string, { towns?: Town[] }>} allStates
 * @param {Town[]} [finds]
 */
export function getResearchedTownsForState(abbr, allStates, finds = FINDS) {
  const stateName = US[abbr];
  if (!stateName) return [];

  const fromBoard = (allStates[abbr]?.towns || []).map((town) => ({ ...town, st: abbr }));
  const fromFinds = finds
    .filter((town) => stateNameFromFindSub(town.sub) === stateName)
    .map((town) => ({ ...town, st: abbr }));

  const seen = new Set();
  return [...fromBoard, ...fromFinds].filter((town) => {
    if (seen.has(town.id)) return false;
    seen.add(town.id);
    return true;
  });
}

export const STATE_QUICK_FACT_LABELS = [
  { key: "population", label: "Population" },
  { key: "medianHome", label: "Median home price" },
  { key: "medianIncome", label: "Median household income" },
  { key: "costOfLiving", label: "Cost of living" },
  { key: "incomeTax", label: "State income tax" },
  { key: "propertyTax", label: "Property taxes" },
  { key: "summerTemp", label: "Typical summer" },
  { key: "winterTemp", label: "Typical winter" },
];
