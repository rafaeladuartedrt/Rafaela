# Logo reveal — Missões da Justiça e Cidadania (400 anos)

Animação de 6 s a 60 fps feita em Remotion a partir do PDF vetorial original
(`public/missoes-logo-original.pdf`, exportado do Illustrator).

## Fidelidade à marca

- Nada foi redesenhado. `scripts/pdf_to_layers.py` lê o content stream do PDF
  e escreve cada caminho com as coordenadas do arquivo (as matrizes `cm` são
  translações puras). Só o eixo y é invertido. Os recortes originais (W/W*)
  viram clipPaths.
- Camadas: 4 blocos, 5 grupos de ilustração e 4 linhas de texto (letra por
  letra), sempre na ordem de pintura do arquivo.
- Cores: os valores DeviceRGB do PDF multiplicados por 255.

| Elemento | PDF (rg) | Hex |
|---|---|---|
| Verde-oliva | 0.604 0.624 0.188 | `#9A9F30` |
| Ocre/mostarda | 0.906 0.635 0.169 | `#E7A22B` |
| Coral | 0.906 0.408 0.278 | `#E76847` |
| Ferrugem | 0.733 0.318 0.031 | `#BB5108` |
| Marrom (3 linhas superiores) | 0.349 0.141 0 | `#592400` |
| Marrom (linha inferior) | 0.298 0.153 0.059 | `#4C270F` |

- A partir de 4,30 s o quadro mostra o logo original sem nenhuma transformação.
- O SVG do `pdftocairo` não é usado como fonte porque reescala o conteúdo em
  0,999563.

## Render

```bash
npm install
npm run render      # subamostras -> motion blur -> PNG sem perdas -> vídeos
python3 -I scripts/verify.py build/seq public/missoes-logo-original.pdf qa
```

- Motion blur: cada quadro é a média, em alfa pré-multiplicado, de 4 a 16
  subamostras dentro de um obturador de 180°. Quadros sem movimento ficam
  idênticos.
- Os formatos 16:9, 9:16 e 1:1 são renderizados vetorialmente na própria
  resolução. Nenhum deles é recortado ou reduzido de outro.
- Navegador: o Chromium headless do ambiente. Para usar outro, defina
  `BROWSER_EXECUTABLE`.

## Roteiro

| Tempo | Ação |
|---|---|
| 0,00–0,40 s | 4 pontos nas cores dos blocos surgem e giram no centro |
| 0,40–1,40 s | Cada ponto vira o seu bloco, faz um arco a partir do seu canto e encaixa com easeOutBack leve. Defasagem de 100 ms; 2 traços de impacto por bloco (300 ms) |
| 1,40–2,30 s | Wipe das ilustrações: 400 anos, cruz, igreja, padrão (150 ms entre elas) |
| 2,30–3,00 s | O símbolo desliza do centro para a posição final (easeInOutCubic) |
| 3,00–4,30 s | Texto sobe por máscara a partir da borda do símbolo, letra a letra. CIDADANIA tem overshoot; a última linha entra com fade e sobe |
| 4,30–6,00 s | Logo original parado |
