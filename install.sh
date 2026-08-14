#!/usr/bin/env bash
#
# Make the stacks skills available to Claude Code, and `stack` available to you.
#
#   bash ~/.claude/stacks/install.sh
#
# Safe to re-run.

set -uo pipefail

STACKS=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
SKILLS="$HOME/.claude/skills"

ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
skip() { printf '  \033[90m·\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }
step() { printf '\n\033[1m%s\033[0m\n' "$*"; }

step "Checks"
command -v node >/dev/null || die "node is not on PATH; the CLI needs it."
[ -d "$STACKS/templates" ] || die "$STACKS is not the stacks folder."
ok "node $(node --version)"

# --- skills ------------------------------------------------------------------
# Symlinked rather than installed as a plugin: skills under ~/.claude/skills are
# discovered globally with no marketplace registration, and a symlink means an
# edit to a SKILL.md takes effect immediately instead of after a re-cache.
step "Skills"
mkdir -p "$SKILLS"
for skill in stack-new stack-sync; do
	target="$SKILLS/$skill"
	if [ -L "$target" ]; then
		rm -f "$target"
	elif [ -e "$target" ]; then
		die "$target exists and is not a symlink — move it aside first."
	fi
	ln -s "$STACKS/skills/$skill" "$target" || die "could not link $skill"
	ok "$skill → $STACKS/skills/$skill"
done

# --- CLI ---------------------------------------------------------------------
step "CLI"
chmod +x "$STACKS/cli/stack.mjs"
LINKED=''
for dir in "$HOME/.local/bin" "$HOME/bin"; do
	if [ -d "$dir" ]; then
		ln -sf "$STACKS/cli/stack.mjs" "$dir/stack" && ok "stack → $dir/stack" && LINKED=1
		break
	fi
done
if [ -z "$LINKED" ]; then
	skip "no ~/.local/bin or ~/bin; add this to your shell rc instead:"
	printf "\n      alias stack='node %s/cli/stack.mjs'\n" "$STACKS"
fi

# --- verify ------------------------------------------------------------------
step "Verify"
node "$STACKS/cli/stack.mjs" doctor >/dev/null 2>&1 \
	&& ok "all templates pass doctor" \
	|| warn "doctor reported problems — run: node $STACKS/cli/stack.mjs doctor"
COUNT=$(node "$STACKS/cli/stack.mjs" list 2>/dev/null | grep -cE '^  [a-z]' || echo 0)
ok "$COUNT templates"

cat <<EOF

Done. Restart Claude Code (or /reload) so it picks up the skills, then:

  /stack-new            scaffold a new project
  /stack-sync           fold changes back into the templates

Outside Claude Code:

  stack list
  stack info nest-api
  stack new nest-api ~/Projects/acme/api --with realtime
EOF
