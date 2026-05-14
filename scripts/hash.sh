node --input-type=module <<'EOF'
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const html = await readFile("frontend/index.html", "utf8");
const m = html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/);
if (!m) throw new Error("No inline <script> block found");

const body = m[1];
console.log("sha256-" + createHash("sha256").update(body, "utf8").digest("base64"));
console.log("bytes:", Buffer.byteLength(body, "utf8"));
EOF