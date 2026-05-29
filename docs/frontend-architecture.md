# Frontend architecture

- [Overview](#overview)
- [Boot scripts (head, blocking)](#boot-scripts-head-blocking)
- [Stylesheets](#stylesheets)
  - [`01-foundation.css`](#01-foundationcss)
  - [`02-main.css`](#02-maincss)
  - [`03-buttons-nav-motion.css`](#03-buttons-nav-motioncss)
  - [`04-dialog-contact.css`](#04-dialog-contactcss)
- [Application JavaScript](#application-javascript)
- [HTML shell vs injected UI](#html-shell-vs-injected-ui)
- [Custom elements](#custom-elements)
  - [Host and control](#host-and-control)
  - [Which elements exist](#which-elements-exist)
- [Navigation](#navigation)
- [Init order in `index.js`](#init-order-in-indexjs)
- [DOM hooks](#dom-hooks)
- [`pages/`](#pages)
- [`ui/`](#ui)
- [`maze/`](#maze)
- [Shared and trusted types](#shared-and-trusted-types)
- [Folder structure (sketch)](#folder-structure-sketch)
- [Runtime flow](#runtime-flow)

## Overview

The static site under `frontend/` uses early boot scripts, layered CSS, and ES modules. How each [maze-generating algorithm](../README.md#maze-generating-algorithms) looks on screen is summarized in the [README](../README.md#maze-generating-algorithms); CSP is under [Content Security Policy](../README.md#content-security-policy).

## Boot scripts (head, blocking)

Three classic scripts run in `<head>` before stylesheets load, in a fixed order. They're intentionally small and synchronous so the first paint matches the correct theme, route, and font readiness without waiting for [`pages/index.js`](../frontend/js/pages/index.js).

| Script | Sets on `<html>` | Covers |
| --- | --- | --- |
| [`theme-boot.js`](../frontend/js/theme-boot.js) | `data-theme="light"` or `"dark"` | Stored `theme-preference` from `localStorage`, else `prefers-color-scheme`, so themed colors are correct before CSS paints. |
| [`view-boot.js`](../frontend/js/view-boot.js) | `data-initial-view="home"` or `"downloads"` | Maps `location.pathname` for first-paint view rules in [`02-main.css`](../frontend/css/02-main.css) when the URL is `/downloads` (see [Cloudflare Pages build settings](../README.md#cloudflare-pages-build-settings)). |
| [`fonts-boot.js`](../frontend/js/fonts-boot.js) | class `fonts-ready` | `document.fonts.load()` for Neucha on every view; Macondo too when `data-initial-view="downloads"`. Hero copy and the downloads note stay hidden until load finishes or fails. |

[`trusted-types-boot.js`](../frontend/js/trusted-types-boot.js) (a `module` script) registers the Trusted Types policy; see [Shared and trusted types](#shared-and-trusted-types). It's not on the theme/view/font paint chain.

The main application module loads at the end of `<body>`; see [Application JavaScript](#application-javascript).

## Stylesheets

Stylesheets are linked in numeric order in [`index.html`](../frontend/index.html). Files load in parallel; rules apply in list order.

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

## Application JavaScript

There's no bundler--the browser loads native ES modules from [`pages/index.js`](../frontend/js/pages/index.js). `pages/` orchestrates; `ui/` handles interaction; `maze/` draws the background; `shared/` holds cross-cutting helpers. Custom elements use the host/control pattern described under [Custom elements](#custom-elements).

## HTML shell vs injected UI

[`index.html`](../frontend/index.html) holds static structure: both `[data-view]` sections, the site menu and downloads nav as custom-element markup, carousel image, and dialog ids referenced from attributes. Modules add or fill in the rest: the maze `<canvas>`, dialog bodies from `MAIN_MENU_DIALOGS` / `DOWNLOAD_DIALOGS`, the contact form, and Turnstile.

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

## Navigation

In-app links use real paths (`/` and `/downloads`). The Navigation API `intercept` handler in `index.js` swaps views without a full reload; `setView` updates `hidden` / `inert` / `aria-hidden` to match the URL already in the address bar (including back/forward). `setView` doesn't push history; the browser does that when the user follows an `<a href>`.

## Init order in `index.js`

Rough sequence after the module loads:

1. `defineSiteControlElements()`: Custom elements must exist before code queries inner controls.
2. `Maze` construction, `start()`, and `data-new-maze` listener.
3. `initTheme()` (including `onThemeChange` -> `maze.repaintPartialMazeAfterThemeToggle()`).
4. `initMenu()`, `initCarousel()`, `initDialogs()`, `initPlatformDownloads()`.
5. `navigation` `intercept` registration.
6. `applyPathToView()`: clears `data-initial-view`, shows the correct view, schedules hero `initial-entrance` after `fonts-ready`.

## DOM hooks

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

## `pages/`

| Module | Covers |
| --- | --- |
| [`index.js`](../frontend/js/pages/index.js) | App entry: orchestration above, `setView` / `runViewChange` (View Transitions when allowed), `navigation` `intercept` for `/` <-> `/downloads`. |
| [`downloads.js`](../frontend/js/pages/downloads.js) | `DOWNLOAD_DIALOGS`, GitHub release downloads, `revealDownloadsNavCards` / `resetDownloadsNavCards` for staggered flips. |

## `ui/`

| Module | Covers |
| --- | --- |
| [`site-controls.js`](../frontend/js/ui/site-controls.js) | Registers custom elements (`menu-card` before `menu-button`; [full list](#which-elements-exist)). |
| `menu-card.js`, `menu-button.js`, `primary-button.js`, `menu-toggle-button.js`, `theme-toggle-button.js`, `carousel-arrow-button.js` | One file per tag; native control inside the host via [`control-host.js`](../frontend/js/shared/control-host.js) and [`svg-icons.js`](../frontend/js/shared/svg-icons.js). |
| [`menu.js`](../frontend/js/ui/menu.js) | Hamburger open/close, focus, `aria-expanded` on the inner toggle. |
| [`dialogs.js`](../frontend/js/ui/dialogs.js) | `<dialog>` open/close; prose from `MAIN_MENU_DIALOGS`; delegates contact to `contact.js`. |
| [`contact.js`](../frontend/js/ui/contact.js) | Contact form render, Turnstile via `trustedScriptURL`, `fetch` to `/api/contact`. |
| [`carousel.js`](../frontend/js/ui/carousel.js) | Change hero image/video. |
| [`theme.js`](../frontend/js/ui/theme.js) | Toggle listener, `localStorage`, `data-theme` (initial value from `theme-boot.js`). |
| [`dom-utils.js`](../frontend/js/ui/dom-utils.js) | Queries for menu panel, menu toggle, theme toggle. |

## `maze/`

Algorithms build a `CarvePlan` on the coarse `Room` grid using a seeded RNG (`createRng`). `maze.js` walks the plan's tile iterator and carves the fine `Tile` grid on a canvas (background-colored cells). Appearance of each algorithm on screen is summarized under [Maze-generating algorithms](../README.md#maze-generating-algorithms).

| Module | Covers |
| --- | --- |
| [`maze.js`](../frontend/js/maze/maze.js) | Canvas lifecycle. On `restart`, `#beginCarve()` picks a random `buildCarvePlan*`, draws `createRngSeed()`, and opens `#tileIterator`. Further carving uses `#carveNextTiles` (advances the live iterator and `#tilesCarved`). `#carveTilesFromIterator` pulls from any iterator and paints tiles; it is shared by the initial batch, animation frames, reduced motion, and theme replay. Kruskal's `iterativeStartIndex` is carved in one batch before `requestAnimationFrame`. With `prefers-reduced-motion`, the iterator is drained in one call. `repaintPartialMazeAfterThemeToggle()` rebuilds an iterator from the stored algorithm, seed, and grid size, repaints `#tilesCarved` tiles in the new theme, and resumes animation if needed. Resize and `devicePixelRatio` changes debounce `restart`. |
| [`grid.js`](../frontend/js/maze/grid.js) | Types: `Tile`, `CarvePlan` (`createIterator`, `iterativeStartIndex`), `BuildCarvePlanOptions` (`roomCols`, `roomRows`, `seed`). Seeded RNG: `createRng`, `createRngSeed`. Helpers: `pickRandomFrom`, `pickRandomNeighbor`, `randomIntBelow`. |
| [`room.js`](../frontend/js/maze/room.js) | Coarse-grid `Room` (`toTile`, `passageTo`, `neighboringRooms`, `Room.random` with `rng`). |
| [`wall.js`](../frontend/js/maze/wall.js) | Adjoining `Wall` between two `Room`s (used by Prim). |
| [`algorithms/backtracker.js`](../frontend/js/maze/algorithms/backtracker.js) | `buildCarvePlanBacktracker`; `function* carve` yields room and passage tiles in DFS order; `iterativeStartIndex` 0. |
| [`algorithms/wilson.js`](../frontend/js/maze/algorithms/wilson.js) | `buildCarvePlanWilson`; loop-erased random walks; `iterativeStartIndex` 0. |
| [`algorithms/prim.js`](../frontend/js/maze/algorithms/prim.js) | `buildCarvePlanPrim`; random frontier walls; `iterativeStartIndex` 0. |
| [`algorithms/kruskal.js`](../frontend/js/maze/algorithms/kruskal.js) | `buildCarvePlanKruskal`; union–find; yields all room tiles then shuffled walls; `iterativeStartIndex` = room count (instant room grid on canvas). |

Each `buildCarvePlan*` returns a `CarvePlan` whose `createIterator()` calls `createRng(seed)` and returns a fresh generator from that algorithm's `carve`. Theme replay must reuse the same builder function, seed, and grid dimensions so the tile sequence matches `#tilesCarved`.

## Shared and trusted types

| Module | Covers |
| --- | --- |
| [`control-host.js`](../frontend/js/shared/control-host.js) | Host -> inner `<button>` or `<a>`; mirrors host attributes for `querySelector` on native controls. |
| [`config.js`](../frontend/js/shared/config.js) | `CONTACT_ENDPOINT`, form length limits, Turnstile sitekey selection by hostname. |
| [`svg-icons.js`](../frontend/js/shared/svg-icons.js) | SVG markup strings for controls and menu cards. |
| [`trusted-types.js`](../frontend/js/trusted-types.js) | Static HTML templates and allowlisted external URLs. |
| [`trusted-types-boot.js`](../frontend/js/trusted-types-boot.js) | CSP `policy`; `trustedHtml` / `trustedScriptURL` for UI and `control-host`. |

## Folder structure (sketch)

Tree of `frontend/`; the Worker API lives in [`worker/`](../worker/) at the repo root.

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

## Runtime flow

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
