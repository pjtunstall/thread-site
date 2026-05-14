# By a Thread Website

- [Overview](#overview)
- [Secrets](#secrets)
- [Deployment](#deployment)

## Overview

This is a website for users to download my game By a Thread. It includes a contact form and animations of some maze-generating algorithms (backtracker, Kruskal, Prim, and Wilson).

The following sections note some details on how I set up the website on Cloudflare and how I deploy changes. The static files are hosted on Cloudflare. They link to the downloads on GitHub Releases. For the contact form backend, I used a Cloudflare Worker, and, as spam protection, Cloudflare Turnstile (among other measures). I used Resend SMTP (Simple Mail Transfer Protocol) to relay messages from the contact form to my email address.

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

`script-src` in `frontend/_headers` includes `'unsafe-inline'` so Cloudflare Turnstile’s variable inline scripts keep working on static hosting. That weakens XSS resistance compared to a hash- or nonce-based policy; a stricter setup would need HTML generated with a per-response nonce (for example a Cloudflare Pages Function) plus Turnstile’s nonce guidance.

Deploy changes made to `frontend` with `git push`. Hard refresh in the browser and clear the cache if need be to see the changes.

To deploy changes made to `worker`,

```sh
cd worker
npx wrangler deploy
```
