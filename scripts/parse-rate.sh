#!/usr/bin/env bash
# Parses every .boo file in a compiler checkout and fails below the floor.
# Usage: scripts/parse-rate.sh [path-to-boo-checkout]
set -uo pipefail

floor=${PARSE_RATE_FLOOR:-98.5}
boo=${1:-boo}
ts=${TREE_SITTER:-node_modules/.bin/tree-sitter}

if [ ! -d "$boo" ]; then
	echo "no compiler checkout at $boo" >&2
	exit 1
fi

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

find "$boo" -type f -name '*.boo' -print0 | sort -z > "$work/files"
total=$(tr -dc '\0' < "$work/files" | wc -c | tr -d ' ')

if [ "$total" -eq 0 ]; then
	echo "no .boo files under $boo" >&2
	exit 1
fi

# Fail loudly here rather than once per batch below.
"$ts" build || exit 1

# Batched so the corpus cannot outgrow the argument list. With -q the only
# thing on stdout is one line per file that failed.
# A failing file makes tree-sitter exit non-zero, and xargs then reports 123 on
# GNU but 1 on BSD, so the outcome is checked instead of the status.
xargs -0 -n 100 "$ts" parse -q < "$work/files" > "$work/failed" 2> "$work/err" || true

failed=$(wc -l < "$work/failed" | tr -d ' ')

if [ "$failed" -eq "$total" ]; then
	echo "every file failed, so tree-sitter parse never ran" >&2
	cat "$work/err" >&2
	exit 1
fi
rate=$(awk -v t="$total" -v f="$failed" 'BEGIN { printf "%.2f", (t - f) * 100 / t }')
echo "corpus: $total files, $failed failed, ${rate}%"

if awk -v r="$rate" -v f="$floor" 'BEGIN { exit !(r + 0 >= f + 0) }'; then
	exit 0
fi

echo "parse rate ${rate}% is below the ${floor}% floor" >&2
cat "$work/failed" >&2
exit 1
