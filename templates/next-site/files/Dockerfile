# The site as one Node server (Next.js standalone output, Payload included).
#
#   docker build --build-arg NEXT_PUBLIC_SERVER_URL=https://example.com -t site .
#   docker run -p 3000:3000 --env-file .env.production -v site-media:/app/media site
#
# NEXT_PUBLIC_* values are inlined into the build, so an image is pinned to one
# public URL: they are build args, not runtime env. Everything else (DATABASE_URL,
# PAYLOAD_SECRET, SMTP_*) is read at runtime.
#
# Pending migrations run when the server starts (prodMigrations in
# src/payload.config.ts), so there is no separate migrate step.

# ---------- deps ----------
# Manifests only, so `yarn install` re-runs solely when a dependency changes.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
RUN corepack enable && yarn install --immutable

# ---------- build ----------
FROM node:24-alpine AS build
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
# Each stage is a fresh image, so corepack has to be enabled again here.
RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
# @feature:start telemetry
# Browser monitoring. Leave unset and the bundle ships with it off. The client
# token is a RUM token, write-only and meant to be public.
ARG NEXT_PUBLIC_OPENOBSERVE_URL
ARG NEXT_PUBLIC_OPENOBSERVE_ORG
ARG NEXT_PUBLIC_OPENOBSERVE_CLIENT_TOKEN
ENV NEXT_PUBLIC_OPENOBSERVE_URL=$NEXT_PUBLIC_OPENOBSERVE_URL \
	NEXT_PUBLIC_OPENOBSERVE_ORG=$NEXT_PUBLIC_OPENOBSERVE_ORG \
	NEXT_PUBLIC_OPENOBSERVE_CLIENT_TOKEN=$NEXT_PUBLIC_OPENOBSERVE_CLIENT_TOKEN
# @feature:end

# Fail loudly rather than baking `undefined` into every absolute link.
RUN test -n "$NEXT_PUBLIC_SERVER_URL" || (echo "ERROR: --build-arg NEXT_PUBLIC_SERVER_URL is required" && exit 1)

RUN yarn build

# ---------- runtime ----------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 MEDIA_DIR=/app/media

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# Uploaded media. Mount a volume here or uploads vanish with the container.
RUN mkdir -p /app/media && chown node:node /app/media
VOLUME /app/media

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
	CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
