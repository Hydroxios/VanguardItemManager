import { NextRequest, NextResponse } from "next/server";

const GET = async (
  req: NextRequest,
  { params }: { params: { segments?: string[] } }
) => {
  let { segments } = await params;
  // Remove 'api' if present as the first segment
  if (segments && segments[0] === "api") {
    segments = segments.slice(1);
  }
  // Decode URI content of segments
  if (segments) {
    segments = segments.map((s) => decodeURIComponent(s));
  }
  // Build headers object with only valid string values
  const headers: Record<string, string> = {};
  ["authorization", "x-api-key", "content-type"].forEach((key) => {
    const value = req.headers.get(key);
    if (value) headers[key] = value;
  });
  // Append original query string
  const url = `https://www.bungie.net/Platform/${segments?.join("/") || "health"}`;
  const query = req.nextUrl.search;
  const fullUrl = query ? url + query : url;
  const res = await fetch(fullUrl, {
    headers,
  });
  const data = await res.json();
  return NextResponse.json(data);
};

const POST = async (
  req: NextRequest,
  { params }: { params: { segments?: string[] } }
) => {
  let { segments } = await params;
  // Remove 'api' if present as the first segment
  if (segments && segments[0] === "api") {
    segments = segments.slice(1);
  }
  // Decode URI content of segments
  if (segments) {
    segments = segments.map((s) => decodeURIComponent(s));
  }
  // Build headers object with only valid string values
  const headers: Record<string, string> = {};
  ["authorization", "x-api-key", "content-type"].forEach((key) => {
    const value = req.headers.get(key);
    if (value) headers[key] = value;
  });
  // Append original query string
  const url = `https://www.bungie.net/Platform/${segments?.join("/") || "health"}`;
  const query = req.nextUrl.search;
  const fullUrl = query ? url + query : url;
  const res = await fetch(fullUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(await req.json()),
  });
  const data = await res.json();
  return NextResponse.json(data);
};

export { GET, POST };
