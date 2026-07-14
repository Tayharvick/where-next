// Future town facts endpoint — wire to Census, school ratings, walk scores, etc.
// UI reads town.facts on each card; this route enriches towns on demand.

import { FACT_KEYS, PENDING_LABEL } from "@/lib/townFacts";

export async function GET(req) {
  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) {
    return Response.json({ error: "Missing id query parameter" }, { status: 400 });
  }

  // Placeholder: return empty facts until external sources are connected.
  const facts = Object.fromEntries(FACT_KEYS.map((key) => [key, null]));

  return Response.json({
    id,
    facts,
    status: "pending",
    message: `Facts for ${id} are not yet available. ${PENDING_LABEL}.`,
  });
}
