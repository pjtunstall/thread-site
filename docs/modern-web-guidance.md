# Modern Web Guidance in this repo

**This document is about a development tool. You can ignore it if you just want to run or deploy the site.** It only affects how Cursor agents look up web best practices during frontend work.

## Install the plugin

In Cursor, install the **Modern Web Guidance** plugin ([Google Chrome / modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance) in the plugin marketplace). That downloads the skill and a local copy of the guides under your home directory:

```text
~/.cursor/plugins/cache/cursor-public/modern-web-guidance/*/skills/modern-web-guidance/guides/
```

Update the plugin occasionally if you want newer guides; the hash folder name changes when the cache is refreshed.

## What agents do here (not the upstream CLI)

The plugin's skill tells agents to run `npx modern-web-guidance@latest search ...` and then `retrieve ...` for full markdown. Search is suposed to return ids; retrieve is supposed to load one guide at a time. But in practice each `npx` call took about a minute and often failed in the sandbox.

This repo's rule [`.cursor/rules/modern-web-guidance.mdc`](../.cursor/rules/modern-web-guidance.mdc) tells agents to **read those same markdown files directly** (Glob/Grep/Read on the path above) instead of calling the CLI. @-mention the this rule to ask about Modern Web Guidance in chat to prevent agents from trying to fetch the guide again with `npx`.
