import { readFile, readdir } from "node:fs/promises";
import { extname, relative } from "node:path";

const root = new URL("../", import.meta.url);
const requiredFiles = [
  "README.md",
  ".env.example",
  "typescript/quickstart/src/index.ts",
  "python/quickstart/quickstart.py",
  "stripe-custom-checkout/src/server.ts",
  "paypal-orders/src/server.ts",
  "postman/Sales-Tax-Calculator-API.postman_collection.json",
  "postman/Local.postman_environment.json",
];

for (const file of requiredFiles) {
  await readFile(new URL(file, root));
}

const collection = JSON.parse(await readFile(new URL("postman/Sales-Tax-Calculator-API.postman_collection.json", root), "utf8"));
const environment = JSON.parse(await readFile(new URL("postman/Local.postman_environment.json", root), "utf8"));

if (collection.info?.schema !== "https://schema.getpostman.com/json/collection/v2.1.0/collection.json") {
  throw new Error("The Postman collection must use schema v2.1.0.");
}
if (!environment.values?.some((entry) => entry.key === "apiKey" && entry.value === "stca_replace_me")) {
  throw new Error("The Postman environment must contain only the placeholder API key.");
}

const textExtensions = new Set(["", ".css", ".html", ".js", ".json", ".md", ".py", ".ts", ".yml"]);
const ignoredDirectories = new Set([".git", "node_modules"]);
const secretPatterns = [
  /\bstca_[A-Za-z0-9]{16,}\b/g,
  /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
  /\bpk_live_[A-Za-z0-9]{16,}\b/g,
  /\bAKIA[A-Z0-9]{16}\b/g,
];
const personalDataPatterns = [
  { label: "email address", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { label: "Windows user-profile path", pattern: /\b[A-Z]:\\Users\\[^\\\s]+/gi },
  { label: "macOS user-profile path", pattern: /\/Users\/[^/\s]+/g },
  { label: "Linux user-profile path", pattern: /\/home\/[^/\s]+/g },
];

async function scan(directoryUrl) {
  for (const entry of await readdir(directoryUrl, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    if (/^\.env(?:\..+)?$/.test(entry.name) && entry.name !== ".env.example") continue;
    const entryUrl = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directoryUrl);
    if (entry.isDirectory()) {
      await scan(entryUrl);
      continue;
    }
    if (!textExtensions.has(extname(entry.name))) continue;

    const content = await readFile(entryUrl, "utf8");
    for (const pattern of secretPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) {
        const path = relative(new URL(root).pathname, entryUrl.pathname);
        throw new Error(`Possible credential found in ${path}.`);
      }
    }
    for (const { label, pattern } of personalDataPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) {
        const path = relative(new URL(root).pathname, entryUrl.pathname);
        throw new Error(`Possible ${label} found in ${path}.`);
      }
    }
  }
}

await scan(root);
console.log("Repository structure, Postman files, credentials, and personal-data checks are valid.");
