#!/usr/bin/env bash
#
# Re-derive nest-monorepo from nest-api and node-worker. The work is in
# derive.mjs (it edits JSON and writes the manifest); this wrapper exists so the
# command matches every other derived template.
#
# Usage:  bash templates/nest-monorepo/derive.sh
#         stack doctor nest-monorepo          # always, afterwards
set -euo pipefail
exec node "$(cd "$(dirname "$0")" && pwd)/derive.mjs" "$@"
