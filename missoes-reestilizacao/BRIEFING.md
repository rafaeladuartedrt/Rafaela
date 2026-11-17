# Prompt para o Claude Code: reestilização cinematográfica do vídeo "Cruz e Ruínas de São Miguel" (v2)

> Copie tudo abaixo da linha e cole no Claude Code. Rode o Claude Code **no computador onde o Adobe After Effects está instalado**, para que ele consiga gerar e testar o projeto .aep. Antes, coloque na pasta do projeto os arquivos indicados em "Arquivos de entrada".

---

## Papel e padrão de qualidade

Atue como um **diretor de arte e motion designer sênior de pós-produção cinematográfica**, com domínio de Adobe After Effects (tracking 3D, shape layers, expressions, ExtendScript), compositing, color grading e entrega para plataformas. O resultado precisa ter acabamento de vinheta de festival ou abertura de série: movimentos com easing, motion blur, traço limpo e vetorial, cor consistente e sem flicker, artefatos ou serrilhado.

Sou da comunicação do Tribunal de Justiça do Rio Grande do Sul (TJRS). A peça é para o projeto **Missões da Justiça e Cidadania, 400 anos, São Miguel das Missões - RS**. Vamos **reestilizar um vídeo existente** em linguagem de motion graphics e ilustração arquitetônica, sem alterar o conteúdo nem o movimento de câmera.

## Arquivos de entrada (pasta `input/`)

- `original.mp4`: vídeo a ser reestilizado (1920x1080, 24 fps, 10 s).
- `ref_arquitetura.mp4`: referência 1 (interior arquitetônico em traço de nanquim sobre branco, com blocos chapados de cor).
- `ref_colagem.mp4`: referência 2 (abertura em colagem: papel, recortes rasgados, traço a lápis, cor chapada).
- `logo.png`: logo oficial (fonte da paleta). Não deve aparecer no vídeo.
- `ref_igreja_linha.png` e `ref_cruz_linha.png`: pictogramas do logo (igreja e cruz em linha branca sobre cor chapada). São a principal referência de traço.
- `ref_vyborg_1.jpg` e `ref_vyborg_2.jpg`: cartazes com foto P&B, bloco de cor chapado e linhas finas redesenhando a arquitetura.

Antes de começar, extraia frames das referências e me descreva em poucas linhas o que vai aproveitar de cada uma.

## O que o vídeo original mostra (não pode mudar)

| Tempo | Conteúdo e movimento |
|---|---|
| 0 a 1 s | Close da cruz missioneira (cruz de Lorena, dois braços) em pedra, céu de fim de tarde. |
| 1 a 4 s | Travelling lateral/orbital: a cruz desliza para a esquerda e revela as ruínas da igreja de São Miguel Arcanjo (torre à esquerda, frontão triangular, janela central vazada). Gramado em primeiro plano, árvores no horizonte. |
| 4 a 6 s | Cruz sai pela esquerda. Fachada frontal e centralizada. |
| 6 a 9 s | Push-in contínuo até a janela central, com o sol por trás dela. |
| 9 a 10 s | A câmera "entra" pela janela e o quadro estoura em branco. |

**Regras invioláveis**
1. Mesma duração e mesmo fps (24). Cada frame de saída corresponde ao frame de mesmo índice no original.
2. Nenhum movimento de câmera novo, nenhum corte, nenhuma mudança de velocidade.
3. Nenhum elemento novo de cena (pessoas, objetos, textos, logos). Só a linguagem visual muda.
4. Linhas e blocos de cor **grudados** na arquitetura durante todo o movimento, sem escorregar.

## Paleta (extraída do logo, usar só estas cores)

| Nome | HEX | Uso |
|---|---|---|
| Coral | `#E76847` | Bloco principal atrás da fachada. |
| Mostarda | `#E7A22B` | Bloco atrás da cruz e céu. |
| Verde oliva | `#9A9F30` | Gramado e árvores. |
| Laranja queimado | `#BB5108` | Sombras, portas, vãos, padrão em zigue-zague do logo como detalhe. |
| Marrom escuro | `#592400` | Traço de contorno (nanquim). |
| Branco | `#FFFFFF` | Linhas de redesenho, papel, luz da janela. |

Permitido: cinzas quentes derivados do marrom para as áreas fotográficas dessaturadas. Proibido: qualquer cor fora da tabela.

## Linguagem visual

1. **Linhas que redesenham as estruturas** (pictogramas do logo + Vyborg): contornos em branco ou marrom escuro sobre a cruz, a torre, o frontão, as janelas, as portas e as cornijas, com linhas de construção que ultrapassam levemente os cantos, como desenho técnico. Espessura consistente com os pictogramas do logo, escalada para a resolução final.
2. **Blocos de cor chapada**: planos coral e mostarda atrás das estruturas, recortando a foto. Dentro do bloco, a foto some ou fica dessaturada e só a linha branca permanece. Fora dele, foto em P&B quente com contraste alto.
3. **Traço de nanquim e cor chapada** (referência arquitetônica): hachura simplificada de pedra e tijolo, áreas planas de cor, aspecto de ilustração à mão sobre papel.
4. **Colagem com moderação** (referência de colagem): textura de papel levemente amassado, bordas rasgadas sutis na entrada dos blocos, grão de filme fino. Nada de textos ou rabiscos que concorram com a arquitetura.

## Direção de animação

- 0 a 16 frames: as linhas da cruz se desenham (Trim Paths com easing exponencial de saída).
- 1 a 4 s: as linhas da fachada se desenham conforme ela entra em quadro, da base para o topo, com defasagem entre torre, corpo e frontão.
- Blocos de cor entram com wipe de papel rasgado, 8 a 10 frames, ease in-out.
- Line boil sutil (traço vivo de desenho à mão) atualizando a cada 2 frames, sem prejudicar a leitura.
- 6 a 9 s: linhas da janela central ganham destaque, brilho suave e convergem para ela.
- 9 a 10 s: o branco vira papel texturizado e as últimas linhas se dissolvem nele.
- Motion blur ativado em todas as camadas animadas (180°, compatível com a câmera original).
- Nenhuma animação linear: todos os keyframes com curvas ajustadas no Graph Editor.

## Pipeline técnico

### Etapa A. Preparação (Python + FFmpeg)
1. Extração dos 240 frames em PNG 16 bits.
2. **Upscale para 4K** (3840x2160) com Real-ESRGAN ou equivalente, avaliando se não gera artefatos na pedra. Se gerar, mantenha a foto em 1080p escalada com Lanczos, já que ela vai ficar dessaturada e por baixo da ilustração. **As linhas e os blocos serão vetoriais e renderizados nativamente em 4K**, que é onde está o ganho real de nitidez.
3. Máscaras por elemento (céu, gramado/árvores, cruz, fachada, janela central): segmentação com SAM 2 ou `rembg`, refinada em frames-chave e propagada pelo vídeo. Exportar como sequências PNG de matte, com prévia sobreposta para eu validar.
4. Dados de movimento: fluxo óptico e homografias por região (cruz e fachada estão em profundidades diferentes), para conferência do tracking do After Effects.
5. Linhas-base: extração de contornos estruturais nos frames-chave (privilegiando retas e arcos), simplificados e exportados como SVG/AI para virar shape layers.

### Etapa B. Projeto After Effects (ExtendScript .jsx gerado e executado por você)
Gere um script `build_project.jsx` que monte o projeto `Missoes_Reestilizado.aep` com:
- Comp mestre 3840x2160, 24 fps, 10 s, **projeto em 16 bpc**, espaço de cor Rec.709.
- Footage original + versão upscaled + mattes importados.
- **3D Camera Tracker** aplicado ao original (ou, se o script não puder rodar o tracker, deixe a camada preparada e me dê o passo a passo para eu rodar e clicar em "Create Camera", e então continue). As linhas e blocos ficam em camadas 3D presas a nulls do tracker, uma para a cruz e outra para a fachada.
- Pré-comps organizadas e nomeadas: `01_FOTO_ESTILIZADA`, `02_BLOCOS_COR`, `03_TRACO_MARROM`, `04_LINHAS_BRANCAS`, `05_TEXTURAS`, `06_GRADE_FINAL`.
- Shape layers com Trim Paths para o desenho das linhas, expressions com `posterizeTime(12)` + `wiggle` leve no Path para o line boil, controlados por um **null "CONTROLES"** com sliders: espessura da linha, intensidade do boil, opacidade dos blocos, quantidade de grão.
- Estilização da foto: Black & White ou Tint quente, Curves, Posterize, máscaras de cor por matte (gramado verde oliva, céu mostarda clareando para branco).
- Textura de papel (gerada por você em 4K, sem flicker, fixa na tela) em modo Multiply, grão fino (Add Grain ou Noise) e vinheta muito sutil.
- Grade final em Lumetri, conferindo que a paleta não foi deslocada.
- Motion blur ligado no projeto e nas camadas.

### Etapa C. Versões de entrega
A partir da comp mestre, crie comps de saída:

| Saída | Formato | Resolução | Observação |
|---|---|---|---|
| **YouTube** | 16:9 | 3840x2160 (4K) | Enquadramento idêntico ao original. |
| **YouTube HD** | 16:9 | 1920x1080 | Para upload rápido e uso interno. |
| **Instagram Reels / Stories** | 9:16 | 1080x1920 | Ver regra de reenquadramento abaixo. |
| **Instagram Feed** | 4:5 | 1080x1350 | Ver regra de reenquadramento abaixo. |

**Regra de reenquadramento vertical**: o movimento de câmera original não muda. Crie um recorte que acompanha o assunto (cruz no início, fachada depois, janela no final) com transição suave de posição, ease in-out e sem trancos, mantendo sempre a estrutura principal inteira em quadro. Respeite a **zona segura dos Reels** (interface ocupa cerca de 250 px no topo e 340 px na base). Se em algum trecho o recorte cortar a cruz ou a torre, use extensão da ilustração (prolongar céu, papel e blocos de cor para cima e para baixo, no estilo dos cartazes de Vyborg) em vez de apertar o corte. Me mostre as duas abordagens nesse trecho para eu escolher.

### Etapa D. Render (Adobe Media Encoder ou aerender + FFmpeg)
- **Master**: ProRes 4444 XQ (ou ProRes 422 HQ), 4K, 24 fps, 10 bits. Arquivo de arquivo e base para futuras versões.
- **YouTube 4K**: H.264 High Profile, 3840x2160, 24 fps, VBR 2 passes, cerca de 45 a 60 Mbps, yuv420p, Rec.709.
- **YouTube HD**: H.264, 1920x1080, 24 fps, cerca de 12 a 16 Mbps.
- **Instagram Reels e Feed**: H.264, 24 fps, cerca de 15 a 20 Mbps, AAC 48 kHz se houver áudio, arquivo abaixo de 100 MB.
- Também exportar as camadas principais (linhas, blocos, texturas) em ProRes 4444 com alpha, para eu reaproveitar em outras peças do projeto.

## Fluxo de aprovação

1. **Stills de estilo**: 6 frames (0, 30, 72, 120, 180, 220) em 4K, lado a lado com o original, em `previews/`. Aguarde meu ok.
2. **Teste de tracking**: prévia de 3 s (frames 24 a 96) em baixa resolução, com as linhas sobre a imagem, para eu confirmar que não escorregam. Aguarde meu ok.
3. **Teste do vertical**: prévia 9:16 completa em baixa resolução com o reenquadramento. Aguarde meu ok.
4. Só então o render final de todas as versões.

## Controle de qualidade (faça e me reporte)

- `ffprobe` de cada entrega: resolução, fps, duração, codec e bitrate conferidos.
- Montagem comparativa original x estilizado (1 frame por segundo) em `previews/comparativo.jpg`.
- Conferência da paleta por amostragem de pixels.
- Checagem de flicker (diferença entre frames consecutivos nas áreas paradas), serrilhado nas linhas e banding nos degradês.
- Checagem de zona segura no 9:16 e no 4:5.
- Lista do que ficou limitado e sugestões para uma v2.

## Entregáveis (pasta `output/`)

- `Missoes_Reestilizado.aep` + pasta coletada (File > Dependencies > Collect Files) e `build_project.jsx`.
- `missoes_master_4K_ProRes.mov`
- `missoes_youtube_4K.mp4` e `missoes_youtube_1080p.mp4`
- `missoes_reels_1080x1920.mp4` e `missoes_feed_1080x1350.mp4`
- `camadas/` com linhas, blocos e texturas em ProRes 4444 com alpha.
- `previews/comparativo.jpg` e um `LEIAME.md` explicando a estrutura do projeto e os controles do null "CONTROLES".
