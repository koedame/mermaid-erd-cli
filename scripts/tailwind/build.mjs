// Builds assets/vendor/tailwind.css from input.css.
// Uses the PostCSS plugin instead of @tailwindcss/cli, whose file watcher
// pulls in micromatch and braces (npm audit: high, no patched release).
import { readFile, writeFile } from "node:fs/promises";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const from = new URL("./input.css", import.meta.url).pathname;
const to = new URL("../../assets/vendor/tailwind.css", import.meta.url).pathname;
const result = await postcss([tailwindcss({ optimize: { minify: true } })]).process(
  await readFile(from, "utf8"),
  { from, to },
);
await writeFile(to, result.css);
