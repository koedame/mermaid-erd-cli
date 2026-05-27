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
  --port <number>       port to listen on with --serve (default: random)
  --host <address>      address to bind with --serve (default: 127.0.0.1).
                        0.0.0.0 exposes the diagram — your full schema — on
                        every network interface; use only on trusted networks
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
  port?: number;
  host?: string;
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
      port: { type: "string" },
      host: { type: "string" },
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

  const rawPort = values.port as string | undefined;
  let port: number | undefined;
  if (rawPort !== undefined) {
    // Only a plain decimal integer is a port. Reject "", "0x50", "1e3", "3000.5"
    // and similar so a shell mistake fails loudly instead of silently binding an
    // unexpected port (Number() would coerce all of those to a valid-looking int).
    if (!/^\d+$/.test(rawPort) || Number(rawPort) > 65535) {
      throw new Error(`invalid --port "${rawPort}" (expected 0-65535)`);
    }
    port = Number(rawPort);
  }

  return {
    db: values.db as string | undefined,
    schema: values.schema as string | undefined,
    pgSchema: values["pg-schema"] as string | undefined,
    out: values.out as string | undefined,
    format,
    serve: values.serve as boolean,
    port,
    host: values.host as string | undefined,
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
    await serve(html, { port: options.port, host: options.host }); // stays pending until interrupted
    return;
  }

  if (options.port !== undefined || options.host !== undefined) {
    console.error("warning: --port and --host only take effect with --serve");
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

// Addresses reachable only from this machine.
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
// Wildcard binds reach every interface but are still browsable via localhost.
const WILDCARD_HOSTS = new Set(["0.0.0.0", "::"]);

function serveUrl(host: string, port: number): string {
  if (LOOPBACK_HOSTS.has(host) || WILDCARD_HOSTS.has(host)) return `http://localhost:${port}/`;
  // IPv6 literals must be bracketed in a URL.
  const authority = host.includes(":") ? `[${host}]` : host;
  return `http://${authority}:${port}/`;
}

function listenError(err: NodeJS.ErrnoException, port: number, host: string): Error {
  switch (err.code) {
    case "EADDRINUSE":
      // Only a user-requested port can collide; port 0 lets the OS pick a free one.
      return port === 0 ? err : new Error(`port ${port} is already in use`);
    case "EACCES":
      return new Error(
        `cannot bind to port ${port}: permission denied (ports below 1024 may need elevated privileges)`,
      );
    case "EADDRNOTAVAIL":
      return new Error(`cannot bind to --host "${host}": address not available on this machine`);
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return new Error(`cannot resolve --host "${host}"`);
    default:
      return err;
  }
}

function serve(html: string, opts: { port?: number; host?: string }): Promise<void> {
  // Default to loopback so the diagram (which embeds the full schema) is not
  // reachable off-machine unless the caller opts in with --host. Port 0 lets
  // the OS assign a free one. The promise stays pending so the process keeps
  // serving until interrupted.
  const host = opts.host ?? "127.0.0.1";
  const port = opts.port ?? 0;
  return new Promise((_resolve, reject) => {
    const server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    });
    server.on("error", (err: NodeJS.ErrnoException) => reject(listenError(err, port, host)));
    server.listen(port, host, () => {
      const address = server.address();
      const boundPort = typeof address === "object" && address ? address.port : port;
      if (!LOOPBACK_HOSTS.has(host)) {
        console.error(
          `warning: --host ${host} makes the diagram (your full schema) reachable from other machines on the network; use only on trusted networks.`,
        );
      }
      console.error(`Serving ERD at ${serveUrl(host, boundPort)} (Ctrl-C to stop)`);
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
