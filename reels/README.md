# Reels TJRS: Dia Internacional das Pessoas com Deficiência

Animação vetorial em Remotion (React + SVG), 1080x1920, 30 fps, 900 frames.
As entregas finais estão em `../entregas/`.

## Gerar de novo
```
npm install
node scripts/build-text.mjs                        # letras viram paths SVG (Atkinson Hyperlegible) e checa a zona segura
node scripts/render.mjs sheet                      # contact sheet: 1 frame a cada 0,5 s em out/sheet
python3 scripts/sheet.py out/sheet out/contact.png 10 guides
python3 scripts/palette_check.py out/sheet         # regra das duas cores
node scripts/render.mjs video Reels out/video_mudo.mp4
node scripts/render.mjs video ReelsLegendado out/video_legendado_mudo.mp4
python3 scripts/audio.py out/audio_trilha_efeitos.wav   # trilha + efeitos a -14 LUFS, silêncio de 11,5 s a 13,5 s
```

## Estrutura
- `src/Video.tsx`: roteiro completo frame a frame (cenas, metamorfoses, seta, textos)
- `src/lib.tsx`: paleta, easings, molas, keyframes, interpolação de pontos, hachura de duas cores
- `src/text.tsx`: tipografia cinética letra a letra
- `src/characters.tsx`: seta do cursor e mão cartoon (poses: apontar, mão aberta, letra L da Libras)
