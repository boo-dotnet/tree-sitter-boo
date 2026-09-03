#!/usr/bin/env bash
# Helix and Zed compile src/parser.c rather than generating it, so a commit
# where it disagrees with grammar.js ships a stale parser.
set -euo pipefail

ts=${TREE_SITTER:-node_modules/.bin/tree-sitter}

"$ts" generate

if ! git diff --exit-code -- src/; then
	echo "src/ is stale. Run: tree-sitter generate" >&2
	exit 1
fi

echo "src/ matches grammar.js"
