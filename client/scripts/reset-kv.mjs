/**
 * Delete all keys with given prefixes from Cloudflare KV (online-status namespace).
 * Usage: node scripts/reset-kv.mjs auth: hb:
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CLIENT_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const NAMESPACE_ID = "03b79ec83f854c7c80a9ef7381bbb631";
const prefixes = process.argv.slice(2).length ? process.argv.slice(2) : ["auth:", "hb:"];

function runWrangler(args) {
  return execSync(`npx wrangler ${args.join(" ")}`, { encoding: "utf8", cwd: CLIENT_DIR });
}

function listKeys(prefix, cursor) {
  const args = [
    "kv", "key", "list",
    `--namespace-id=${NAMESPACE_ID}`,
    `--prefix=${prefix}`,
  ];
  if (cursor) args.push(`--cursor=${cursor}`);
  const out = runWrangler(args);
  return JSON.parse(out.trim() || "[]");
}

function deleteKey(name) {
  runWrangler(["kv", "key", "delete", `--namespace-id=${NAMESPACE_ID}`, JSON.stringify(name)]);
}

let deleted = 0;
for (const prefix of prefixes) {
  console.log(`\nPrefix ${prefix}*`);
  let cursor;
  do {
    const batch = listKeys(prefix, cursor);
    for (const row of batch) {
      const name = typeof row === "string" ? row : row.name;
      if (!name) continue;
      console.log(`  del ${name}`);
      deleteKey(name);
      deleted += 1;
    }
    cursor = batch.list_complete === false ? batch.cursor : null;
  } while (cursor);
}

console.log(`\nDone. Deleted ${deleted} key(s).`);
