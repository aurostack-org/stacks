#!/usr/bin/env bash
#
# Maintainer setup: point the `stack` command at this checkout, so `stack
# extract` and your template edits take effect immediately.
#
#   git clone https://github.com/aurostack-org/stacks.git && bash stacks/install.sh
#
# Only needed to *maintain* the templates. To use them, install the Claude Code
# plugin or the npm package instead — see README.md. Safe to re-run.

set -uo pipefail

STACKS=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)

ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
skip() { printf '  \033[90m·\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }
step() { printf '\n\033[1m%s\033[0m\n' "$*"; }

step "Checks"
command -v node >/dev/null || die "node is not on PATH; the CLI needs Node 20.19 or later."
node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>20||(a===20&&b>=19)?0:1)' \
	|| die "Node $(node --version) is too old; the CLI needs 20.19 or later."
ok "node $(node --version)"
[ -d "$STACKS/.git" ] || die "$STACKS is not a git checkout; clone aurostack-org/stacks first."
ok "checkout at $STACKS"

# --- legacy skill links -------------------------------------------------------
# Earlier versions symlinked the skills into ~/.claude/skills. The plugin ships
# them now, and a second copy would register every skill twice.
step "Skills"
removed=''
for skill in stack-new stack-sync; do
	target="$HOME/.claude/skills/$skill"
	if [ -L "$target" ] && [ "$(readlink "$target")" = "$STACKS/skills/$skill" ]; then
		rm -f "$target" && ok "removed legacy link $target" && removed=1
	fi
done
[ -z "$removed" ] && skip "no legacy skill links"

# --- CLI ----------------------------------------------------------------------
step "CLI"
chmod +x "$STACKS/cli/stack.mjs"
LINKED=''
for dir in "$HOME/.local/bin" "$HOME/bin"; do
	if [ -d "$dir" ]; then
		ln -sf "$STACKS/cli/stack.mjs" "$dir/stack" && ok "stack → $dir/stack" && LINKED="$dir/stack"
		break
	fi
done
if [ -z "$LINKED" ]; then
	skip "no ~/.local/bin or ~/bin; add this to your shell rc instead:"
	printf "\n      alias stack='node %s/cli/stack.mjs'\n" "$STACKS"
else
	# An npm-installed `stack` earlier on PATH would win and run a copy instead.
	resolved=$(command -v stack || true)
	if [ -n "$resolved" ] && [ "$(readlink -f "$resolved")" != "$(readlink -f "$STACKS/cli/stack.mjs")" ]; then
		warn "\`stack\` resolves to $resolved, not this checkout."
		warn "Put $(dirname "$LINKED") earlier on PATH, or: npm uninstall -g @aurostack/stacks"
	fi
fi
[ -f "$STACKS/stacks.local.json" ] \
	&& ok "stacks.local.json present (stack extract can find its sources)" \
	|| skip "no stacks.local.json — only needed for stack extract; see README → Keeping templates current"

# --- verify -------------------------------------------------------------------
step "Verify"
node "$STACKS/cli/stack.mjs" doctor >/dev/null 2>&1 \
	&& ok "stack $(node "$STACKS/cli/stack.mjs" --version): versions and templates pass doctor" \
	|| warn "doctor reported problems — run: node $STACKS/cli/stack.mjs doctor"

cat <<EOF

Done. The Claude Code skills come from the plugin:

  /plugin marketplace add aurostack-org/stacks
  /plugin install stacks@aurostack

To try skill edits from this checkout without reinstalling, start a session with:

  claude --plugin-dir "$STACKS"
EOF
