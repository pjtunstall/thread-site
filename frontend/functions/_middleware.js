const DOWNLOADS_PATH = "/downloads";

/**
 * @param {string} pathname
 */
function normalizePathname(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/**
 * SPA shell for /downloads. ASSETS.fetch("/index.html") 308s to /; fetch / and
 * return 200 so the browser keeps /downloads in the address bar.
 *
 * @param {import('@cloudflare/workers-types').Env} env
 * @param {URL} url
 * @param {Request} request
 */
async function fetchSpaIndex(env, url, request) {
  const assetResponse = await env.ASSETS.fetch(
    new Request(new URL("/", url), {
      method: request.method,
      headers: request.headers,
    }),
  );

  const headers = new Headers(assetResponse.headers);
  headers.delete("Location");

  return new Response(assetResponse.body, {
    status: 200,
    statusText: "OK",
    headers,
  });
}

/**
 * @param {import('@cloudflare/workers-types').EventContext<unknown, string, Record<string, unknown>>} context
 * @returns {Promise<Response>}
 */
export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  const isDownloadsRoute =
    (request.method === "GET" || request.method === "HEAD") &&
    normalizePathname(url.pathname) === DOWNLOADS_PATH;

  const response = isDownloadsRoute
    ? await fetchSpaIndex(context.env, url, request)
    : await context.next();

  const newHeaders = new Headers(response.headers);
  newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
  newHeaders.set("X-Content-Type-Options", "nosniff");
  newHeaders.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
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
      element: (el) => {
        el.setAttribute("nonce", nonce);
      },
    })
    .on("head", {
      element: (el) => {
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
