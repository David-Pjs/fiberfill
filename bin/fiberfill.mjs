#!/usr/bin/env node
// Thin launcher so `fiberfill <cmd>` runs the TypeScript CLI through tsx without a
// build step. For local use, `npm run demo` / `npm run cli -- <cmd>` work the same.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "cli.ts");
const child = spawn("npx", ["tsx", cli, ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
child.on("exit", (code) => process.exit(code ?? 1));
