import { resolveTownClimate } from "@/lib/townClimate";

export const maxDuration = 60;

export async function POST(req) {
  try {
    const { town, stateAbbr } = await req.json();
    if (!town?.name && !town?.id) {
      return Response.json({ ok: false, error: "Missing town" }, { status: 400 });
    }
    const data = await resolveTownClimate(town, stateAbbr);
    return Response.json(data, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err?.message || "Climate lookup failed" },
      { status: 502 }
    );
  }
}
