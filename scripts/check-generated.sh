#!/usr/bin/env bash
# Helix and Zed compile src/parser.c rather than generating it, so a commit
# where it disagrees with grammar.js ships a stale parser.
set -euo pipefail

ts=${TREE_SITTER:-node_modules/.bin/tree-sitter}

# src/tree_sitter/*.h is the CLI's own runtime header set, not built from
# grammar.js, and it changes with the CLI version.
generated=(src/parser.c src/grammar.json src/node-types.json)

"$ts" generate

if ! git diff --exit-code -- "${generated[@]}"; then
	echo "src/ is stale. Run: tree-sitter generate" >&2
	exit 1
fi

echo "src/ matches grammar.js"
