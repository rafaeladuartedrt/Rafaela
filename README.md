# Palácio da Justiça: do traço à Themis

Animação de 60 s para Reels (1080 × 1920, 30 fps), gerada por código. O Palácio da Justiça de Porto Alegre nasce como traço de nanquim, se constrói, recebe os materiais e termina na Themis de Carlos Maximiliano Fayet.

## Entregáveis (`entregaveis/`)
- `palacio_master_silent.mp4`: master H.264, sem áudio
- `contact_sheet.jpg`: um quadro a cada 2 s
- `storyboard.md` e `pesquisa.md` (na raiz)

## Estrutura
- `src/`: cena em three.js
  - `building.js`: prédio procedural
  - `themis.js`: Themis, lâminas do cabelo, espada e estudos
  - `scenes.js`: corte, hall e folha
  - `lines.js`: traço de nanquim
  - `materials.js`: revelação em aquarela e hachura
  - `post.js`: papel, profundidade de campo, motion blur e transições
  - `timeline.js`: roteiro em função pura do tempo
- `tools/build_themis.mjs`: escultura por campo de distância e poligonização (gera `assets/`)
- `tools/render.mjs`: render determinístico quadro a quadro em Chromium headless
- `referencias/`: material de consulta. Nada dele entra no vídeo.

## Como gerar
```bash
npm install
node tools/build_themis.mjs
NODE_PATH=$(npm root -g) node tools/render.mjs --w 1080 --h 1920 --from 0 --to 1800 --out out/frames --workers 3
ffmpeg -framerate 30 -i out/frames/f%05d.jpg -c:v libx264 -pix_fmt yuv420p -crf 18 -preset slow -movflags +faststart -an entregaveis/palacio_master_silent_crf18.mp4
```
Prévia de um quadro: `node tools/render.mjs --w 540 --h 960 --from 900 --to 901 --out out/prev`.

O Blender não estava disponível no ambiente de produção (sem GPU e sem acesso ao download). Por isso foi usado o caminho previsto no briefing: three.js renderizado quadro a quadro via Playwright e montado no ffmpeg.
