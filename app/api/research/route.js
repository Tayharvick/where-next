// Researches on demand: either a whole state, or a free-text description of what someone wants.
// Live web search, then structured output. This is the piece that needs a server.

import { US } from "@/lib/data";
import { enrichTownImages } from "@/lib/imageSearch";
import { IMAGE_PROMPT_RULE } from "@/lib/images";
import { FACTS_PROMPT_RULES, factsSchemaJson } from "@/lib/townFacts";

const MODEL = "claude-sonnet-4-6";
const LOG_PREFIX = "[/api/research]";

export const maxDuration = 300;

function logStep(step, detail = {}) {
  console.log(
    JSON.stringify({
      scope: LOG_PREFIX,
      level: "info",
      step,
      ...detail,
      at: new Date().toISOString(),
    })
  );
}

function logError(step, err, detail = {}) {
  const payload = {
    scope: LOG_PREFIX,
    level: "error",
    step,
    errorMessage: err?.message ?? String(err),
    errorName: err?.name ?? "Error",
    stack: err?.stack ?? null,
    ...detail,
    at: new Date().toISOString(),
  };
  console.error(JSON.stringify(payload));
  return payload;
}

async function call(messages, useSearch, stepLabel) {
  logStep(`${stepLabel}:start`, { useSearch, messageCount: messages.length });

  const body = { model: MODEL, max_tokens: 8000, messages };
  if (useSearch) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 12 }];

  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    logError(`${stepLabel}:fetch_failed`, err);
    throw err;
  }

  logStep(`${stepLabel}:response_received`, { status: res.status, ok: res.ok });

  let data;
  try {
    data = await res.json();
  } catch (err) {
    logError(`${stepLabel}:json_parse_failed`, err, { status: res.status });
    throw err;
  }

  if (data.error) {
    const apiErr = new Error(data.error.message || "API error");
    logError(`${stepLabel}:anthropic_error`, apiErr, { anthropicError: data.error });
    throw apiErr;
  }

  const text = (data.content || [])
    .map((b) => (b.type === "text" ? b.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();

  logStep(`${stepLabel}:complete`, {
    textLength: text.length,
    contentBlocks: (data.content || []).length,
    stopReason: data.stop_reason ?? null,
  });

  return text;
}

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

const RULES = `
- Skip the obvious answers. If a town is already on every "best places to live" list, only include it as a deliberate cautionary example of somewhere now too expensive.
- Include a spread of timing: some still cheap and early, some heating up, at least one already priced in.
- For each: the current median or typical home price (2026, sourced), which way prices are moving, the named employers actually hiring, and what the town was historically built on.
- Find the HIDDEN CARRYING COST — the thing that decides whether someone can afford to live there and that never appears on a listing. In Florida it's hurricane insurance. In Nevada it's water rights and well failure. In Montana it's wildfire smoke and property tax reappraisals. Find it.
- Find the honest downsides. Real ones. If you can't name what's wrong with a place, you haven't researched it.
- Work out WHY each town is invisible. That reason is usually the same reason it's cheap.
`;

const stateResearch = (name) => `Research ${name} for someone looking to relocate there in 2026. Search the web thoroughly.

Find FIVE towns or small cities in ${name} that are genuinely up-and-coming or underrated.
${RULES}
Write terse notes, not prose. Cite your sources.`;

const wantResearch = (want) => `Someone is looking for somewhere to live in the United States. In their own words:

"${want}"

Search the web thoroughly and find FIVE real towns or small cities that fit what they're asking for. Take every constraint seriously — budget, size, proximity, climate, work. If two of their wants are in tension (e.g. cheap AND coastal AND near a major attraction), say so plainly and show them the different trades.
${RULES}
Write terse notes, not prose. Cite your sources.`;

const schema = (headline, blurbInstruction) => `Turn the research notes below into JSON. Output ONLY the JSON object — no fences, no commentary.

{
  "name": ${JSON.stringify(headline)},
  "blurb": "${blurbInstruction}",
  "criteria": [ { "id": "shortid", "label": "Human label" } ],
  "footer": [ "3-4 things nobody puts in the listing: the carrying cost, the tax situation, the risk. Concrete numbers where you have them." ],
  "towns": [
    {
      "id": "lowercasenospaces",
      "name": "Town",
      "sub": "County, ST · pop. ~00,000",
      "z": "town-st",
      "r": "Town_ST",
      "stage": "early" | "heating" | "late",
      "verified": true,
      "price": 250000,
      "priceLabel": "$250k",
      "delta": "+2.1% this year",
      "note": "Optional. Nuance about the price that doesn't fit in priceLabel.",
      "hook": "One sentence that makes someone want to read on.",
      "image": "https://... publicly accessible URL of this town or its best-known landmark",
      "facts": ${factsSchemaJson()},
      "never": "Why you've never heard of it. The most important sentence on the card.",
      "history": "Two sentences: what it was built on, and what changed.",
      "why": ["three short reasons it's turning now"],
      "jobs": "Who is actually hiring, by name.",
      "get": "What their money actually buys here.",
      "cost": "The carrying cost nobody quotes — insurance, tax, water, whatever it is here.",
      "watch": ["two or three honest downsides"],
      "sources": ["2-4 source names"]
    }
  ]
}

RULES:
- "criteria" must be 4-6 factors that actually matter for THIS search. Not generic ones. Work out what they are. Do NOT include price — that's handled separately.
- Every town's "scores" object must have a 1-5 rating for EVERY criterion id you defined. Add it as "scores": { "shortid": 3 }. 5 is always good, 1 is always bad.
- "priceLabel" MUST be a bare figure of 8 characters or fewer. "$250k". "~$180k". No words, no parentheses.
- "delta" MUST be 20 characters or fewer. It's a label, not a sentence. Anything longer goes in "note".
- "price" is a plain number, no commas or symbols.
- If a town is too small for a reliable median, set "verified": false and put the caveat in "note".
- "stage": early = the growth hasn't hit the price yet. heating = found, but there's a window. late = you missed it.
- "z" is the Zillow city slug, "r" is the Realtor.com slug. Get the state right.
- ${IMAGE_PROMPT_RULE}
${FACTS_PROMPT_RULES.map((r) => `- ${r}`).join("\n")}
- Exactly five towns. Every string under 40 words. Never invent a number.

RESEARCH NOTES:
`;

export async function POST(req) {
  let step = "init";

  try {
    step = "parse_request";
    logStep(step);
    const { abbr, want } = await req.json();
    logStep("request_parsed", {
      hasWant: Boolean(want?.trim()),
      abbr: abbr ?? null,
    });

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: "No ANTHROPIC_API_KEY set on the server." }, { status: 500 });
    }

    let notes, head;

    if (want && want.trim()) {
      step = "research_call_want";
      notes = await call([{ role: "user", content: wantResearch(want.trim()) }], true, step);
      head = schema(
        "Your search",
        "One sentence naming the real trade-off in what they asked for. Specific and concrete. If their wants are in tension, say which one has to give."
      );
    } else {
      const name = US[abbr];
      if (!name) return Response.json({ error: "Unknown state" }, { status: 400 });
      step = "research_call_state";
      notes = await call([{ role: "user", content: stateResearch(name) }], true, step);
      head = schema(name, "One sentence naming the real trade-off in this state. Specific and concrete, not generic.");
    }

    step = "schema_call";
    const raw = await call([{ role: "user", content: head + notes }], false, step);
    logStep("schema_raw_received", { rawLength: raw.length, rawPreview: raw.slice(0, 200) });

    let out;
    step = "extract_json";
    try {
      out = extractJson(raw);
      logStep("extract_json:success", { townCount: out.towns?.length ?? 0 });
    } catch (parseErr) {
      logError("extract_json:failed", parseErr, { rawLength: raw.length });
      step = "extract_json_retry";
      const fixed = await call(
        [{ role: "user", content: `This should be valid JSON but isn't — it may be cut off. Return ONLY the corrected, complete JSON. Shorten strings if needed.\n\n${raw}` }],
        false,
        step
      );
      logStep("extract_json_retry_raw_received", { fixedLength: fixed.length });
      out = extractJson(fixed);
      logStep("extract_json_retry:success", { townCount: out.towns?.length ?? 0 });
    }

    if (abbr) out.abbr = abbr;

    if (out.towns?.length) {
      step = "enrich_town_images";
      logStep(step, { townCount: out.towns.length, townNames: out.towns.map((t) => t.name) });
      try {
        await enrichTownImages(out.towns, abbr || undefined, (townStep, townDetail) => {
          logStep(`enrich_town_images:${townStep}`, townDetail);
        });
        logStep("enrich_town_images:complete");
      } catch (imageErr) {
        logError("enrich_town_images:failed", imageErr, {
          townCount: out.towns.length,
        });
        throw imageErr;
      }
    } else {
      logStep("enrich_town_images:skipped", { reason: "no towns in payload" });
    }

    step = "response";
    logStep(step, { townCount: out.towns?.length ?? 0 });
    return Response.json(out);
  } catch (e) {
    const logged = logError(step, e);
    return Response.json(
      {
        error: e.message,
        step,
        errorName: logged.errorName,
        stack: logged.stack,
      },
      { status: 500 }
    );
  }
}
