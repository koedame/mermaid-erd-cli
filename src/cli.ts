#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { buildSchemaData } from "./build.js";
import { DEFAULT_IGNORE_TABLES, loadIgnoreTables } from "./config.js";
import { resolveIntrospector } from "./introspect/index.js";
import { renderHtml, renderJson, renderMermaid } from "./render.js";

type Format = "html" | "mermaid" | "json";

const USAGE = `Usage: mermaid-erd-cli [options]

Generate a Mermaid ERD from a live database or a schema dump.

Source (one required):
  --db <url>            database URL (postgres://, mysql://, sqlite:// or a .sqlite path)
  --schema <path>       schema dump file (.rb for Rails schema.rb, .sql for DDL)
  --pg-schema <name>    PostgreSQL schema to introspect (default: public)

Output:
  --format <format>     html | mermaid | json (default: html; "mmd" aliases mermaid)
  --out <path>          output path; "-" means stdout
                        (default: erd/index.html for html, stdout for mermaid/json)
  --serve               render HTML and serve it over HTTP, printing the URL
  --title <name>        title shown in the HTML viewer

Filtering:
  --ignore-tables <patterns>  comma-separated regex patterns of tables to exclude
  --config <path>             config file path (default: mermaid-erd.yml)

  -h, --help            show this help
`;

interface Options {
  db?: string;
  schema?: string;
  pgSchema?: string;
  out?: string;
  format: Format;
  serve: boolean;
  ignoreTables?: string;
  title?: string;
  config: string;
}

function parse(argv: string[]): Options | "help" {
  const { values } = parseArgs({
    args: argv,
    options: {
      db: { type: "string" },
      schema: { type: "string" },
      "pg-schema": { type: "string" },
      format: { type: "string", default: "html" },
      out: { type: "string" },
      serve: { type: "boolean", default: false },
      "ignore-tables": { type: "string" },
      title: { type: "string" },
      config: { type: "string", default: "mermaid-erd.yml" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
  });

  if (values.help) return "help";

  const raw = values.format as string;
  const format: Format = raw === "mmd" ? "mermaid" : (raw as Format);
  if (!["html", "mermaid", "json"].includes(format)) {
    throw new Error(`unknown --format "${raw}" (expected html, mermaid, or json)`);
  }

  return {
    db: values.db as string | undefined,
    schema: values.schema as string | undefined,
    pgSchema: values["pg-schema"] as string | undefined,
    out: values.out as string | undefined,
    format,
    serve: values.serve as boolean,
    ignoreTables: values["ignore-tables"] as string | undefined,
    title: values.title as string | undefined,
    config: values.config as string,
  };
}

async function run(options: Options): Promise<void> {
  const ignoreTables = await resolveIgnoreTables(options);

  const introspector = await resolveIntrospector({
    db: options.db,
    schema: options.schema,
    pgSchema: options.pgSchema,
  });
  const raw = await introspector.introspect();
  const data = buildSchemaData(raw, { ignoreTables });
  const summary = `${data.Models.length} tables, ${data.Relations.length} relations`;
  if (data.Models.length === 0) {
    console.error(
      "warning: no tables found (check the connection, --schema file, or --ignore-tables).",
    );
  }

  if (options.serve) {
    const html = await renderHtml(data, { title: options.title });
    console.error(summary);
    await serve(html); // stays pending until interrupted
    return;
  }

  const content =
    options.format === "mermaid"
      ? renderMermaid(data)
      : options.format === "json"
        ? renderJson(data)
        : await renderHtml(data, { title: options.title });

  // mermaid/json stream to stdout by default so they pipe cleanly; HTML
  // defaults to a file (a ~4 MB document is not useful dumped to a terminal).
  // `--out -` forces stdout for any format. Logs go to stderr either way.
  const toStdout = options.out === "-" || (options.out === undefined && options.format !== "html");
  if (toStdout) {
    process.stdout.write(content.endsWith("\n") ? content : `${content}\n`);
    console.error(summary);
    return;
  }

  const outPath = resolve(options.out ?? "erd/index.html");
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, content);
  console.error(`Wrote ${summary} -> ${outPath}`);
}

async function resolveIgnoreTables(options: Options): Promise<string[]> {
  if (options.ignoreTables !== undefined) {
    return options.ignoreTables
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const fromFile = await loadIgnoreTables(options.config);
  return fromFile ?? DEFAULT_IGNORE_TABLES;
}

function serve(html: string): Promise<void> {
  return new Promise((_resolve, reject) => {
    const server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    });
    server.on("error", reject);
    // Bind to loopback only — matches the advertised localhost URL and avoids
    // exposing the diagram on the LAN. The promise stays pending so the
    // process keeps serving until interrupted.
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      console.error(`Serving ERD at http://localhost:${port}/ (Ctrl-C to stop)`);
    });
  });
}

async function main(): Promise<void> {
  const parsed = parse(process.argv.slice(2));
  if (parsed === "help") {
    process.stdout.write(USAGE);
    return;
  }
  await run(parsed);
}

main().catch((err) => {
  console.error(`mermaid-erd-cli: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
