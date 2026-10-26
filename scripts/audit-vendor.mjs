#!/usr/bin/env node
// Checks the Mermaid and Vue versions copied into assets/vendor/ against the npm
// advisory database. They are files, not npm dependencies, so `npm audit` on
// this package's lock file and Dependabot never see them.
//
//   node scripts/audit-vendor.mjs
//
// The versions come from scripts/licenses/bundles.json (test/vendor.test.ts
// checks that they are the ones inside the files). They are written into a
// throw-away package.json, resolved to a lock file without installing anything,
// and audited. Unlike the rest of the repository this fails from moderate up,
// not only high: this code is copied into every generated HTML file. Needs
// network.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const config = JSON.parse(
  fs.readFileSync(path.join(root, "scripts/licenses/bundles.json"), "utf8"),
);

const work = fs.mkdtempSync(path.join(os.tmpdir(), "audit-vendor-"));
try {
  fs.writeFileSync(
    path.join(work, "package.json"),
    JSON.stringify({
      name: "audit-vendor",
      version: "0.0.0",
      private: true,
      dependencies: { mermaid: config.mermaid.version, vue: config.vue.version },
    }),
  );
  const npm = (args) => execFileSync("npm", args, { cwd: work, stdio: "inherit" });
  npm(["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"]);
  npm(["audit", "--audit-level=moderate"]);
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
