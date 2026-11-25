#!/usr/bin/env bash
# Renderiza os frames-chave (um por cena). Uso: scripts/stills.sh [scale] [outdir] [frames...]
set -e
SCALE=${1:-1}; OUT=${2:-out/checkpoint}; shift 2 || true
FRAMES=${@:-"45 192 324 450 609 756 855"}
mkdir -p "$OUT"
npx remotion bundle src/index.ts --out-dir=out/bundle >/dev/null 2>&1 || true
for f in $FRAMES; do
  npx remotion still out/bundle ThemisAbertura "$OUT/frame_$(printf %03d $f).png" --frame=$f --scale=$SCALE --log=error
done
