# By a Thread Website

- [Overview](#overview)
- [Custom elements](#custom-elements)
- [Content Security Policy](#content-security-policy)
- [Secrets](#secrets)
- [To run locally](#to-run-locally)
- [Deployment](#deployment)

## Overview

This is a website for people to download my game [By a Thread](https://github.com/pjtunstall/by-a-thread). It includes a contact form and animations of some maze-generating algorithms:

- Backtracker: draws the maze in one long, winding path
- Kruskal: starts with a grid of disconnected rooms, then carves out passages between them
- Prim: expands in all directions
- Wilson: like Backtracker, but draws many paths simultaneously

The static files are hosted on Cloudflare. They link to the downloads on GitHub Releases. For the contact form backend, I used a Cloudflare Worker, and, as spam protection, Cloudflare Turnstile (among other measures). I used Resend SMTP (Simple Mail Transfer Protocol) to relay messages from the contact form to my email address.

The [Custom elements](#custom-elements) section that follows describes how I used custom elements are to encapsulate detail and avoid repetition in the HTML. [Content Security Policy](#content-security-policy) details my CSP; I used the project to explore good security practices, although some of the guards I put in place were more for the sake of learning than having any practical benefit for the current site. The [Secrets](#secrets) and [Deployment](#deployment) sections contain some notes on how I set up the website on Cloudflare: what secrets it needed and how changes are deployed.

## Custom elements

Several items in `frontend/index.html` are implemented as custom elements.

### Host and control

In the source and in `control-host.js`, I make use of the following terms:

- Host: The custom element as it appearI deploy s in the markup, for example `<menu-button label="STORY" data-open-dialog="dlg-story">`. When the component connects, that node ends up with exactly one child: the native interactive element I build. I declare attributes on the host in `index.html`; during upgrade, most of those same attributes are applied to the child as well, so existing modules can keep using `document.querySelector("[data-open-dialog]")` and receive a real `<button>` or `<a>` without depending on the custom element's tag name.

- Control: That inner native element, either `<button type="button">` or, when the host carries an `href`, an `<a>`. I call it a _control_ because "button" would be inaccurate when the interactive element is an anchor.

Shared logic for creating the control, mirroring attributes from host to control, and appending the right children lives in `frontend/js/shared/control-host.js`. Registration order for the custom elements is in `frontend/js/ui/site-controls.js`.

### Which elements exist

These are the custom elements. They're defined in this order in `site-controls.js`, although the only requirement is that `menu-card` must be defined before `menu-button`.

| Custom element | Role |
| --- | --- |
| `<menu-card>` | Flip-card faces + label; optional icon from `data-menu-icon` / `menu-card-icons.js`. |
| `<menu-button>` | Ghost nav row: inner control gets `btn btn--ghost` and a `<menu-card>`. |
| `<primary-button>` | Primary CTA style (`btn btn--primary`), icon + label from attributes. |
| `<menu-toggle-button>` | Hamburger menu opener; inner control gets `data-menu-toggle` (so it stays a real `HTMLButtonElement`). |
| `<theme-toggle-button>` | Theme switcher: inner control is a `<button>` with `data-theme-toggle` and the sun/moon dual-label markup. Same host -> control mirroring as `<menu-toggle-button>`; `theme.js` resolves the control via `getThemeToggle()` after `defineSiteControlElements()`. |
| `<carousel-arrow-button>` | Carousel chevrons; `arrow="left"` or `arrow="right"` picks SVG and layout class. |

## Secrets

The worker uses these secrets:

- `RESEND_API_KEY` - Resend API key from [resend.com/api-keys](https://resend.com/api-keys).
- `RESEND_FROM` - Sender identity for outgoing mail (for example `By a Thread <contact@by-a-thread.de>`).
- `CONTACT_TO` - Inbox recipient for contact-form messages.
- `TURNSTILE_SECRET` - Cloudflare Turnstile secret key.

Add them in Cloudflare with Wrangler (run from the `worker` directory):

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM
npx wrangler secret put CONTACT_TO
npx wrangler secret put TURNSTILE_SECRET
```

## Content Security Policy

`frontend/functions/_middleware.js` (a Cloudflare Pages Function) applies security headers to every response, with an additional Content Security Policy on HTML responses only.

All responses receive:

```
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Notes on these headers:

- **`Referrer-Policy: strict-origin-when-cross-origin`**: sends the full URL as `Referer` for same-origin requests (useful for analytics and server logs) but strips the path and query string for cross-origin requests, sending only the origin. This prevents leaking URL parameters (which may contain tokens or identifiers) to third parties.
- **`X-Content-Type-Options: nosniff`**: instructs the browser not to guess a resource's content type from its bytes if the declared `Content-Type` disagrees. Without this, some browsers would execute a JavaScript file served as `text/plain`, for example.
- **`Permissions-Policy: camera=(), microphone=(), geolocation=()`**: explicitly disables access to the camera, microphone, geolocation APIs for this origin and any embedded iframes. The site does not use them; declaring this prevents a script injection from silently requesting them.

Note: I've not included `xr-spatial-tracking=("https://challenges.cloudflare.com")` in the `Permissions-Policy`; the console errors that refer to spatial tracking come from the Cloudflare Turnstile widget failing to comply with its own policy.

Non-HTML responses (JS, CSS, images, fonts) receive only the above. HTML responses additionally receive a Content Security Policy. `NONCE` here is a fresh random value per request:

```
default-src 'self'; script-src 'nonce-NONCE' 'strict-dynamic' https: 'unsafe-inline'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src https://challenges.cloudflare.com; frame-ancestors 'self'; base-uri 'none'; object-src 'none'; upgrade-insecure-requests; form-action 'self'; trusted-types policy
```

To evaluate with [CSP Evaluator](https://csp-evaluator.withgoogle.com/), replace `NONCE` with any non-empty string (e.g. `abc123`); the evaluator treats any nonce value as valid.

Notes on specific directives:

- **`script-src 'nonce-NONCE' 'strict-dynamic' https: 'unsafe-inline'`**: `'strict-dynamic'` propagates trust from nonce-bearing scripts to scripts they create dynamically, so Turnstile's API `<script>` (injected by `contact.js`) is allowed without an explicit host allowlist or `'unsafe-inline'`. The last two items, `https:` and `'unsafe-inline'` are recommended as a fallback for very old browsers; all browsers that support `'strict-dynamic'` (i.e. all modern browsers) will ignore them.
- **`style-src 'self'`**: no inline styles exist in the HTML; the codebase uses the `hidden` attribute rather than `style=""` so this directive needs no `'unsafe-inline'`. Turnstile's widget renders entirely inside its `challenges.cloudflare.com` iframe, not on the host page.
- **`connect-src 'self'`**: Turnstile's network I/O happens inside its sandboxed iframe; the contact form submits via `fetch()` to the same-origin Worker.
- **`frame-src https://challenges.cloudflare.com`**: permits only the Turnstile iframe.
- **`img-src 'self' data:`**: `data:` URIs are needed for canvas-rendered images (maze). CSP Evaluator flags this at low severity; the risk is accepted.
- **`base-uri 'none'`**: stricter than `'self'`; prevents `<base>` tag injection entirely.
- **`trusted-types policy`**: Only a policy named `policy` may be created (see the inline boot script in `index.html` and `frontend/js/trusted-types-boot.js`), and such a policy can only be created once. Application code uses `trustedHtml()` and `trustedScriptURL()` so only allowlisted HTML and script URLs go through that policy.
- **`require-trusted-types-for 'script'` is not set**: If set, the policy would be enforced. That is to say, every `innerHTML` / `insertAdjacentHTML` / `script.src` assignment on the page would have to use `TrustedHTML` / `TrustedScriptURL`. However, on trying it, I discovered that Cloudflare's Challenge Platform bootstrap (injected on HTML responses, `cdn-cgi/challenge-platform`) uses raw `innerHTML`, so enforcement blocked it. Without user-generated HTML on the site, mandatory sink enforcement bought little compared with keeping that injection working. The policy remains as a coding convention and allowlist for my own DOM writes; the browser does not reject third-party raw strings on those sinks.

## To run locally

For local development, run this from the project root:

```sh
npm run dev
```

(`node serve.mjs` works too.) Plain static servers such as `python3 -m http.server` do not rewrite `/downloads` to `index.html`, so direct visits to that path will result in a 404 "page not found" error.

## Deployment

Deploy changes made to `frontend` with `git push`. Hard refresh in the browser and clear the cache if need be to see the changes.

To deploy changes made to `worker`,

```sh
cd worker
npm ci # ...if necessary, to clean install dependencies
npm run deploy # Runs `wrangler deploy`; see `worker/package.json`.
```

Favor this over directly direct `npx wrangler deploy` so that dependencies will be subject to the restrictions in `.npmrc` to reduce vulnerabily to supply chain attacks.

##Cloudflare Pages build settings

| Setting                | Value      |
| ---------------------- | ---------- |
| Root directory         | `frontend` |
| Build command          | _(empty)_  |
| Build output directory | `.`        |

I.e. set "build output directory" to the project root, and "root directory" (for deploying the frontend) to `frontend`.

Pages also 308-redirects `/index.html` to `/`; `functions/_middleware.js` serves the HTML for `/` as 200 on `/downloads` so the address bar stays on that path.
