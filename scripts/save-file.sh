#!/usr/bin/env bash
# save-file.sh
# Usage: save-file.sh <file-path>
# Reads stdin and writes to the specified file (creates parent dir if needed).
set -euo pipefail
if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <file-path>" >&2
  exit 1
fi
TARGET="$1"
DIR=$(dirname "$TARGET")
mkdir -p "$DIR"
cat - > "$TARGET"
chmod 644 "$TARGET" || true
echo "Saved: $TARGET"
ls -lh "$TARGET"
stat -c '%n %U %G %a %y' "$TARGET"
