// Researches a US state on demand: live web search, then structured output.
// This is the piece that cannot run inside a Claude artifact — it needs a server.

import { US } from "@/lib/data";

const MODEL = "claude-sonnet-4-6";

export const maxDuration = 300; // researching a state takes a while

async function call(messages, useSearch) {
  const body = { model: MODEL, max_tokens: 8000, messages };
  if (useSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 12 }];
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "API error");

  return (data.content || [])
    .map((b) => (b.type === "text" ? b.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

// Pull the first complete JSON object out of a blob, ignoring braces inside strings.
function extractJson(text) {
  const s = text.replace(/```json|```/g, "");
  const start = s.indexOf("{");
  if (start === -1) throw new Error("no JSON in response");
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return JSON.parse(s.slice(start, i + 1));
    }
  }
  throw new Error("JSON was cut off");
}

const researchPrompt = (name) => `Research ${name} for someone looking to relocate there in 2026. Search the web thoroughly.

Find FIVE towns or small cities in ${name} that are genuinely up-and-coming or underrated. Rules:

- Skip the obvious answers. If it's already on every "best places to live" list, only include it as a deliberate cautionary example of a place that is now too expensive.
- Include a spread: some still cheap and early, some already heating up, at least one that is already priced in.
- For each: the current median or typical home price (2026, with a source), which way prices are moving, the named employers actually hiring there, and what the town was historically built on.
- Find the HIDDEN CARRYING COST for this state — the thing that decides whether someone can afford to live there and that never appears on a listing. In Florida it's hurricane insurance. In Nevada it's water rights and well failure. In Montana it's wildfire smoke and property tax reappraisals. Every state has one. Find ${name}'s.
- For each town, find the honest downsides. Real ones. If you can't name what's wrong with a place, you haven't researched it.
- Work out WHY each town is invisible — why hasn't anyone heard of it? That reason is usually the same reason it's cheap.

Write terse notes, not prose. Cite your sources.`;

const schemaPrompt = (abbr, name) => `Turn the research notes below into JSON. Output ONLY the JSON object — no fences, no commentary.

{
  "abbr": "${abbr}",
  "name": "${name}",
  "blurb": "One sentence naming the real trade-off in this state. Specific and concrete, not generic.",
  "criteria": [
    { "id": "shortid", "label": "Human label" }
  ],
  "footer": [
    "3-4 things nobody puts in the listing: the carrying cost, the tax situation, the politics, the risk. Concrete numbers where you have them."
  ],
  "towns": [
    {
      "id": "lowercasenospaces",
      "name": "Town",
      "sub": "County · pop. ~00,000",
      "z": "town-${abbr.toLowerCase()}",
      "r": "Town_${abbr}",
      "stage": "early" | "heating" | "late",
      "verified": true,
      "price": 250000,
      "priceLabel": "$250k",
      "delta": "+2.1% this year",
      "note": "Optional. Any nuance about the price that doesn't fit in priceLabel — e.g. a big list-to-sale gap.",
      "scores": { "shortid": 3 },
      "hook": "One sentence that makes someone want to read on.",
      "never": "Why you've never heard of it. The most important sentence on the card.",
      "history": "Two sentences: what it was built on, and what changed.",
      "why": ["three short reasons it's turning now"],
      "jobs": "Who is actually hiring, by name.",
      "get": "What your money actually buys here.",
      "cost": "The carrying cost nobody quotes — insurance, tax, water, whatever it is here.",
      "watch": ["two or three honest downsides"],
      "sources": ["2-4 source names"]
    }
  ]
}

RULES:
- "criteria" must be 4-6 factors that matter IN THIS STATE specifically. Not generic ones. Nevada gets "Water security". Montana gets "Low wildfire risk". Work out what ${name}'s are. Do NOT include price — that's handled separately.
- Every town's "scores" object must have a 1-5 rating for EVERY criterion id you defined. 5 is always good, 1 is always bad. "Low wildfire risk: 5" means barely any fire risk.
- "priceLabel" MUST be a bare figure of 8 characters or fewer. "$250k". "~$180k". Nothing else. No parentheses, no words, no explanation. It goes in a small box next to two other numbers.
- "delta" MUST be 20 characters or fewer. "+2.1% this year". "Flat". "-3% this year". It is a label, not a sentence.
- Anything you want to say about the price beyond those two fields goes in "note" or "cost". That's what they're for.
- "price" is a plain number, no commas or symbols.
- If a town is too small for a reliable median, set "verified": false and put the caveat in "note", not in "priceLabel".
- "stage": early = cheap and the growth hasn't hit the price yet. heating = found, but there's still a window. late = you missed it.
- Exactly five towns. Every string under 40 words. Never invent a number.

RESEARCH NOTES:
`;

export async function POST(req) {
  try {
    const { abbr } = await req.json();
    const name = US[abbr];
    if (!name) return Response.json({ error: "Unknown state" }, { status: 400 });
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: "No ANTHROPIC_API_KEY set on the server." }, { status: 500 });
    }

    // 1. Research with live web search
    const notes = await call([{ role: "user", content: researchPrompt(name) }], true);

    // 2. Structure it (separate call, so search results can't crowd out the JSON)
    const raw = await call([{ role: "user", content: schemaPrompt(abbr, name) + notes }], false);

    // 3. Parse, repairing once if it comes back malformed
    let out;
    try {
      out = extractJson(raw);
    } catch {
      const fixed = await call(
        [{ role: "user", content: `This should be valid JSON but isn't — it may be cut off. Return ONLY the corrected, complete JSON. Shorten strings if needed.\n\n${raw}` }],
        false
      );
      out = extractJson(fixed);
    }

    return Response.json(out);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
