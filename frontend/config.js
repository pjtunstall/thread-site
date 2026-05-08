/**
 * Configuration for client-side integrations.
 *
 * Both sitekeys are public values; the test one always passes, the prod one
 * is bound to by-a-thread.de in the Cloudflare Turnstile dashboard. We
 * select between them by hostname so local development keeps working
 * without round-tripping through a real Turnstile challenge.
 *
 * See: https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */
const TURNSTILE_SITEKEY_TEST = "1x00000000000000000000AA";
const TURNSTILE_SITEKEY_PROD = "0x4AAAAAADLh0P5cnBoA1u2-";

const WORKER_URL = "https://thread-contact.pjtunstall.workers.dev";

function isLocalhost() {
  const { hostname } = window.location;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getTurnstileSitekey() {
  return isLocalhost() ? TURNSTILE_SITEKEY_TEST : TURNSTILE_SITEKEY_PROD;
}

/**
 * Where the contact form posts.
 *
 * In production, once the Worker route on `by-a-thread.de/api/*` is in
 * place, the relative `/api/contact` is same-origin and needs no CORS. For
 * local development we hit the deployed Worker URL directly; the Worker's
 * CORS allow-list includes `localhost`/`127.0.0.1`. Update WORKER_URL if
 * the Worker subdomain ever changes.
 */
export function getContactEndpoint() {
  if (isLocalhost()) {
    return `${WORKER_URL}/api/contact`;
  }
  return "/api/contact";
}
