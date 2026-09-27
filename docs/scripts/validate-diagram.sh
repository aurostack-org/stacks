#!/usr/bin/env bash
# Validate one archify spec at showcase quality and print a short verdict.
#   scripts/validate-diagram.sh diagrams/<name>.<type>.json
set -uo pipefail
ARCHIFY=${ARCHIFY:-$HOME/.agents/skills/archify/bin/archify.mjs}
spec=$(realpath "$1"); type=$(basename "$spec" .json); type=${type##*.}
node "$ARCHIFY" validate "$type" "$spec" --quality showcase --json | node -e '
let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
 const j=JSON.parse(d); const all=[...(j.errors||[]),...(j.diagnostics||[]),...(j.composition?.diagnostics||[])]; const errs=all.filter(x=>x.severity!=="warning"); const warns=[...(j.warnings||[]),...all.filter(x=>x.severity==="warning")];
 const checks=j.artifact_checks||j.artifactChecks||j.receipt?.artifact_checks;
 console.log(`ok=${j.ok} errors=${errs.length} warnings=${warns.length}`+(checks?` checks=${Array.isArray(checks)?checks.length:JSON.stringify(checks)}`:""));
 for (const e of [...errs,...warns].slice(0,8)) console.log(" -",e.code,":",(e.message||"").split("\n").slice(0,3).join(" | "));
 if(!j.ok) process.exitCode=1;
})'
