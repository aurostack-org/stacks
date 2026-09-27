# One Dockerfile for all four apps — pick which with `--build-arg APP=<name>`.
#
#   docker build --build-arg APP=client \
#     --build-arg VITE_APP_API_URL=https://api.inerds.site ... -t …/web-client .
#
# `landing` additionally requires --build-arg VITE_APP_SITE_URL=https://inerds.site
# for canonical tags and sitemap.xml.
#
# IMPORTANT: Vite inlines `VITE_*` values into the JS bundle at BUILD time, so a
# built image is pinned to one environment. The URLs below are build args, not
# runtime env — setting them in compose does nothing. Build one image per
# environment, or move to runtime config (see docker/README.md).

# ---------- deps ----------
# Manifests only, so `yarn install` re-runs solely when a dependency changes.
FROM aurostack.dev/wesnetech/nodejs:24 AS deps
WORKDIR /repo

COPY package.json yarn.lock .yarnrc.yml turbo.json ./
COPY apps/admin/package.json      apps/admin/
COPY apps/auth/package.json       apps/auth/
COPY apps/client/package.json     apps/client/
COPY apps/landing/package.json    apps/landing/
COPY packages/api/package.json    packages/api/
COPY packages/auth/package.json   packages/auth/
COPY packages/config/package.json packages/config/
COPY packages/hooks/package.json  packages/hooks/
COPY packages/layouts/package.json packages/layouts/
COPY packages/types/package.json  packages/types/
COPY packages/ui/package.json     packages/ui/

RUN corepack enable && yarn install --immutable

# ---------- build ----------
FROM aurostack.dev/wesnetech/nodejs:24 AS build
WORKDIR /repo
ENV NODE_ENV=production
# Each stage is a fresh image, so corepack has to be enabled again here —
# without it `yarn` is the bundled 1.x and refuses the packageManager field.
RUN corepack enable

COPY --from=deps /repo/node_modules ./node_modules
COPY . .

ARG APP
# Build args become env vars so Vite's define step picks them up. Verified:
# process env takes precedence over a committed .env, so a stale checked-in
# .env cannot leak into the image as long as the arg is supplied.
ARG VITE_APP_API_URL
ARG VITE_APP_AUTH_HOST
ARG VITE_APP_CLIENT_HOST
ARG VITE_APP_ADMIN_HOST
ARG VITE_APP_LANDING
ARG VITE_APP_SUPPORT_EMAIL
# Landing only: canonical origin for <link rel="canonical">, og:url and the
# generated sitemap.xml. Must be a build arg — .dockerignore excludes .env, so a
# local value never reaches the image.
ARG VITE_APP_SITE_URL
ENV VITE_APP_API_URL=$VITE_APP_API_URL \
	VITE_APP_AUTH_HOST=$VITE_APP_AUTH_HOST \
	VITE_APP_CLIENT_HOST=$VITE_APP_CLIENT_HOST \
	VITE_APP_ADMIN_HOST=$VITE_APP_ADMIN_HOST \
	VITE_APP_LANDING=$VITE_APP_LANDING \
	VITE_APP_SUPPORT_EMAIL=$VITE_APP_SUPPORT_EMAIL \
	VITE_APP_SITE_URL=$VITE_APP_SITE_URL

# Fail loudly rather than silently producing a bundle with `undefined` URLs
# baked in — that failure is invisible until the app 404s at runtime.
RUN test -n "$APP" || (echo "ERROR: --build-arg APP=<admin|auth|client|landing> is required" && exit 1)
RUN if [ "$APP" != "landing" ] && [ -z "$VITE_APP_API_URL" ]; then \
	echo "ERROR: $APP needs --build-arg VITE_APP_API_URL"; exit 1; \
	fi
# Landing fails silently without this: no canonical tags and no sitemap.xml, with
# only a build warning nobody reads. Same reasoning as the check above.
RUN if [ "$APP" = "landing" ] && [ -z "$VITE_APP_SITE_URL" ]; then \
	echo "ERROR: landing needs --build-arg VITE_APP_SITE_URL (e.g. https://inerds.site)"; exit 1; \
	fi

# `--filter` builds the app plus only the workspace packages it depends on.
RUN yarn turbo run build --filter="$APP"

# ---------- runtime ----------
FROM nginx:stable-alpine AS runtime
ARG APP
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/$APP/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
	CMD wget -qO- http://127.0.0.1/healthz || exit 1
