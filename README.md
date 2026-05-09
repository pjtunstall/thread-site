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

For local development, you could create `worker/.dev.vars` (gitignored) with the same variable names and values; `wrangler dev` loads it automatically. But only do this if your setup definitely prevents agents reading them; `.cursorignore` does not guarantee compliance.

## Deployment

Push to see changes to frontend in production, and hard refresh in a private window. To see changes to the worker, `npx wrangler deploy` from the `worker` folder.
