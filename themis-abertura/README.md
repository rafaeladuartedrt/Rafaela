# Vinheta de abertura — 6º Prêmio Themis de Jornalismo (telão 350 × 200 cm)

Remotion (React + TypeScript) + ffmpeg. Loop perfeito de 30 s, master 3500 × 2000 px (1 px = 1 mm), 30 fps (parametrizável para 60).

## Ativos (extraídos dos PDFs originais)
| Arquivo | Origem | Observação |
|---|---|---|
| `logo_3500.png` | PDF do telão, operações vetoriais 21+ | rasterizado do vetor, sem chave de luminância; logo + seda recompõem o PDF (dif. máx. 1/255) |
| `seda_3500.png` | PDF do telão, operações 1–20 (Fm0/Fm1) | fundo original |
| `trofeu.png` | `/Im0` (1340×1256 + smask, pdfimages) sobre os vetores verdes da página | a silhueta verde é vetor no PDF; foto colada 1:1, sem reamostragem |
| `foto1..5_*.jpg` | pdfimages p1–p5 | gradação P&B / duotone |
| `recorte6..12.png` | pdfimages p6–p12 | imagens originais montadas como papel |

Cores amostradas do próprio PDF: cinza `#282828` (0.157 rg), verde `#B0D420` (0.69 0.831 0.125 rg).

## Comandos
```
python3 scripts/split_logo.py <logo.pdf> raw/logo   # separa logo e seda (vetor)
npm run assets                                       # gradação, recortes, grão, máscaras
bash scripts/stills.sh 1 out/checkpoint             # frames-chave
python3 scripts/check_assets.py <frame_troféu.png> <frame_logo.png>
```
