#!/usr/bin/env bash
# Validate, render and visually check archify diagrams.
#   scripts/render-diagrams.sh [name ...]   (default: every diagrams/*.json)
# Specs live in diagrams/<name>.<type>.json; HTML goes to public/diagrams/<name>.html.
# Needs the archify skill (ARCHIFY, default ~/.agents/skills/archify) and a
# Chrome it can drive (ARCHIFY_CHROME; snap Chromium can't read hidden dirs).
set -uo pipefail
cd "$(dirname "$0")/.."
ARCHIFY=${ARCHIFY:-$HOME/.agents/skills/archify/bin/archify.mjs}
reports=${REPORTS:-/tmp/archify-reports}
mkdir -p public/diagrams "$reports"
specs=()
if [ $# -gt 0 ]; then for n in "$@"; do specs+=(diagrams/"$n".*.json); done; else specs=(diagrams/*.json); fi
status=0
for spec in "${specs[@]}"; do
	base=$(basename "$spec" .json); name=${base%.*}; type=${base##*.}
	out=public/diagrams/$name.html
	if ! node "$ARCHIFY" deliver "$type" "$spec" "$out" --quality showcase --json > "$reports/$name.deliver.json"; then
		echo "FAIL  $name: deliver (see $reports/$name.deliver.json)"; status=1; continue
	fi
	node "$ARCHIFY" visual-check "$out" --json > /dev/null 2>&1
	mv -f public/diagrams/"$name".visual-check.* "$reports"/ 2>/dev/null
	verdict=$(node -e 'const j=require(process.argv[1]);const d=(j.diagnostics||[]).map(x=>x.code);console.log(j.status+(d.length?" "+[...new Set(d)].join(","):""))' "$reports/$name.visual-check.json")
	echo "$([ "${verdict%% *}" = pass ] && echo ok || echo WARN)  $name: $verdict"
	[ "${verdict%% *}" = pass ] || status=1
done
exit $status
