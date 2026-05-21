/** Serve index.html for /downloads (Pages matches this before static assets). */
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const indexRequest = new Request(new URL("/index.html", url), context.request);
  return context.env.ASSETS.fetch(indexRequest);
}
