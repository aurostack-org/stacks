# Build from the monorepo root — the image needs packages/db as well as this app:
#
#   docker build -f apps/worker/Dockerfile -t acme-worker .
#
# The worker never migrates; the API's `migrate` target owns the schema.

# @feature:start temporal
# Temporal's native core ships glibc builds only (it fails to load on Alpine,
# even with gcompat), so a Temporal worker builds and runs on Debian.
# @feature:end

# ---------- prune ----------
# A copy of the monorepo with only @acme/worker and the workspaces it depends on.
# out/json holds the manifests + pruned lockfile, out/full the sources, so the
# install layer below is reused until a dependency actually changes.
# @feature:start temporal
FROM node:24-bookworm-slim AS prune
# @feature:else
FROM aurostack.dev/wesnetech/nodejs:24 AS prune
# @feature:end
WORKDIR /repo
RUN corepack enable
COPY . .
RUN yarn dlx -q turbo@2.11.7 prune @acme/worker --docker

# ---------- build ----------
# @feature:start temporal
FROM node:24-bookworm-slim AS build
# @feature:else
FROM aurostack.dev/wesnetech/nodejs:24 AS build
# @feature:end

# @feature:start worker-browser
# Chromium comes from the OS packages in the runtime stage; don't download a
# second copy.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
	PUPPETEER_SKIP_DOWNLOAD=true
# @feature:end

WORKDIR /repo
# The image bundles Yarn 1.x; corepack switches to the Yarn 4 release pinned by
# the root package.json's `packageManager`.
RUN corepack enable

# out/json carries .yarnrc.yml too: without it Yarn uses PnP, which Prisma
# cannot generate under.
COPY --from=prune /repo/out/json/ ./
# Long timeout, one request at a time: tolerant of a slow or flaky registry.
RUN YARN_HTTP_TIMEOUT=300000 YARN_NETWORK_CONCURRENCY=1 yarn install --immutable

COPY --from=prune /repo/out/full/ ./
# Builds @acme/db (prisma generate + tsc) first, then the worker.
RUN yarn turbo run build --filter=@acme/worker

# Yarn 4 has no `install --production`; focusing the workspace is its equivalent.
RUN yarn workspaces focus @acme/worker --production \
	&& mkdir -p apps/worker/node_modules packages/db/node_modules

# ---------- runtime ----------
# @feature:start temporal
FROM node:24-bookworm-slim
# @feature:else
FROM aurostack.dev/wesnetech/nodejs:24
# @feature:end
WORKDIR /repo

# @feature:start worker-browser
# @feature:start temporal
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		chromium \
		ca-certificates \
		fonts-freefont-ttf \
	&& rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
	PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
# @feature:else
RUN apk add --no-cache \
	chromium \
	nss \
	freetype \
	harfbuzz \
	ca-certificates \
	ttf-freefont \
	udev

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
	PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
# @feature:end
# @feature:end

# node_modules/@acme/db is a symlink to packages/db, so the package has to sit at
# the same relative path here or the worker fails with "Cannot find module".
COPY --from=build /repo/package.json ./
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/db/package.json ./packages/db/
COPY --from=build /repo/packages/db/node_modules ./packages/db/node_modules
COPY --from=build /repo/packages/db/dist ./packages/db/dist
COPY --from=build /repo/apps/worker/package.json ./apps/worker/
# @feature:start worker-pm2
COPY --from=build /repo/apps/worker/ecosystem.config.cjs ./apps/worker/
# @feature:end
COPY --from=build /repo/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=build /repo/apps/worker/dist ./apps/worker/dist

WORKDIR /repo/apps/worker

# @feature:start worker-pm2
# pm2-runtime ships in the house base image; Debian's needs it installed.
RUN npm install -g pm2@7 # @feature temporal
CMD [ "pm2-runtime", "start", "ecosystem.config.cjs" ]
# @feature:else
CMD [ "node", "--import", "./dist/src/instrumentation.js", "dist/src/index.js" ]
# @feature:end
