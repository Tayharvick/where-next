// Resolve a real landscape photo for a town (Wikimedia Commons search).

import { resolveTownPhoto } from "@/lib/imageSearch";
import {
  getTownImage,
  getTownImageFallback,
  getTownImageChain,
  isModernHeroPhoto,
  isValidImageUrl,
  US_FALLBACK_IMAGE,
} from "@/lib/images";

export async function POST(req) {
  const { town, stateAbbr, skipUrl } = await req.json();
  if (!town?.name && !town?.id) {
    return Response.json({ image: US_FALLBACK_IMAGE, source: "fallback" });
  }

  let image = null;
  let source = "fallback";

  try {
    image = await resolveTownPhoto(town, stateAbbr, skipUrl);
    if (image) source = "wikimedia";
  } catch {}

  const chain = getTownImageChain(town, stateAbbr);
  const chainFallback = skipUrl
    ? getTownImageFallback(town, skipUrl, stateAbbr)
    : chain.find((url) => isModernHeroPhoto(url)) || getTownImage(town, stateAbbr);

  let resolved = image;
  if (!resolved || !isModernHeroPhoto(resolved)) {
    resolved = chain.find((url) => isModernHeroPhoto(url) && url !== skipUrl) || chainFallback;
  }
  const finalImage =
    isValidImageUrl(resolved) && isModernHeroPhoto(resolved) ? resolved : US_FALLBACK_IMAGE;

  return Response.json({
    image: finalImage,
    source,
  });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  if (!name) {
    return Response.json({ image: US_FALLBACK_IMAGE, source: "fallback" });
  }

  const town = {
    name,
    sub: searchParams.get("sub") || "",
    id: searchParams.get("id") || "",
    image: searchParams.get("image") || "",
  };
  const stateAbbr = searchParams.get("state") || "";

  let image = null;
  try {
    image = await resolveTownPhoto(town, stateAbbr);
  } catch {}

  if (!isValidImageUrl(image) || !isModernHeroPhoto(image)) {
    const chain = getTownImageChain(town, stateAbbr);
    image = chain.find((url) => isModernHeroPhoto(url)) || getTownImage(town, stateAbbr);
  }

  const final = isValidImageUrl(image) && isModernHeroPhoto(image) ? image : US_FALLBACK_IMAGE;

  return Response.json({
    image: final,
    source: final === image && image ? "wikimedia" : "fallback",
  });
}
