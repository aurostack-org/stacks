#!/bin/sh
# Build + push one frontend app image.
#
#   ./build.sh <admin|auth|client|landing> [env] [tag]
#
#   ./build.sh client            # uses .env       -> :latest
#   ./build.sh client prod       # uses .env.production
#   ./build.sh client prod 26_07_26_1
#
# The VITE_* URLs are compiled INTO the bundle, so the image is specific to the
# environment it was built for. That is why the env name is an argument: the same
# image cannot be promoted from staging to prod. Pull the env file first with
#   yarn workspace <app> secrets -e <env>
set -eu

APP="${1:-}"
ENV_NAME="${2:-dev}"
TAG="${3:-latest}"
REGISTRY="aurostack.dev/acme-corp"
PLATFORMS="linux/amd64,linux/arm64"

case "$APP" in
	admin | auth | client | landing) ;;
	*)
		echo "usage: $0 <admin|auth|client|landing> [dev|staging|prod] [tag]" >&2
		exit 1
		;;
esac

case "$ENV_NAME" in
	dev) ENV_FILE="apps/$APP/.env" ;;
	test) ENV_FILE="apps/$APP/.env.test" ;;
	staging) ENV_FILE="apps/$APP/.env.staging" ;;
	prod | production) ENV_FILE="apps/$APP/.env.production" ;;
	*) echo "unknown env '$ENV_NAME' (dev|test|staging|prod)" >&2; exit 1 ;;
esac

[ -f "$ENV_FILE" ] || {
	echo "missing $ENV_FILE — run: yarn workspace $APP secrets -e $ENV_NAME" >&2
	exit 1
}

# Read a var out of the env file, tolerating the quoted style these files use.
read_var() {
	sed -n "s/^$1=['\"]\{0,1\}\([^'\"]*\)['\"]\{0,1\}$/\1/p" "$ENV_FILE" | tail -1
}

BUILD_ARGS="--build-arg APP=$APP"
VARS="VITE_APP_API_URL VITE_APP_AUTH_HOST VITE_APP_CLIENT_HOST VITE_APP_ADMIN_HOST VITE_APP_LANDING VITE_APP_SUPPORT_EMAIL VITE_APP_SITE_URL"
VARS="$VARS VITE_OPENOBSERVE_URL VITE_OPENOBSERVE_ORG VITE_OPENOBSERVE_CLIENT_TOKEN" # @feature telemetry
for VAR in $VARS; do
	VALUE="$(read_var "$VAR")"
	[ -n "$VALUE" ] && BUILD_ARGS="$BUILD_ARGS --build-arg $VAR=$VALUE"
done

echo "Building $APP for '$ENV_NAME' -> $REGISTRY/web-$APP:$TAG"
echo "  (URLs baked in from $ENV_FILE)"

# shellcheck disable=SC2086
docker buildx build --push --platform "$PLATFORMS" \
	$BUILD_ARGS \
	-t "$REGISTRY/web-$APP:$TAG" \
	.
