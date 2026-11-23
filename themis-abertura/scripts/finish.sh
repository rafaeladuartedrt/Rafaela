#!/usr/bin/env bash
# Finalização: aberração cromática (só bordas, só transições rápidas) + entregas.
# Uso: scripts/finish.sh <intermediario.mov> <pasta_saida>
set -euo pipefail
IN=$1; OUT=$2; mkdir -p "$OUT"
W=3500; H=2000
# janelas de transição rápida (s): crescimento do bloco verde, varreduras, avanço do troféu.
# Nunca nos holds do troféu (24,7–25,8 s) e do logo (27,95–29,5 s).
EN="between(t,5.45,6.1)+between(t,7.1,7.8)+between(t,10.5,11.15)+between(t,12.15,12.85)+between(t,25.85,26.75)"
MASTER="$OUT/themis_abertura_master_${W}x${H}_ProRes422HQ.mov"
ffmpeg -v error -stats -y -i "$IN" -loop 1 -i scripts/ca_mask_${W}x${H}.png -filter_complex \
 "[0:v]format=gbrp10le,split=2[a][b];[b]rgbashift=rh=-6:bh=6:edge=smear:enable='$EN'[s];[1:v]format=gbrp10le[m];[a][s][m]maskedmerge,format=yuv422p10le[v]" \
 -map "[v]" -frames:v 900 -an -c:v prores_ks -profile:v 3 -vendor apl0 -bits_per_mb 8000 \
 -color_primaries bt709 -color_trc bt709 -colorspace bt709 "$MASTER"
# H.264 High, 70 Mbps (máx. 80), yuv420p, faststart — 2 passadas
H264="$OUT/themis_abertura_${W}x${H}_H264.mp4"
ffmpeg -v error -y -i "$MASTER" -c:v libx264 -profile:v high -preset medium -b:v 70M -maxrate 80M -bufsize 140M \
 -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 -pass 1 -passlogfile "$OUT/x264" -an -f mp4 /dev/null
ffmpeg -v error -stats -y -i "$MASTER" -c:v libx264 -profile:v high -preset medium -b:v 70M -maxrate 80M -bufsize 140M \
 -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 -pass 2 -passlogfile "$OUT/x264" -an -movflags +faststart "$H264"
rm -f "$OUT"/x264*
# H.265 (Main, 8 bits 4:2:0, 40 Mbps, tag hvc1 para compatibilidade)
ffmpeg -v error -stats -y -i "$MASTER" -c:v libx265 -preset medium -b:v 40M -x265-params "log-level=error" \
 -pix_fmt yuv420p -tag:v hvc1 -color_primaries bt709 -color_trc bt709 -colorspace bt709 -an -movflags +faststart \
 "$OUT/themis_abertura_${W}x${H}_H265.mp4"
# teste de emenda: o H.264 concatenado 3 vezes (sem reencode)
printf "file '%s'\nfile '%s'\nfile '%s'\n" "$(realpath "$H264")" "$(realpath "$H264")" "$(realpath "$H264")" > "$OUT/_concat.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$OUT/_concat.txt" -c copy -movflags +faststart "$OUT/teste_loop_3x.mp4"; rm -f "$OUT/_concat.txt"
# contact sheet: 1 frame por segundo (0 a 29 s), 6x5, com o tempo
mkdir -p "$OUT/_cs"; ffmpeg -v error -y -i "$MASTER" -vf "select='not(mod(n\,30))',scale=700:-1" -vsync vfr "$OUT/_cs/s%02d.png"
i=0; for f in "$OUT"/_cs/s*.png; do convert "$f" -gravity southwest -fill '#F2F2EE' -undercolor '#000000AA' -pointsize 22 -annotate +8+8 " 0:$(printf %02d $i) · frame $((i*30)) " "$f"; i=$((i+1)); done
montage "$OUT"/_cs/s*.png -tile 6x5 -geometry +6+6 -background '#111111' "$OUT/contact_sheet.png"; rm -rf "$OUT/_cs"
ls -la "$OUT"
