# By a Thread Website

- [Overview](#overview)
- [Maze-generating algorithms](#maze-generating-algorithms)
- [Security Headers](#security-headers)
  - [General security headers](#general-security-headers)
  - [Content Security Policy](#content-security-policy)
- [Secrets](#secrets)
- [To run locally](#to-run-locally)
- [Deployment](#deployment)
- [Cloudflare Pages build settings](#cloudflare-pages-build-settings)
- [Frontend architecture](docs/frontend-architecture.md)
- [Modern Web Guidance (Cursor agents)](#modern-web-guidance-cursor-agents)
  - [Install the plugin](#install-the-plugin)
  - [My workaround](#my-workaround)

## Overview

This is a website for people to download my game [By a Thread](https://github.com/pjtunstall/by-a-thread). It includes a contact form and animations of some [maze-generating algorithms](#maze-generating-algorithms).

The static files are hosted on Cloudflare. They link to the downloads on GitHub Releases. For the contact form backend, I used a Cloudflare Worker, and, as spam protection, Cloudflare Turnstile (among other measures). I used [Resend](https://resend.com/docs/send-with-smtp) to relay messages from the contact form to my email address. The [Secrets](#secrets) and [Deployment](#deployment) sections below list what secrets the production environment needs and how changes are deployed. See also [Cloudflare Pages build settings](#cloudflare-pages-build-settings).

[Content Security Policy](#content-security-policy) describes my CSP. I used the project to explore good security practices, although some of the guards I put in place were more for the sake of learning than having any practical benefit for the current site.

[Frontend architecture](docs/frontend-architecture.md) summarizes boot scripts, stylesheet layers, custom elements, and the `frontend/` layout.

## Maze-generating algorithms

- Backtracker: draws the maze in one long, winding path
- Kruskal: starts with a grid of disconnected rooms, then carves out passages between them
- Prim: expands in all directions
- Wilson: like Backtracker, but draws many paths simultaneously

## Security Headers

`frontend/functions/_middleware.js` (a Cloudflare Pages Function) applies security headers to every response, with an additional Content Security Policy on HTML responses only.

### General security headers

All responses receive:

```
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

- **`Referrer-Policy: strict-origin-when-cross-origin`**: sends the full URL as `Referer` for same-origin requests (useful for analytics and server logs) but strips the path and query string for cross-origin requests, sending only the origin. This prevents leaking URL parameters (which may contain tokens or identifiers) to third parties.
- **`X-Content-Type-Options: nosniff`**: instructs the browser not to guess a resource's content type from its bytes if the declared `Content-Type` disagrees. Without this, some browsers would execute a JavaScript file served as `text/plain`, for example.
- **`Permissions-Policy: camera=(), microphone=(), geolocation=()`**: explicitly disables access to the camera, microphone, geolocation APIs for this origin and any embedded iframes. The site does not use them; declaring this prevents a script injection from silently requesting them.

Note: I've not included `xr-spatial-tracking=("https://challenges.cloudflare.com")` in the `Permissions-Policy`; the console errors that refer to spatial tracking come from the Cloudflare Turnstile widget failing to comply with its own policy.

### Content Security Policy

Non-HTML responses (JS, CSS, images, fonts) receive only the above. HTML responses additionally receive a Content Security Policy. `NONCE` here is a fresh random value per request:

```
default-src 'self'; script-src 'nonce-NONCE' 'strict-dynamic' https: 'unsafe-inline'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src https://challenges.cloudflare.com; frame-ancestors 'self'; base-uri 'none'; object-src 'none'; upgrade-insecure-requests; form-action 'self'; trusted-types policy
```

If you want to check how will this adheres to best practices, using [CSP Evaluator](https://csp-evaluator.withgoogle.com/), replace `NONCE` with any non-empty string (e.g. `abc123`); the evaluator treats any nonce value as valid.

Notes on specific directives:

- **`script-src 'nonce-NONCE' 'strict-dynamic' https: 'unsafe-inline'`**: `'strict-dynamic'` propagates trust from nonce-bearing scripts to scripts they create dynamically, so Turnstile's API `<script>` (injected by `contact.js`) is allowed without an explicit host allowlist or `'unsafe-inline'`. The last two items, `https:` and `'unsafe-inline'` are recommended as a fallback for very old browsers; all browsers that support `'strict-dynamic'` (i.e. all modern browsers) will ignore them.
- **`style-src 'self'`**: no inline styles exist in the HTML; the codebase uses the `hidden` attribute rather than `style=""` so this directive needs no `'unsafe-inline'`. Turnstile's widget renders entirely inside its `challenges.cloudflare.com` iframe, not on the host page.
- **`connect-src 'self'`**: Turnstile's network I/O happens inside its sandboxed iframe; the contact form submits via `fetch()` to the same-origin Worker.
- **`frame-src https://challenges.cloudflare.com`**: permits only the Turnstile iframe.
- **`img-src 'self' data:`**: `data:` URIs are needed for canvas-rendered images (maze). CSP Evaluator flags this at low severity; the risk is accepted.
- **`base-uri 'none'`**: stricter than `'self'`; prevents `<base>` tag injection entirely.

As you can read in what follows, the next item doesn't serve much purpose in the website as it stands. It was added as a learning excerise and to satisfy CSP evaluatior rather than to meet an actual need on this site. As it turns out, it can't be activated without blocking the genuinely functional Cloudflare's challenge. I've left it in place but unactivated as a record of how it would be done.

- **`trusted-types policy`**: Only a policy named `policy` may be created ([`frontend/js/trusted-types-boot.js`](frontend/js/trusted-types-boot.js)). Application code uses `trustedHtml()` and `trustedScriptURL()` so only allowlisted HTML and script URLs go through that policy. See [Shared and trusted types](docs/frontend-architecture.md#shared-and-trusted-types).
- **`require-trusted-types-for 'script'` is not set**: Only if it were set, would the policy be enforced. That is to say, every `innerHTML` / `insertAdjacentHTML` / `script.src` assignment on the page would have to use `TrustedHTML` / `TrustedScriptURL`. However, after creating the policy, I discovered that Cloudflare's Challenge Platform (`cdn-cgi/challenge-platform`) bootstrap injects a script as raw `innerHTML`, so that, if I actually enforce my trusted types policy, it would block Cloudflare's script. Without user-generated HTML on the site, mandatory sink enforcement has little benefit, and is not worth breaking Cloudflare protections. I've left the policy for now as a coding convention and allowlist for my own DOM writes.

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

Favor this over direct `npx wrangler deploy` so that dependencies will be subject to the restrictions in `.npmrc` to reduce vulnerabily to supply chain attacks.

## Cloudflare Pages build settings

| Setting                | Value      |
| ---------------------- | ---------- |
| Root directory         | `frontend` |
| Build command          | _(empty)_  |
| Build output directory | `.`        |

I.e. set "build output directory" to the project root, and "root directory" (for deploying the frontend) to `frontend`.

The downloads screen is a second client-side view in the same `index.html` shell, but it should be reachable at `/downloads` (shareable URL, correct back/forward behavior). Serving that path by fetching the `/index.html` asset would not work on Cloudflare Pages: the platform responds to `/index.html` with a 308 redirect to `/`, which would replace `/downloads` in the address bar. Instead, `functions/_middleware.js` handles GET and HEAD `/downloads` by fetching `/` (the same HTML) and returning it as 200 without a `Location` header, so the browser keeps `/downloads` while `view-boot.js` selects the downloads view on first paint. See [Frontend architecture](docs/frontend-architecture.md) for boot scripts, stylesheets, modules, and runtime flow.

## Modern Web Guidance (Cursor agents)

**This section is about a development tool. You can ignore it if you just want to run or deploy the site locally.**

I wanted to use Google's [Modern Web Guidance](https://github.com/GoogleChrome/modern-web-guidance) plugin in Cursor for frontend work, but the upstream CLI (`npx` search/retrieve) was too slow and unreliable for agents here, so [`.cursor/rules/modern-web-guidance.mdc`](.cursor/rules/modern-web-guidance.mdc) tells agents to read the plugin's cached guides on disk instead. The subsections below cover installing the plugin and how this repo differs from the stock workflow.

### Install the plugin

In Cursor, install the **Modern Web Guidance** plugin ([Google Chrome / modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance) in the plugin marketplace). That downloads the skill and a local copy of the guides under your home directory:

```text
~/.cursor/plugins/cache/cursor-public/modern-web-guidance/*/skills/modern-web-guidance/guides/
```

Update the plugin occasionally if you want newer guides; the hash folder name changes when the cache is refreshed.

### My workaround

The plugin's skill tells agents to run `npx modern-web-guidance@latest search ...` (to fetch document ids) and then `retrieve ...` for full markdown of the relevant sections. But, for me, each `npx` call took about a minute and often failed in the sandbox. Therefore this repo's rule [`.cursor/rules/modern-web-guidance.mdc`](.cursor/rules/modern-web-guidance.mdc) tells agents to **read those same markdown files directly** (Glob/Grep/Read on the path above) instead of calling the CLI. Note: Agents need `AGENTS.md` to direct them to read the rule.
