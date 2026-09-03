#!/usr/bin/env bash
# Runs every check the CI workflow runs.
# Usage: scripts/ci.sh [path-to-boo-checkout]
set -euo pipefail

boo=${1:-${BOO_CHECKOUT:-boo}}
ts=${TREE_SITTER:-node_modules/.bin/tree-sitter}

scripts/check-generated.sh
"$ts" test
"$ts" parse -q scripts/bumpversion.boo

if [ ! -d "$boo" ]; then
	git clone --depth 1 https://github.com/mattmc3/boo "$boo"
fi

scripts/parse-rate.sh "$boo"
