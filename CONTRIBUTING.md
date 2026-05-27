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
