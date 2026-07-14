// Resolve a real landscape photo for a town (Wikimedia Commons search).

import { resolveTownPhoto } from "@/lib/imageSearch";
import { getTownImage, isValidImageUrl } from "@/lib/images";

export async function POST(req) {
  try {
    const { town, stateAbbr, skipUrl } = await req.json();
    if (!town?.name && !town?.id) {
      return Response.json({ error: "Missing town" }, { status: 400 });
    }

    const image = await resolveTownPhoto(town, stateAbbr, skipUrl);
    const fallback = getTownImage(town, stateAbbr);

    return Response.json({
      image: image || fallback,
      source: image ? "wikimedia" : "registry",
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  if (!name) return Response.json({ error: "Missing name" }, { status: 400 });

  const town = {
    name,
    sub: searchParams.get("sub") || "",
    id: searchParams.get("id") || "",
    image: searchParams.get("image") || "",
  };
  const stateAbbr = searchParams.get("state") || "";

  const image = await resolveTownPhoto(town, stateAbbr);
  if (!isValidImageUrl(image)) {
    return Response.json({ error: "No image found" }, { status: 404 });
  }

  return Response.json({ image, source: "wikimedia" });
}
