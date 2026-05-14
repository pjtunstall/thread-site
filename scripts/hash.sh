node --input-type=module <<'EOF'
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const html = await readFile("frontend/index.html", "utf8");
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
const matches = [...html.matchAll(re)];
if (!matches.length) {
  console.log("No inline <script> blocks in index.html (theme lives in js/theme-boot.js).");
} else {
  matches.forEach(function (m, i) {
    const body = m[1];
    const hash =
      "sha256-" + createHash("sha256").update(body, "utf8").digest("base64");
    console.log(i + 1, hash, "bytes:", Buffer.byteLength(body, "utf8"));
  });
}
EOF