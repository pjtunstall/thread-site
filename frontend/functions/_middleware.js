/**
 * @param {import('@cloudflare/workers-types').EventContext<unknown, string, Record<string, unknown>>} context
 * @returns {Promise<Response>}
 */
export async function onRequest(context) {
  const response = await context.next();

  const newHeaders = new Headers(response.headers);
  newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
  newHeaders.set("X-Content-Type-Options", "nosniff");
  newHeaders.set(
    "Permissions-Policy",
    'camera=(), microphone=(), geolocation=() xr-spatial-tracking=(self "https://challenges.cloudflare.com")',
  );

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  const nonce = crypto.randomUUID().replace(/-/g, "");

  newHeaders.set(
    "Content-Security-Policy",
    [
      `default-src 'self'`,
      `script-src 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'`,
      `style-src 'self'`,
      `img-src 'self' data:`,
      `font-src 'self'`,
      `connect-src 'self'`,
      `frame-src https://challenges.cloudflare.com`,
      `frame-ancestors 'self'`,
      `base-uri 'none'`,
      `object-src 'none'`,
      `upgrade-insecure-requests`,
      `form-action 'self'`,
      `require-trusted-types-for 'script'; trusted-types policy`,
    ].join("; "),
  );

  return new HTMLRewriter()
    .on("script", {
      element(el) {
        el.setAttribute("nonce", nonce);
      },
    })
    .on("head", {
      element(el) {
        el.append(`<meta name="csp-nonce" content="${nonce}">`, { html: true });
      },
    })
    .transform(
      new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      }),
    );
}
