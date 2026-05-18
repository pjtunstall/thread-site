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

/**
 * @returns {string}
 */
function isLocalhost() {
  const { hostname } = window.location;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * @returns {string}
 */
export function getTurnstileSitekey() {
  return isLocalhost() ? TURNSTILE_SITEKEY_TEST : TURNSTILE_SITEKEY_PROD;
}

// Where the contact form posts. The site posts to the same-origin Worker route
// mounted at `/api/contact`. This works in production and in local setups that
// proxy that path.
export const CONTACT_ENDPOINT = "/api/contact";

// Contact form field bounds enforced by the Worker (`validateBody` in
// `worker/src/index.js`). Keep these values identical on both sides.
export const CONTACT_FORM_LIMITS = {
  messageMin: 10,
  messageMax: 4000,
  nameMax: 100,
  subjectMax: 200,
  emailMax: 254,
};
