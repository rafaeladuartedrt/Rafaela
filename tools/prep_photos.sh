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
  convert "$SRC/$n.jpg" -auto-orient "${args[@]}" -filter Lanczos -resize '3200x3200' -resize '4000x3000>' -quality 92 "$OUT/$n.jpg"
  # traço: lápis/nanquim tirado da própria foto (dodge) x contornos (canny)
  convert "$OUT/$n.jpg" -colorspace Gray \( +clone -negate -blur 0x9 \) -compose ColorDodge -composite -level 50%,97% -gamma 0.8 "$OUT/_sk.png"
  convert "$OUT/$n.jpg" -colorspace Gray -blur 0x2.4 -canny 0x2+8%+22% -morphology Dilate Disk:2 -blur 0x1 -negate "$OUT/_c1.png"
  convert "$OUT/_sk.png" "$OUT/_c1.png" -compose Multiply -composite -quality 92 "$OUT/${n}_lines.jpg"
  rm -f "$OUT/_c1.png" "$OUT/_sk.png"
}
prep themis_frontal          60x55+515+278 34x28+540+395
prep themis_cabeca_icamento  95x75+85+490
prep themis_guindaste        70x40+0+318 62x34+598+158 70x30+282+648 55x35+688+492 75x28+265+818
prep themis_icamento_frontal 125x200+225+568 130x70+25+880 50x30+515+452 30x26+98+578
prep themis_fixacao          80x42+660+222 110x52+728+242 38x40+916+1025
prep themis_icamento_fachada_quadrada 70x60+440+860 140x40+690+1010 30x30+235+1045
prep themis_icamento_fachada 70x80+585+1550 230x40+780+1680 40x60+310+1770 30x40+1315+1640 50x40+1030+1630
prep predio_contraplongee 60x90+895+1640 50x80+335+1645 40x60+130+1545
prep predio_vista_alta 60x90+1100+890 30x40+1450+1010
prep predio_vista_baixa 70x90+1090+1070 220x25+20+970 40x60+1820+1170 40x50+1360+1150
# estudos originais da Themis (TIF CMYK): RGB, ampliados e re-tintados
convert "referencias/36_Themis_decada_2005.tif[0]" -colorspace sRGB -filter Lanczos -resize 400% -unsharp 0x2+1+0 -quality 92 "$OUT/estudos.jpg"
convert "$OUT/estudos.jpg" -colorspace Gray -level 20%,90% -quality 92 "$OUT/estudos_lines.jpg"
ls -la "$OUT"
