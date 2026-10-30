#!/usr/bin/env bash
# Codifica as sequências PNG (sem perdas) nos formatos de entrega. Sem áudio.
set -euo pipefail
SEQ=$1; OUT=$2; mkdir -p "$OUT"
X264="-c:v libx264 -preset slow -profile:v high -pix_fmt yuv420p -an -movflags +faststart"
TAG="-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
VF="scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int"
enc() { ffmpeg -y -v error -framerate 60 -i "$SEQ/$1/white/%04d.png" -vf "$VF" $X264 -crf "$2" $TAG -r 60 "$OUT/$3"; }
enc Reveal-3840x2160 12 missoes-logo-reveal_3840x2160_60fps.mp4
enc Reveal-1920x1080 14 missoes-logo-reveal_1920x1080_60fps.mp4
enc Reveal-1080x1920 14 missoes-logo-reveal_1080x1920_reels_60fps.mp4
enc Reveal-1080x1080 14 missoes-logo-reveal_1080x1080_feed_60fps.mp4
ffmpeg -y -v error -framerate 60 -i "$SEQ/Reveal-3840x2160/rgba/%04d.png" -vf "$VF" -c:v prores_ks -profile:v 4444 \
  -pix_fmt yuva444p10le $TAG -alpha_bits 16 -vendor apl0 -an -r 60 "$OUT/missoes-logo-reveal_3840x2160_60fps_alpha_prores4444.mov"
