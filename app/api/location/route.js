import { resolveTownLocation } from "@/lib/townLocation";
import { parseTownGeo } from "@/lib/geo";

export const maxDuration = 60;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim() || "";
  const name = searchParams.get("name")?.trim() || "";
  const sub = searchParams.get("sub")?.trim() || "";
  const state = searchParams.get("state")?.trim() || "";

  if (!name && !id) {
    return Response.json({ ok: false, error: "Missing name or id" }, { status: 400 });
  }

  const town = { id: id || name.toLowerCase().replace(/\s+/g, "-"), name, sub };

  try {
    const data = await resolveTownLocation(town, state || parseTownGeo(town, state).state);
    return Response.json(data, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err?.message || "Location lookup failed" },
      { status: 502 }
    );
  }
}

export async function POST(req) {
  try {
    const { town, stateAbbr } = await req.json();
    if (!town?.name && !town?.id) {
      return Response.json({ ok: false, error: "Missing town" }, { status: 400 });
    }
    const data = await resolveTownLocation(town, stateAbbr);
    return Response.json(data, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err?.message || "Location lookup failed" },
      { status: 502 }
    );
  }
}
