# Contributing

Thanks for your interest in improving mermaid-erd-cli.

## Setup

```bash
npm install
npm run build
```

## Tests

```bash
npm test           # unit + integration tests (vitest)
npm run lint       # Biome lint + format check
npm run format     # apply Biome fixes/formatting
npm run e2e        # headless-browser check of the generated HTML viewer
```

`npm run e2e` needs a Chromium build:

```bash
npx playwright install chromium
```

### Verifying live databases (optional)

`scripts/verify-db.sh` spins up throwaway PostgreSQL and MySQL containers with
Docker, seeds an identical schema, runs the CLI against each, and checks the
generated Mermaid output. Requires Docker:

```bash
npm run build
bash scripts/verify-db.sh
```

## Conventions

- TypeScript, ESM. Keep the introspection layer (`src/introspect/`) the only
  database-specific code; everything downstream works on the normalized
  `RawSchema` from `src/types.ts`.
- The bundled front-end viewer lives in `assets/` and is reused as-is — see
  the acknowledgements in the README before changing it.
- Add tests for new behavior. Test names should describe the scenario.

## Vendored front-end files

`assets/vendor/` holds the files inlined into every generated HTML: the Mermaid
and Vue bundles (downloaded as they are published) and `tailwind.css`. The
stylesheet is not downloaded; it is built from the viewer's markup with the
Tailwind CSS command-line tool (3.1.8, with the forms and typography plugins).
Inputs are in `scripts/tailwind/`.

After changing a class in `assets/template.html`, or a pinned version:

```bash
cd scripts/tailwind && npm ci && npm run build   # writes assets/vendor/tailwind.css
```

A class is found only when it appears in the template as a complete string; one
assembled at runtime (`'bg-' + color`) is not.

`assets/vendor/LICENSES.md` carries the copyright notice and license text of
everything inside those files and is copied into the head of every generated
HTML. It is generated, not written by hand. Rebuild it, and update
`CHECKSUMS.txt`, after replacing a file or changing the icons in the template:

```bash
cd assets/vendor && sha256sum mermaid.min.js tailwind.css vue.global.prod.min.js   # then edit CHECKSUMS.txt
cd ../.. && node scripts/licenses/generate.mjs     # needs network
```

The script stops on a GPL-family license, and `test/vendor.test.ts` fails when
`LICENSES.md`, `CHECKSUMS.txt` and the files disagree. Then regenerate the demo
with `npm run build && npm run demo`.

## Pull requests

Open PRs against `main`. CI runs the build, tests, and the e2e check across
Node 20/22.

## Releasing

Releases are published manually from a maintainer's machine; there is no CI
publish step.

1. Bump `version` in `package.json` and add a matching `CHANGELOG.md` entry;
   commit and push to `main`.
2. From a clean checkout of that commit, run `npm publish --access public`. The
   `prepack` script builds `dist/` before the tarball is assembled.
3. Tag the released commit: `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. Create a GitHub release for the tag, using the `CHANGELOG.md` entry as the
   notes: `gh release create vX.Y.Z --title vX.Y.Z --notes "<changelog section>"`.
5. Build and push the multi-arch Docker image to both registries. Log in first
   (`docker login ghcr.io` and `docker login`), then:

   ```bash
   docker buildx build --platform linux/amd64,linux/arm64 \
     -t ghcr.io/koedame/mermaid-erd-cli:X.Y.Z -t ghcr.io/koedame/mermaid-erd-cli:latest \
     -t koedame/mermaid-erd-cli:X.Y.Z -t koedame/mermaid-erd-cli:latest \
     --push .
   ```
