/**
 * Contact form Worker for by-a-thread.de.
 *
 * Accepts POST /api/contact with a JSON body, validates the input, verifies
 * the Cloudflare Turnstile token, applies a per-IP rate limit, and forwards
 * the message to Resend for delivery to the configured inbox.
 *
 * Bindings (set via wrangler.jsonc and `wrangler secret put`):
 *   RATE_LIMITER       - rate-limit binding (declared in wrangler.jsonc)
 *   TURNSTILE_SECRET   - Turnstile site secret (secret)
 *   RESEND_API_KEY     - Resend API key (secret)
 *   RESEND_FROM        - "Display Name <verified@sender.tld>" (var or secret)
 *   CONTACT_TO         - destination inbox (secret)
 */

const MAX_BODY_BYTES = 16 * 1024;
/** Keep in sync with `frontend/js/shared/config.js` `CONTACT_FORM_LIMITS`. */
const CONTACT_LIMITS = {
  messageMin: 10,
  messageMax: 4000,
  nameMax: 100,
  subjectMax: 200,
  emailMax: 254,
};
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/;

/**
 * JSON `Response` with `Content-Type: application/json`.
 *
 * @param {object} body
 * @param {number} status
 * @param {Record<string, string>} [extraHeaders]
 * @returns {Response}
 */
function jsonResponse(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

/**
 * @param {Request} request
 * @returns {Promise<{ json: object } | { error: string }>}
 */
async function readJsonBody(request) {
  const declared = parseInt(request.headers.get("Content-Length") || "0", 10);
  if (declared > MAX_BODY_BYTES) {
    return { error: "payload_too_large" };
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return { error: "payload_too_large" };
  }
  try {
    return { json: JSON.parse(text) };
  } catch {
    return { error: "invalid_json" };
  }
}

/**
 * @param {object} body Parsed contact form JSON.
 * @returns {"invalid" | null} `null` when valid; `"invalid"` otherwise.
 */
function validateBody(body) {
  if (typeof body !== "object" || body === null) return "invalid";

  // The claim is that treating whitespace as valid excuses legit users whose
  // browser autofills the form. I don't follow this reasoning. Autofill is more
  // likely to place a URL in the field. If that's a risk, excusing only
  // an all whitespace input doesn't help. If it's not a risk, permitting an all
  // whitespace input needlessly weakens the honeypot.
  const honeypot = typeof body.website === "string" ? body.website.trim() : "";
  if (honeypot) return "invalid";

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (
    !EMAIL_REGEX.test(email) ||
    email.length > CONTACT_LIMITS.emailMax ||
    CONTROL_CHARS_REGEX.test(email)
  ) {
    return "invalid";
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (
    message.length < CONTACT_LIMITS.messageMin ||
    message.length > CONTACT_LIMITS.messageMax
  ) {
    return "invalid";
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length > CONTACT_LIMITS.nameMax || CONTROL_CHARS_REGEX.test(name)) {
    return "invalid";
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  if (
    subject.length > CONTACT_LIMITS.subjectMax ||
    CONTROL_CHARS_REGEX.test(subject)
  ) {
    return "invalid";
  }

  const token =
    typeof body["cf-turnstile-response"] === "string"
      ? body["cf-turnstile-response"]
      : "";
  if (!token) return "invalid";

  return null;
}

/**
 * @param {string} secret Turnstile site secret.
 * @param {string} token `cf-turnstile-response` from the client.
 * @param {string} remoteIp `CF-Connecting-IP` (may be empty).
 * @returns {Promise<boolean>}
 */
async function verifyTurnstile(secret, token, remoteIp) {
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (remoteIp) form.append("remoteip", remoteIp);

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form },
    );
    if (!res.ok) {
      console.error("turnstile siteverify non-2xx", res.status);
      return false;
    }
    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.error("turnstile siteverify threw", err);
    return false;
  }
}

/**
 * @param {object} env Worker bindings (`RESEND_FROM`, `CONTACT_TO`, ...).
 * @param {object} body Validated contact form fields.
 * @returns {{ from: string, to: Array<string>, reply_to: string, subject: string, text: string }}
 */
function buildEmailPayload(env, body) {
  const from = env.RESEND_FROM || "Contact <onboarding@resend.dev>";
  const subject = body.subject
    ? `[Site] ${body.subject}`
    : "[Site] New contact form message";
  const text = [
    `From: ${body.name || "(anonymous)"} <${body.email}>`,
    body.subject ? `Subject: ${body.subject}` : null,
    "",
    body.message,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    from,
    to: [env.CONTACT_TO],
    reply_to: body.email,
    subject,
    text,
  };
}

/**
 * @param {object} env Worker bindings (`RESEND_API_KEY`, ...).
 * @param {{ from: string, to: Array<string>, reply_to: string, subject: string, text: string }} payload
 */
async function sendViaResend(env, payload) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch (e) {
      console.error("resend response body read failed", e);
    }
    console.error("resend send failed", res.status, detail);
    throw new Error(`resend_${res.status}`);
  }
}

// The default export is an object with a fetch method: { async fetch(request,
// env) {} }. The workerd runtime calls this method for every HTTP request that
// is routed to this worker. This fetch is not the global fetch, as used in
// `sendViaResend`.
//
// The request is routed from by-a-thread.de or www.by-a-thread.de under
// "/api/*". The client calls POST /api/contact. The origin is the same, hence
// no need for CORS.
export default {
  /**
   * @param {Request} request
   * @param {object} env Worker bindings (rate limiter, Turnstile, Resend, ...).
   * @returns {Promise<Response>}
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/contact") {
      return jsonResponse({ ok: false, error: "not_found" }, 404);
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "method_not_allowed" }, 405, {
        Allow: "POST",
      });
    }

    // Apply rate limiting.
    if (!env.RATE_LIMITER) {
      console.error("missing RATE_LIMITER binding");
      return jsonResponse({ ok: false, error: "server_misconfigured" }, 500);
    }
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    try {
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) {
        return jsonResponse({ ok: false, error: "rate_limited" }, 429);
      }
    } catch (err) {
      console.error("rate limit check threw", err);
      return jsonResponse({ ok: false, error: "rate_limit_unavailable" }, 503);
    }

    // Parse the request body into JSON...
    const { json: body, error: parseErr } = await readJsonBody(request);
    if (parseErr) {
      return jsonResponse({ ok: false, error: parseErr }, 400);
    }
    const validationErr = validateBody(body); // ...and validate it.
    if (validationErr) {
      return jsonResponse({ ok: false, error: validationErr }, 400);
    }

    // Do we have permission from Turnstile?
    if (!env.TURNSTILE_SECRET) {
      console.error("missing TURNSTILE_SECRET binding");
      return jsonResponse({ ok: false, error: "server_misconfigured" }, 500);
    }
    const turnstileOk = await verifyTurnstile(
      env.TURNSTILE_SECRET,
      body["cf-turnstile-response"],
      ip,
    );
    if (!turnstileOk) {
      return jsonResponse({ ok: false, error: "turnstile_failed" }, 403);
    }

    // Send message to Resend, for Resend to relay to the contact email address.
    if (!env.RESEND_API_KEY) {
      console.error("missing RESEND_API_KEY");
      return jsonResponse({ ok: false, error: "server_misconfigured" }, 500);
    }
    if (!env.CONTACT_TO) {
      console.error("missing CONTACT_TO binding");
      return jsonResponse({ ok: false, error: "server_misconfigured" }, 500);
    }
    try {
      await sendViaResend(env, buildEmailPayload(env, body));
    } catch {
      return jsonResponse({ ok: false, error: "send_failed" }, 502);
    }

    // Success! Let the user know.
    return jsonResponse({ ok: true }, 200);
  },
};
