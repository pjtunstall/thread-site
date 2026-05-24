# By a Thread Website

- [Overview](#overview)
- [Maze-generating algorithms](#maze-generating-algorithms)
- [Content Security Policy](#content-security-policy)
- [Secrets](#secrets)
- [To run locally](#to-run-locally)
- [Deployment](#deployment)
- [Cloudflare Pages build settings](#cloudflare-pages-build-settings)
- [Frontend architecture](#frontend-architecture)
  - [Boot scripts (head, blocking)](#boot-scripts-head-blocking)
  - [Stylesheets (cascade order)](#stylesheets-cascade-order)
  - [`01-foundation.css`](#01-foundationcss)
  - [`02-main.css`](#02-maincss)
  - [`03-buttons-nav-motion.css`](#03-buttons-nav-motioncss)
  - [`04-dialog-contact.css`](#04-dialog-contactcss)
  - [Application JavaScript](#application-javascript)
  - [HTML shell vs injected UI](#html-shell-vs-injected-ui)
  - [Navigation](#navigation)
  - [Init order in `index.js`](#init-order-in-indexjs)
  - [DOM hooks](#dom-hooks)
  - [`pages/`](#pages)
  - [`ui/`](#ui)
  - [`maze/`](#maze)
  - [Shared and trusted types](#shared-and-trusted-types)
  - [Folder structure (sketch)](#folder-structure-sketch)
  - [Runtime flow](#runtime-flow)
- [Custom elements](#custom-elements)
  - [Host and control](#host-and-control)
  - [Which elements exist](#which-elements-exist)
- [Modern Web Guidance (Cursor agents)](#modern-web-guidance-cursor-agents)
  - [Install the plugin](#install-the-plugin)
  - [What agents do here (not the upstream CLI)](#what-agents-do-here-not-the-upstream-cli)

## Overview

This is a website for people to download my game [By a Thread](https://github.com/pjtunstall/by-a-thread). It includes a contact form and animations of some [maze-generating algorithms](#maze-generating-algorithms).

The static files are hosted on Cloudflare. They link to the downloads on GitHub Releases. For the contact form backend, I used a Cloudflare Worker, and, as spam protection, Cloudflare Turnstile (among other measures). I used [Resend](https://resend.com/docs/send-with-smtp) to relay messages from the contact form to my email address. The [Secrets](#secrets) and [Deployment](#deployment) sections below list what secrets the production environment needs and how changes are deployed. See also [Cloudflare Pages build settings](#cloudflare-pages-build-settings).

[Content Security Policy](#content-security-policy) describes my CSP. I used the project to explore good security practices, although some of the guards I put in place were more for the sake of learning than having any practical benefit for the current site.

[Frontend architecture](#frontend-architecture) summarizes boot scripts, CSS layers, and the `frontend/` layout. [Custom elements](#custom-elements) documents my use of custom elements to encapsulate detail and avoid repetition in the HTML.

## Maze-generating algorithms

- Backtracker: draws the maze in one long, winding path
- Kruskal: starts with a grid of disconnected rooms, then carves out passages between them
- Prim: expands in all directions
- Wilson: like Backtracker, but draws many paths simultaneously

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
- **`trusted-types policy`**: Only a policy named `policy` may be created ([`frontend/js/trusted-types-boot.js`](frontend/js/trusted-types-boot.js)). Application code uses `trustedHtml()` and `trustedScriptURL()` so only allowlisted HTML and script URLs go through that policy. See [Shared and trusted types](#shared-and-trusted-types).
- **`require-trusted-types-for 'script'` is not set**: Only if it were set, would the policy be enforced. That is to say, every `innerHTML` / `insertAdjacentHTML` / `script.src` assignment on the page would have to use `TrustedHTML` / `TrustedScriptURL`. However, after creating the policy, I discovered that Cloudflare's Challenge Platform bootstrap (injected on HTML responses, `cdn-cgi/challenge-platform`) injects a script as raw `innerHTML`, so enforcement would block Cloudflare's script. Without user-generated HTML on the site, mandatory sink enforcement would have little benefit, not worth breaking Cloudflare protections. I've left the policy for now as a coding convention and allowlist for my own DOM writes.

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

The downloads screen is a second client-side view in the same `index.html` shell, but it should be reachable at `/downloads` (shareable URL, correct back/forward behavior). Serving that path by fetching the `/index.html` asset would not work on Cloudflare Pages: the platform responds to `/index.html` with a 308 redirect to `/`, which would replace `/downloads` in the address bar. Instead, `functions/_middleware.js` handles GET and HEAD `/downloads` by fetching `/` (the same HTML) and returning it as 200 without a `Location` header, so the browser keeps `/downloads` while `view-boot.js` selects the downloads view on first paint.

## Frontend architecture

The static site under `frontend/` uses early boot scripts, layered CSS, and ES modules. Custom elements and how each [maze-generating algorithm](#maze-generating-algorithms) looks on screen are covered above; CSP is under [Content Security Policy](#content-security-policy).

### Boot scripts (head, blocking)

Three classic scripts run in `<head>` before stylesheets load, in a fixed order. They're intentionally small and synchronous so the first paint matches the correct theme, route, and font readiness without waiting for [`pages/index.js`](frontend/js/pages/index.js).

| Script | Sets on `<html>` | Covers |
| --- | --- | --- |
| [`theme-boot.js`](frontend/js/theme-boot.js) | `data-theme="light"` or `"dark"` | Stored `theme-preference` from `localStorage`, else `prefers-color-scheme`, so themed colors are correct before CSS paints. |
| [`view-boot.js`](frontend/js/view-boot.js) | `data-initial-view="home"` or `"downloads"` | Maps `location.pathname` for first-paint view rules in [`02-main.css`](frontend/css/02-main.css) when the URL is `/downloads` (see [Cloudflare Pages build settings](#cloudflare-pages-build-settings)). |
| [`fonts-boot.js`](frontend/js/fonts-boot.js) | class `fonts-ready` | `document.fonts.load()` for Neucha on every view; Macondo too when `data-initial-view="downloads"`. Hero copy and the downloads note stay hidden until load finishes or fails. |

[`trusted-types-boot.js`](frontend/js/trusted-types-boot.js) (a `module` script) registers the Trusted Types policy; see [Shared and trusted types](#shared-and-trusted-types). It's not on the theme/view/font paint chain.

The main application module loads at the end of `<body>`; see [Application JavaScript](#application-javascript).

### Stylesheets (cascade order)

Stylesheets are linked in numeric order in [`index.html`](frontend/index.html). Files load in parallel; rules apply in list order.

### `01-foundation.css`

| Area | Covers |
| --- | --- |
| Fonts | `@font-face` for Neucha and Macondo. |
| Design tokens | `:root` and `:root[data-theme="dark"]`: z-index stack, colors (oklch), typography scale, radii, shadows, carousel-arrow colors, meander/corner SVG data URLs. |
| Document base | Universal `box-sizing`, `::selection`, `html` scrollbar, `body` flex centering and default type. |
| Maze layer | `.maze` fixed full-viewport canvas behind content (`--tile-size`, `--z-maze`). |

### `02-main.css`

| Area | Covers |
| --- | --- |
| Main shell | `main`, `.view-home`, `.view-downloads`, `[data-view][hidden]`. |
| First-paint routing | `html[data-initial-view="downloads"]` show/hide rules; `html[data-initial-view]` opacity guard until `index.js` runs. |
| Site menu chrome | `.menu-anchor`, `.menu-wrap` (viewport-fixed hamburger anchor). |
| Hero typography | `.hero-title`, `.hero-tagline`; `html:not(.fonts-ready)` hide until fonts load. |
| Hero screenshot | `.hero-image` and `::before` / `::after` (Greek-key meander frame, corner disks), inner `img`. |
| Carousel controls | `.carousel-arrow`, `--left` / `--right`, hover/focus (tokens from foundation). |
| Motion (hero / SPA) | `fade-in-up`, initial-entrance classes, home hero-image fade-in, View Transitions (`spa-view`, `hero-heading`) paired with `runViewChange` in `index.js`. |

### `03-buttons-nav-motion.css`

| Area | Covers |
| --- | --- |
| Buttons | `.btn`, `.btn--primary`, `.btn--ghost`, labels, SVG sizing, brand icons. |
| Hamburger | `.menu-toggle` bar animation to X when `aria-expanded`. |
| Nav panels | `.menu-panel`, `#site-menu`, `menu-button` / `menu-toggle-button` / `theme-toggle-button` layout. |
| Flip cards | `.menu-card`, `__face`, staggered `--flip-duration`, open-state 3D flip (with `prefers-reduced-motion` fallback). |
| Theme control | `.theme-toggle-views` sun/moon swap by `data-theme`. |
| Downloads view | `.downloads-page`, `.downloads-note`, `.downloads-nav`, `.downloads-back-link`; Macondo on download faces; `fonts-ready` note animation. |
| Shared motion | Button hover/active transitions, menu-toggle transitions, `.hero-cta` / downloads entrance animations, `@keyframes fade-in-up`. |
| Wide breakpoint | Larger primary buttons and menu-card faces at `>= 768px`. |

### `04-dialog-contact.css`

| Area | Covers |
| --- | --- |
| Dialog shell | `dialog`, `[open]`, transparent `::backdrop`, `.dialog__scrim` (blurred overlay; blur token from foundation). |
| Dialog chrome | `.dialog__panel`, `__inner`, `__title`, `__body`, `__footer`, `__close`, links and prose. |
| Contact | `.contact-form` fields, labels, validation/error states, autofill styling, honeypot, status lines, submit/actions row, Turnstile-friendly panel width (`:has(.contact-form)`). |
| Wide breakpoint | Larger dialog title, close, labels, and control font sizes. |

### Application JavaScript

There's no bundler--the browser loads native ES modules from [`pages/index.js`](frontend/js/pages/index.js). `pages/` orchestrates; `ui/` handles interaction; `maze/` draws the background; `shared/` holds cross-cutting helpers. Custom elements use the host/control pattern described under [Custom elements](#custom-elements).

### HTML shell vs injected UI

[`index.html`](frontend/index.html) holds static structure: both `[data-view]` sections, the site menu and downloads nav as custom-element markup, carousel image, and dialog ids referenced from attributes. Modules add or fill in the rest: the maze `<canvas>`, dialog bodies from `MAIN_MENU_DIALOGS` / `DOWNLOAD_DIALOGS`, the contact form, and Turnstile.

### Navigation

In-app links use real paths (`/` and `/downloads`). The Navigation API `intercept` handler in `index.js` swaps views without a full reload; `setView` updates `hidden` / `inert` / `aria-hidden` to match the URL already in the address bar (including back/forward). `setView` doesn't push history; the browser does that when the user follows an `<a href>`.

### Init order in `index.js`

Rough sequence after the module loads:

1. `defineSiteControlElements()`: Custom elements must exist before code queries inner controls.
2. `Maze` construction, `start()`, and `data-new-maze` listener.
3. `initTheme()` (including `onThemeChange` -> maze repaint).
4. `initMenu()`, `initCarousel()`, `initDialogs()`, `initPlatformDownloads()`.
5. `navigation` `intercept` registration.
6. `applyPathToView()`: clears `data-initial-view`, shows the correct view, schedules hero `initial-entrance` after `fonts-ready`.

### DOM hooks

| Attribute | Used by |
| --- | --- |
| `data-view` | SPA sections (`home` / `downloads`); `index.js`, first-paint CSS. |
| `data-initial-view` | Set by `view-boot.js` on `<html>`; cleared by `setView`; CSS until `index.js` runs. |
| `data-theme` | Theme on `<html>`; `theme-boot.js`, `theme.js`, CSS. |
| `data-open-dialog` | Menu rows; `dialogs.js` opens the matching `dialog` id. |
| `data-dialog`, `data-dialog-title`, `data-dialog-body`, `data-dialog-close` | Dialog template and behavior in `dialogs.js` / `contact.js`. |
| `data-dialog-target` | Downloads platform rows; `downloads.js` opens the release dialog after triggering download. |
| `data-platform-download` | Platform key on downloads nav; `downloads.js`. |
| `data-menu-panel`, `data-menu-toggle`, `data-menu-open`, `data-menu-close` | Hamburger panel; `menu.js`, card flips on `.downloads-nav`. |
| `data-theme-toggle` | Inner theme control; `theme.js`, `dom-utils.js`. |
| `data-carousel-image`, `data-carousel-prev`, `data-carousel-next` | Screenshot carousel; `carousel.js`. |
| `data-new-maze` | Menu action; `index.js` restarts the maze. |
| `data-menu-icon` | Flip-card face icon; `menu-card.js`. |

### `pages/`

| Module | Covers |
| --- | --- |
| [`index.js`](frontend/js/pages/index.js) | App entry: orchestration above, `setView` / `runViewChange` (View Transitions when allowed), `navigation` `intercept` for `/` <-> `/downloads`. |
| [`downloads.js`](frontend/js/pages/downloads.js) | `DOWNLOAD_DIALOGS`, GitHub release downloads, `revealDownloadsNavCards` / `resetDownloadsNavCards` for staggered flips. |

### `ui/`

| Module | Covers |
| --- | --- |
| [`site-controls.js`](frontend/js/ui/site-controls.js) | Registers custom elements (`menu-card` before `menu-button`; [full list](#which-elements-exist)). |
| `menu-card.js`, `menu-button.js`, `primary-button.js`, `menu-toggle-button.js`, `theme-toggle-button.js`, `carousel-arrow-button.js` | One file per tag; native control inside the host via [`control-host.js`](frontend/js/shared/control-host.js) and [`svg-icons.js`](frontend/js/shared/svg-icons.js). |
| [`menu.js`](frontend/js/ui/menu.js) | Hamburger open/close, focus, `aria-expanded` on the inner toggle. |
| [`dialogs.js`](frontend/js/ui/dialogs.js) | `<dialog>` open/close; prose from `MAIN_MENU_DIALOGS`; delegates contact to `contact.js`. |
| [`contact.js`](frontend/js/ui/contact.js) | Contact form render, Turnstile via `trustedScriptURL`, `fetch` to `/api/contact`. |
| [`carousel.js`](frontend/js/ui/carousel.js) | Change hero image/video. |
| [`theme.js`](frontend/js/ui/theme.js) | Toggle listener, `localStorage`, `data-theme` (initial value from `theme-boot.js`). |
| [`dom-utils.js`](frontend/js/ui/dom-utils.js) | Queries for menu panel, menu toggle, theme toggle. |

### `maze/`

| Module | Covers |
| --- | --- |
| [`maze.js`](frontend/js/maze/maze.js) | Canvas lifecycle, random algorithm pick, carve animation (or instant draw when `prefers-reduced-motion`), resize/DPR, `repaintCurrentPartialState` on theme change. |
| [`grid.js`](frontend/js/maze/grid.js), [`room.js`](frontend/js/maze/room.js), [`wall.js`](frontend/js/maze/wall.js) | Room grid vs tile grid; shared carve-plan types. |
| [`algorithms/*.js`](frontend/js/maze/algorithms/) | Pure `buildCarvePlan*` functions return an ordered tile list; `maze.js` animates from that list. How each algorithm looks on screen is summarized under [Maze-generating algorithms](#maze-generating-algorithms). |

### Shared and trusted types

| Module | Covers |
| --- | --- |
| [`control-host.js`](frontend/js/shared/control-host.js) | Host -> inner `<button>` or `<a>`; mirrors host attributes for `querySelector` on native controls. |
| [`config.js`](frontend/js/shared/config.js) | `CONTACT_ENDPOINT`, form length limits, Turnstile sitekey selection by hostname. |
| [`svg-icons.js`](frontend/js/shared/svg-icons.js) | SVG markup strings for controls and menu cards. |
| [`trusted-types.js`](frontend/js/trusted-types.js) | Static HTML templates and allowlisted external URLs. |
| [`trusted-types-boot.js`](frontend/js/trusted-types-boot.js) | CSP `policy`; `trustedHtml` / `trustedScriptURL` for UI and `control-host`. |

### Folder structure (sketch)

Tree of `frontend/`; the Worker API lives in [`worker/`](worker/) at the repo root.

```text
frontend/
├── index.html              # Shell: boot scripts, CSS links, views, nav markup
├── favicon.ico
├── screenshot.jpg
├── robots.txt
├── assets/
│   └── fonts/              # Neucha-Regular.ttf, Macondo-Regular.ttf, OFL.txt
├── css/
│   ├── 01-foundation.css
│   ├── 02-main.css
│   ├── 03-buttons-nav-motion.css
│   └── 04-dialog-contact.css
├── functions/
│   └── _middleware.js      # CSP, security headers, /downloads HTML rewrite
└── js/
    ├── theme-boot.js
    ├── view-boot.js
    ├── fonts-boot.js
    ├── trusted-types-boot.js
    ├── trusted-types.js
    ├── pages/
    │   ├── index.js        # App entry
    │   └── downloads.js    # Platform downloads and nav card reveal
    ├── ui/                 # Custom elements, menu, dialogs, contact, carousel, theme
    ├── maze/               # Canvas maze + algorithms/
    └── shared/             # control-host, config, svg-icons
```

### Runtime flow

```text
index.html (head, in order)
    │
    ├─> theme-boot.js ──────────────> <html data-theme="light|dark">
    │
    ├─> view-boot.js ───────────────> <html data-initial-view="home|downloads">
    │
    ├─> fonts-boot.js ──────────────> <html class="fonts-ready">  (async; reads data-initial-view)
    │
    ├─> trusted-types-boot.js ──────> Trusted Types policy (module; not on the paint chain)
    │
    └─> css/01-04 ──────────────────> first paint (uses data-theme, data-initial-view, :not(.fonts-ready))

index.html (end of body)
    │
    └─> pages/index.js (module) ────> define*, init*, applyPathToView; maze + UI
```

On `/downloads`, Pages middleware serves the same HTML as `/` while keeping the URL; `view-boot` and `02-main.css` show the downloads section before `index.js` clears `data-initial-view` and removes `hidden` / `inert`.

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

## Modern Web Guidance (Cursor agents)

**This section is about a development tool. You can ignore it if you just want to run or deploy the site locally.**

I wanted to use Google's [Modern Web Guidance](https://github.com/GoogleChrome/modern-web-guidance) plugin in Cursor for frontend work, but the upstream CLI (`npx` search/retrieve) was too slow and unreliable for agents here, so [`.cursor/rules/modern-web-guidance.mdc`](.cursor/rules/modern-web-guidance.mdc) tells agents to read the plugin's cached guides on disk instead. The subsections below cover installing the plugin and how this repo differs from the stock workflow.

### Install the plugin

In Cursor, install the **Modern Web Guidance** plugin ([Google Chrome / modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance) in the plugin marketplace). That downloads the skill and a local copy of the guides under your home directory:

```text
~/.cursor/plugins/cache/cursor-public/modern-web-guidance/*/skills/modern-web-guidance/guides/
```

Update the plugin occasionally if you want newer guides; the hash folder name changes when the cache is refreshed.

### What agents do here (not the upstream CLI)

The plugin's skill tells agents to run `npx modern-web-guidance@latest search ...` and then `retrieve ...` for full markdown. Search is supposed to return ids; retrieve is supposed to load one guide at a time. But in practice each `npx` call took about a minute and often failed in the sandbox.

This repo's rule [`.cursor/rules/modern-web-guidance.mdc`](.cursor/rules/modern-web-guidance.mdc) tells agents to **read those same markdown files directly** (Glob/Grep/Read on the path above) instead of calling the CLI. @-mention this rule to ask about Modern Web Guidance in chat and prevent agents from trying to fetch the guide again with `npx`.

In general, I find I need to explicitly remind Cursor agents to consult rules while generating text or code. It may be better to do a style pass afterwards, to apply my own `.cursor/rules/style.mdc`, rather than letting the style compete for context.
