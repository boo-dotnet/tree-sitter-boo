#!/usr/bin/env bash
# Runs every check the CI workflow runs.
# Usage: scripts/ci.sh [path-to-boo-checkout]
set -euo pipefail

boo=${1:-${BOO_CHECKOUT:-boo}}
ts=${TREE_SITTER:-node_modules/.bin/tree-sitter}

# Keep in step with the ref pinned in .github/workflows/ci.yml.
corpus_rev=26a0dfa2073b64cf43766dd6df2b3680ec7597dc

scripts/check-generated.sh
"$ts" test
"$ts" parse -q scripts/bumpversion.boo

# Fetched by revision rather than cloned, so a shallow copy still lands on the
# pinned commit.
if [ ! -d "$boo" ]; then
	git init -q "$boo"
	git -C "$boo" remote add origin https://github.com/boo-lang/boo
	git -C "$boo" fetch -q --depth 1 origin "$corpus_rev"
	git -C "$boo" checkout -q FETCH_HEAD
fi

scripts/parse-rate.sh "$boo"
