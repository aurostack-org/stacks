#!/usr/bin/env bash
#
# Re-derive the mechanically-copyable half of the react-app template from
# react-monorepo.
#
# react-app is the same stack as react-monorepo collapsed into one Vite app, so
# the shared packages and the page components are *identical source* — only their
# location and their import specifiers differ. Rather than maintain two copies by
# hand and watch them drift, this script re-flattens them:
#
#   packages/<p>/src/**               ->  src/shared/<p>/**
#   apps/auth/src/{components,lib}/** ->  src/features/auth/**
#   apps/auth/src/routes/**           ->  src/routes/auth/**
#   apps/client/src/routes/**         ->  src/routes/**
#   apps/landing/src/...              ->  src/routes/marketing/, src/features/seo/
#
# and rewrites `@acme/x` -> `@/shared/x`.
#
# A handful of files genuinely differ in a monolith — one origin means the auth
# guard navigates instead of redirecting across hosts, and the auth screens take
# in-app paths rather than sibling-app URLs. Those live in `overrides/` and are
# copied over the derived tree at the end, so this script is idempotent and the
# divergence from the monorepo is visible in one directory listing.
#
# Everything outside the DERIVED trees — the router, store, providers, vite
# config, package.json, Dockerfile — is hand-written and untouched here.
#
# Usage:  bash templates/react-app/derive.sh
#         stack doctor react-app          # always, afterwards
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
STACKS="$(cd "$HERE/../.." && pwd)"
SRC="$STACKS/templates/react-monorepo/files"
DST="$HERE/files"

[ -d "$SRC" ] || { echo "missing $SRC — extract react-monorepo first" >&2; exit 1; }

# Trees this script owns end to end and rebuilds from scratch every run.
DERIVED=(
	src/shared
	src/features/auth
	src/features/seo
	src/routes/auth
	src/routes/marketing
)

echo "==> clearing derived trees"
for dir in "${DERIVED[@]}"; do
	rm -rf "${DST:?}/$dir"
done

echo "==> flattening packages -> src/shared"
mkdir -p "$DST/src/shared"
for pkg in ui api auth layouts hooks types; do
	cp -r "$SRC/packages/$pkg/src" "$DST/src/shared/$pkg"
done
# The brand tokens live in the config package in the monorepo because three
# other packages consume them; here there is one consumer, so they sit next to
# the stylesheet that imports them.
cp "$SRC/packages/config/tailwind/theme.css" "$DST/src/shared/ui/styles/theme.css"
# `packages/types/src/types/api` earns its doubled segment as a package (the
# package is `types`, the directory of generated output is `types/api`). Flattened
# into one app it just reads as a stutter, so it lands at `shared/types/api`.
mv "$DST/src/shared/types/types/api" "$DST/src/shared/types/api"
rmdir "$DST/src/shared/types/types"

echo "==> flattening apps -> src/features, src/routes"
mkdir -p "$DST/src/features/auth" "$DST/src/routes/auth" "$DST/src/routes/marketing" "$DST/src/features/seo"
cp -r "$SRC/apps/auth/src/components" "$DST/src/features/auth/components"
cp -r "$SRC/apps/auth/src/lib" "$DST/src/features/auth/lib"
# `env.ts` is per-app in the monorepo (four different sets of sibling origins);
# the monolith has exactly one, hand-written at src/lib/env.ts.
rm -f "$DST/src/features/auth/lib/env.ts"
cp "$SRC"/apps/auth/src/routes/*.tsx "$DST/src/routes/auth/"
cp "$SRC"/apps/client/src/routes/*.tsx "$DST/src/routes/"
cp "$SRC/apps/landing/src/routes/home.tsx" "$DST/src/routes/marketing/home.tsx"
cp "$SRC/apps/landing/src/features/seo/routes.ts" "$DST/src/features/seo/routes.ts"

echo "==> rewriting import specifiers"
# Longest first: `@acme/ui/brand` must not be matched by the `@acme/ui` rule.
# `@` resolves to `src` (vite alias + tsconfig paths), so these are valid from
# any depth and survive a file being moved.
find "$DST/src" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) -print0 |
	xargs -0 sed -i \
		-e "s#@acme/ui/theme-colors#@/shared/ui/theme/theme-colors#g" \
		-e "s#@acme/ui/globals.css#@/shared/ui/styles/globals.css#g" \
		-e "s#@acme/ui/brand#@/shared/ui/meta/brand#g" \
		-e "s#@acme/types/zod#@/shared/types/api/zod.gen#g" \
		-e "s#@acme/config/tailwind.css#./theme.css#g" \
		-e "s#@acme/config#theme.css#g" \
		-e "s#@acme/ui#@/shared/ui#g" \
		-e "s#@acme/api#@/shared/api#g" \
		-e "s#@acme/auth#@/shared/auth#g" \
		-e "s#@acme/layouts#@/shared/layouts#g" \
		-e "s#@acme/hooks#@/shared/hooks#g" \
		-e "s#@acme/types#@/shared/types#g"

# The auth screens moved one level deeper than their components and lib, so
# their relative imports no longer reach. Anchor them instead.
find "$DST/src/routes/auth" -type f -name '*.tsx' -print0 |
	xargs -0 sed -i \
		-e "s#'\.\./components/#'@/features/auth/components/#g" \
		-e "s#'\.\./lib/#'@/features/auth/lib/#g"

# ...which the types barrel points at.
sed -i -e "s#'\./types/api#'./api#g" -e "s#under \./types/api#under ./api#" "$DST/src/shared/types/index.ts"

# Package barrels name themselves in their header comment.
find "$DST/src/shared" -type f -name 'index.ts' -print0 |
	xargs -0 sed -i -e "s#^// @acme/\([a-z]*\) —#// @/shared/\1 —#"

echo "==> applying monolith overrides"
# One origin, one router: these files diverge from the monorepo on purpose.
# `cp -v` so the list is visible in the output — if one of these ever stops
# corresponding to a real derived file, it shows up here as a new path rather
# than silently doing nothing.
(cd "$HERE/overrides" && find . -type f -print0) |
	while IFS= read -r -d '' rel; do
		target="$DST/${rel#./}"
		[ -f "$target" ] || echo "  NOTE: override has no derived counterpart: ${rel#./}"
		mkdir -p "$(dirname "$target")"
		cp "$HERE/overrides/${rel#./}" "$target"
		echo "  ${rel#./}"
	done

echo
echo "done. Now run:  node $STACKS/cli/stack.mjs doctor react-app"
