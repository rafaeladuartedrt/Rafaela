# Palácio da Justiça: do traço à Themis

Reels institucional (@tjrsoficial), 1080×1920, 30 fps, ~60 s. Remotion + TypeScript.
Composição parametrizada também em 1920×1080 (`PalacioJustica16x9`).

## Regra do acervo
As imagens originais nunca são alteradas. Só se usam transformações de câmera, recorte por
janela/máscara, opacidade, desfoque de transição e revelação por máscara alfa.
Blocos de cor, linhas de lápis, molduras, sombras e textos ficam em camadas separadas
(`src/core/config.ts`: `USE_COLOR_BLOCKS`, `SHOW_PENCIL_GUIDE`, `SHOW_TEXT`, `ACCENT`).

## Fluxo
1. Copie os TIFs para `assets/originais/` (nomes reconhecidos pelo campo `match` de `assets/crops.json`).
2. `npm install`
3. `npm run prepare-assets` — CMYK → sRGB pelo perfil ICC embutido (sem perfil, o script para;
   pode-se colocar `assets/icc/USWebCoatedSWOP.icc`). Gera PNG 16 bits (`public/img/<id>.png`),
   cópia de exibição 8 bits (`<id>_web8.png`), mapas de revelação (`public/maps/`) e
   `src/generated/manifest.json`. Confere o SHA-256 do TIF antes e depois.
4. `npm run check-scale` — escala efetiva de cada plano em cada quadro, nos dois formatos;
   avisa acima de 150% e grava `out/relatorio_escala.md`. A composição também limita o zoom.
5. `npm run verify-pixels` — renderiza cada recorte a 100% e compara pixel a pixel com o PNG.
6. `npm run preview` (540×960, veryfast) e `npm run contact-sheet` (1 quadro a cada 2 s).
7. `npm run render` (1080×1920, CRF 18, slow) / `npm run render-16x9`.

## Opcionais (entram só se o arquivo existir; rode `prepare-assets` depois de incluir)
- `public/audio/trilha.mp3` — trilha
- `public/audio/lapis.mp3` — efeito de lápis nas revelações de traço
- `public/assets/logo_tjrs.png` — assinatura final
- `public/assets/orbita.mp4` — substitui a órbita simulada da Cena 11

## Onde ajustar
- `assets/crops.json`: recortes, blocos de cor e pontos de foco por arquivo.
- `src/core/timeline.ts`: roteiro (tempos, câmera, transições).
- Arquivos ainda não recebidos aparecem como molduras "ARQUIVO PENDENTE" (`SHOW_PLACEHOLDERS`).
