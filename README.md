# By a Thread Website

- [Overview](#overview)
- [Custom elements](#custom-elements)
- [Secrets](#secrets)
- [Deployment](#deployment)

## Overview

This is a website for users to download my game By a Thread. It includes a contact form and animations of some maze-generating algorithms (backtracker, Kruskal, Prim, and Wilson).

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

## Deployment

`script-src` in `frontend/_headers` includes `'unsafe-inline'` so Cloudflare Turnstile's variable inline scripts keep working on static hosting. That weakens XSS resistance compared to a hash- or nonce-based policy; a stricter setup would need HTML generated with a per-response nonce (for example a Cloudflare Pages Function) plus Turnstile's nonce guidance.

Deploy changes made to `frontend` with `git push`. Hard refresh in the browser and clear the cache if need be to see the changes.

To deploy changes made to `worker`,

```sh
cd worker
npx wrangler deploy
```
