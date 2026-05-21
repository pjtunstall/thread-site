/** Fallback route for /downloads (middleware normally serves the SPA shell). */
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const assetResponse = await context.env.ASSETS.fetch(
    new Request(new URL("/", url), context.request),
  );
  const headers = new Headers(assetResponse.headers);
  headers.delete("Location");
  return new Response(assetResponse.body, { status: 200, headers });
}
