#!/usr/bin/env bash
#
# Copy the house UI kit from react-monorepo into the next-site template.
#
# next-site keeps its own storefront components (from Payload's starter) but
# shares the house kit's atoms and its theme, so a design system applied with
# the stack-from-design skill themes it the same way as the React templates.
# This script owns, and rebuilds every run:
#
#   packages/ui/src/components/ui/<atom>.tsx  ->  src/components/ui/<atom>.tsx
#   packages/ui/src/theme/**                  ->  src/components/ui/theme/**
#   packages/ui/src/styles/globals.css        ->  src/components/ui/styles/globals.css
#   packages/config/tailwind/theme.css        ->  src/components/ui/styles/theme.css
#
# and makes three mechanical changes: `cn` comes from `@/utilities/cn`, the
# stylesheet imports its brand tokens from beside it, and modules that use
# client-only React get a 'use client' directive (Next renders on the server by
# default; Vite never needed it). Everything else in src/components/ui is the
# starter's and untouched here.
#
# Usage:  bash templates/next-site/derive-ui.sh [dir]   (default: this template's files/)
#         stack doctor next-site                       # always, afterwards
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
STACKS="$(cd "$HERE/../.." && pwd)"
KIT="$STACKS/templates/react-monorepo/files/packages/ui/src"
CONFIG="$STACKS/templates/react-monorepo/files/packages/config/tailwind/theme.css"

DST="${1:-$HERE/files}"
UI="$DST/src/components/ui"
[ -d "$UI" ] || { echo "not a next-site tree: $DST (no src/components/ui)" >&2; exit 1; }

# The atoms both kits have. The starter's own (dialog, sheet, carousel) stay.
ATOMS=(button card checkbox input label select sonner textarea)
# Modules that use hooks, context or Radix state: client components in Next.
CLIENT=(checkbox label select sonner theme/theme-provider theme/theme-toggle theme/use-theme)

echo "==> atoms"
for atom in "${ATOMS[@]}"; do
	cp "$KIT/components/ui/$atom.tsx" "$UI/$atom.tsx"
done

echo "==> theme and styles"
rm -rf "$UI/theme" "$UI/styles"
cp -r "$KIT/theme" "$UI/theme"
mkdir -p "$UI/styles"
cp "$KIT/styles/globals.css" "$UI/styles/globals.css"
cp "$CONFIG" "$UI/styles/theme.css"

echo "==> rewriting imports"
find "$UI" -maxdepth 2 -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 |
	xargs -0 sed -i -E "s#from '(\.\./)+lib/utils'#from '@/utilities/cn'#"
sed -i \
	-e "s#@import '@acme/config/tailwind.css';#@import './theme.css';#" \
	-e "s#  import '@acme/ui/globals.css';#  @import '@/components/ui/styles/globals.css';#" \
	-e "/@source '\.\.\/\.\.\/\.\.\/layouts\/src/d" \
	"$UI/styles/globals.css"
sed -i -e "s#@acme/config/tailwind.css#./theme.css#g" "$UI/styles/theme.css"

echo "==> 'use client'"
for mod in "${CLIENT[@]}"; do
	file="$(ls "$UI/$mod".ts* 2>/dev/null | head -1)"
	[ -n "$file" ] || { echo "  missing $mod" >&2; exit 1; }
	grep -q "^'use client'" "$file" || sed -i "1i 'use client';\n" "$file"
	echo "  ${file#"$DST/"}"
done

echo
echo "done. Check it in place (see README.md), then: node $STACKS/cli/stack.mjs doctor next-site"
