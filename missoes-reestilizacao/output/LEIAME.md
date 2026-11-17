# Missões da Justiça e Cidadania, 400 anos: "Cruz e Ruínas de São Miguel" reestilizado

Entrega dos dois vídeos finais (horizontal 16:9 e vertical 9:16), produzidos a partir de `input/original.mp4`
(1920x1080, 24 fps, 240 frames). Cada frame de saída corresponde ao frame de mesmo índice no original.

## Arquivos

| Arquivo | Uso | Formato |
|---|---|---|
| `missoes_youtube_4K.mp4` | YouTube | H.264 High, 3840x2160, 24 fps, VBR 2 passes ~50 Mbps, yuv420p, Rec.709, AAC 48 kHz |
| `missoes_youtube_1080p.mp4` | Upload rápido e uso interno | H.264 High, 1920x1080, 24 fps, ~14 Mbps, AAC 48 kHz |
| `missoes_reels_1080x1920.mp4` | Instagram Reels / Stories | H.264 High, 1080x1920, 24 fps, ~18 Mbps, AAC 48 kHz, abaixo de 100 MB |
| `missoes_master_4K_ProRes.mov` | Arquivo e base para novas versões | ProRes 4444, 3840x2160, 24 fps, PCM 48 kHz. **Não está no repositório** (cerca de 1,3 GB, acima do limite do GitHub); é gerado por `scripts/` |
| `camadas/*.svg` | Traçados vetoriais | Linhas da cruz e da igreja extraídas do PDF oficial de logos |

O áudio é o do vídeo original, sem alteração de conteúdo.

## Como a peça foi construída

- **Traço**: caminhos vetoriais originais do logo (`input/logos_do_evento.pdf`), renderizados nativamente na resolução final.
  A igreja é presa à fachada por tracking de homografia (frames 40 a 212). A cruz é encaixada quadro a quadro
  (posição e escala, sempre a prumo), porque a cruz do vídeo original muda de forma ao longo do plano.
- **Blocos de cor**: painel mostarda atrás da cruz e bloco coral atrás da fachada, com borda de papel rasgado.
- **Foto**: pedra em P&B quente de alto contraste, céu do branco ao mostarda, vegetação em verde oliva.
- **Janela central**: recorte retangular limpo, medido pelas bordas que o raio de sol do original não atinge.
- **Paleta**: apenas as seis cores do logo (coral, mostarda, verde oliva, laranja queimado, marrom, branco) e seus tons.
- **Vertical 9:16**: o movimento de câmera original não muda. O recorte acompanha cruz, fachada e janela; a
  estrutura principal fica inteira e céu, gramado, pedra e blocos são prolongados com textura real para cima e para baixo.

## Estrutura do projeto

- `input/`: vídeo original, referências e PDF de logos.
- `scripts/a1_masks.py`: mattes (céu, vegetação, cruz, fachada, janela).
- `scripts/a2_track.py`: tracking da fachada. `a3_pictos.py`: traçados do logo. `a4_fit_cruz.py`: encaixe da cruz. `a5_janela.py`: retângulo da janela.
- `scripts/render.py`: compositor (camadas equivalentes a foto estilizada, blocos de cor, traço marrom, linhas brancas, texturas e grade final).
- `scripts/vertical.py`: pista de reenquadramento do 9:16.
- `scripts/qc.py`: controle de qualidade.
- `previews/`: stills de estilo, testes de tracking e do vertical, `comparativo.jpg`.

## Controles (dicionário `CTRL` em `scripts/render.py`)

| Controle | Efeito | Padrão |
|---|---|---|
| `espessura` | Multiplica a espessura de todas as linhas (base: 26 px no 4K) | 1.0 |
| `boil` | Intensidade do traço vivo, atualizado a cada 2 frames | 1.0 |
| `opac_blocos` | Opacidade dos blocos mostarda e coral | 1.0 |
| `grao` | Quantidade de grão fino | 1.0 |

## O que não foi produzido

- Projeto After Effects (`Missoes_Reestilizado.aep`) e `build_project.jsx`: o trabalho foi finalizado por compositor próprio, sem After Effects.
- Instagram Feed 4:5 e camadas em ProRes 4444 com alpha.
- Upscale com Real-ESRGAN: a foto foi ampliada com Lanczos; linhas e blocos são vetoriais em 4K.
