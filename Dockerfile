# syntax=docker/dockerfile:1

# Build stage: install dependencies from the lockfile and compile to dist/.
# build-essential/python3 let better-sqlite3 (a native addon) compile from
# source on platforms without a prebuilt binary.
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential python3 \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY assets ./assets
# Compile, then drop devDependencies. The database drivers are
# optionalDependencies, so prune keeps them while removing the toolchain.
RUN npm run build \
    && npm prune --omit=dev

# Runtime stage: a distroless image (no shell or package manager) running as
# nonroot. It ships only dist/, assets/, and the pruned node_modules (the three
# database drivers). better-sqlite3's native addon was compiled against the same
# Debian/glibc and Node 22 ABI as this base, so it loads here without a toolchain.
FROM gcr.io/distroless/nodejs22-debian12:nonroot
WORKDIR /work
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/assets /app/assets
COPY --from=build /app/package.json /app/package.json
ENTRYPOINT ["/nodejs/bin/node", "/app/dist/cli.js"]
