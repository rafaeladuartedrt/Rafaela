#!/usr/bin/env bash
# Prepara as fotos originais: desfoca qualquer texto legível e extrai o traço (contornos) para o desenho a nanquim.
# Saída: assets/photos/<nome>.jpg e assets/photos/<nome>_lines.png
set -e
cd "$(dirname "$0")/.."
SRC=referencias/fotos; OUT=assets/photos; mkdir -p "$OUT"
prep() { # nome  regiões-para-desfocar...
  local n=$1; shift
  local args=()
  for r in "$@"; do args+=(-region "$r" -blur 0x9 +region); done
  convert "$SRC/$n.jpg" -auto-orient "${args[@]}" -resize '2048x2048>' -quality 92 "$OUT/$n.jpg"
  # traço: contornos em duas escalas + linhas de sombra, engrossados levemente
  convert "$OUT/$n.jpg" -colorspace Gray -blur 0x1.2 -canny 0x1.2+8%+22% "$OUT/_c1.png"
  convert "$OUT/$n.jpg" -colorspace Gray -blur 0x3 -canny 0x2.5+6%+18% "$OUT/_c2.png"
  convert "$OUT/_c1.png" "$OUT/_c2.png" -compose Lighten -composite -morphology Dilate Disk:1.2 -blur 0x0.6 -negate "$OUT/${n}_lines.png"
  rm -f "$OUT/_c1.png" "$OUT/_c2.png"
}
prep themis_frontal          60x55+515+278 34x28+540+395
prep themis_cabeca_icamento  95x75+85+490
prep themis_guindaste        70x40+0+318 62x34+598+158 70x30+282+648 55x35+688+492 75x28+265+818
prep themis_icamento_frontal 125x200+225+568 130x70+25+880 50x30+515+452 30x26+98+578
prep themis_fixacao          80x42+660+222 110x52+728+242 38x40+916+1025
for f in predio_contraplongee predio_vista_baixa predio_vista_alta predio_aerea; do
  [ -f "$SRC/$f.jpg" ] && prep "$f" ${REG[$f]} || true
done
# estudos originais da Themis (TIF CMYK): RGB, ampliados e re-tintados
convert "referencias/36_Themis_decada_2005.tif[0]" -colorspace sRGB -filter Lanczos -resize 400% -unsharp 0x2+1+0 -quality 92 "$OUT/estudos.jpg"
convert "$OUT/estudos.jpg" -colorspace Gray -level 35%,80% -negate -morphology Dilate Disk:0.8 -negate "$OUT/estudos_lines.png"
ls -la "$OUT"
