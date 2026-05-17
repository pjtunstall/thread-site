# By a Thread Website

- [Overview](#overview)
- [Custom elements](#custom-elements)
- [Secrets](#secrets)
- [Content Security Policy](#content-security-policy)
- [Deployment](#deployment)

## Overview

This is a website for people to download my game [By a Thread](https://github.com/pjtunstall/by-a-thread). It includes a contact form and animations of some maze-generating algorithms:

- Backtracker: draws the maze in one long, winding path
- Kruskal: starts with a grid of detached rooms, then carves out passages between them
- Prim: expands in all directions
- Wilson: like Backtracker, but draws many paths simultaneously

The [Custom elements](#custom-elements) section that follows describes how custom elements are used to encapsulate detail and avoid repetition in the HTML. The other sections note some details on how I set up the website on Cloudflare and how I deploy changes. The static files are hosted on Cloudflare. They link to the downloads on GitHub Releases. For the contact form backend, I used a Cloudflare Worker, and, as spam protection, Cloudflare Turnstile (among other measures). I used Resend SMTP (Simple Mail Transfer Protocol) to relay messages from the contact form to my email address.

## Custom elements

Several items in `frontend/index.html` are implemented as custom elements.

### Host and control

In the source and in `control-host.js`, I make use of the following terms:

- Host: The custom element as it appears in the markup, for example `<menu-button label="STORY" data-open-dialog="dlg-story">`. When the component connects, that node ends up with exactly one child: the native interactive element I build. I declare attributes on the host in `index.html`; during upgrade, most of those same attributes are applied to the child as well, so existing modules can keep using `document.querySelector("[data-open-dialog]")` and receive a real `<button>` or `<a>` without depending on the custom element's tag name.

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
- **`Permissions-Policy: camera=(), microphone=(), geolocation=()`**: explicitly disables access to the camera, microphone, and geolocation APIs for this origin and any embedded iframes. The site does not use them; declaring this prevents a script injection from silently requesting them.

Non-HTML responses (JS, CSS, images, fonts) receive only the above. HTML responses additionally receive a Content Security Policy. `NONCE` here is a fresh random value per request:

```
default-src 'self'; script-src 'nonce-NONCE' 'strict-dynamic' https: 'unsafe-inline'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src https://challenges.cloudflare.com; frame-ancestors 'self'; base-uri 'none'; object-src 'none'; upgrade-insecure-requests; form-action 'self'; require-trusted-types-for 'script'; trusted-types policy
```

To evaluate with [CSP Evaluator](https://csp-evaluator.withgoogle.com/), replace `NONCE` with any non-empty string (e.g. `abc123`); the evaluator treats any nonce value as valid.

Notes on specific directives:

- **`script-src 'nonce-NONCE' 'strict-dynamic' https: 'unsafe-inline'`**: `'strict-dynamic'` propagates trust from nonce-bearing scripts to scripts they create dynamically, so Turnstile's API `<script>` (injected by `contact.js`) is allowed without an explicit host allowlist or `'unsafe-inline'`. The last two items, `https:` and `'unsafe-inline'` are recommended as a fallback for very old browsers; all browsers that support `'strict-dynamic'` (i.e. all modern browsers) will ignore them.
- **`style-src 'self'`**: no inline styles exist in the HTML; the codebase uses the `hidden` attribute rather than `style=""` so this directive needs no `'unsafe-inline'`. Turnstile's widget renders entirely inside its `challenges.cloudflare.com` iframe, not on the host page.
- **`connect-src 'self'`**: Turnstile's network I/O happens inside its sandboxed iframe; the contact form submits via `fetch()` to the same-origin Worker.
- **`frame-src https://challenges.cloudflare.com`**: permits only the Turnstile iframe.
- **`img-src 'self' data:`**: `data:` URIs are needed for canvas-rendered images (maze). CSP Evaluator flags this at low severity; the risk is accepted.
- **`base-uri 'none'`**: stricter than `'self'`; prevents `<base>` tag injection entirely.
- **`require-trusted-types-for 'script'; trusted-types policy`**: Allows `frontend/js/trusted-types-boot.js` to define a Trusted Types policy, called `policy`. Now, for any browser that supports Trusted Types (all modern browsers), only strings on my allowlist can be turned into HTML and added to the DOM, and likewise only permitted strings can be inserted as script URLs. (In this case, that's only the Cloudflare Turnstile script that guards the contact form.) Moreover, an attacker can't create another policy of a different name or redefine `policy`. This is overkill for the current project since user input isn't shown to other users, but I implemented it anyway as a learning exercise. If user input was displayed for other users, the Trusted Types system could be used to prevent any code from bypassing the sanitization step.

## Deployment

Deploy changes made to `frontend` with `git push`. Hard refresh in the browser and clear the cache if need be to see the changes.

To deploy changes made to `worker`,

```sh
cd worker
npx wrangler deploy
```
