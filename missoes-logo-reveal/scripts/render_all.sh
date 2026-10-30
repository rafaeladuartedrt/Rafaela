#!/usr/bin/env bash
# Render completo: subamostras -> acumulação -> PNG sem perdas -> vídeos.
set -euo pipefail
cd "$(dirname "$0")/.."
WORK=${WORK:-build}
for C in Reveal-3840x2160 Reveal-1920x1080 Reveal-1080x1920 Reveal-1080x1080; do
  node scripts/render_frames.mjs "$C" "$WORK/sub/$C"
  python3 -I scripts/assemble.py "$WORK/sub/$C" "$WORK/seq/$C"
  rm -rf "$WORK/sub/$C"
done
bash scripts/encode.sh "$WORK/seq" out
