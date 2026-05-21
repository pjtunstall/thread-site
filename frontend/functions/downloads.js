/**
 * Override stale static downloads.html (hash-era stub). Pages matches this
 * Function before static assets on /downloads.
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const indexRequest = new Request(new URL("/index.html", url), context.request);
  return context.env.ASSETS.fetch(indexRequest);
}
