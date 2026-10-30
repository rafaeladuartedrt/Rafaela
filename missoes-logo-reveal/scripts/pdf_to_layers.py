"""Converte o PDF vetorial original do logo em camadas SVG, sem redesenhar nada.

Lê o content stream do PDF (Illustrator) operador por operador e escreve cada
caminho com as mesmas coordenadas, apenas trocando o eixo y (PDF: para cima;
SVG: para baixo). Todas as matrizes `cm` do arquivo são translações puras, então
as coordenadas são aplicadas de forma exata e as espessuras de traço ficam
intactas. Recortes (W/W*) viram clipPaths. Cores: valores DeviceRGB do PDF x 255.

Não usamos o SVG do pdftocairo porque ele reescala o conteúdo em 0,999563.

Uso: python3 pdf_to_layers.py <logo.pdf> <saida.ts>
"""
import json
import sys

import pypdf
from pypdf.generic import ContentStream

pdf, out = sys.argv[1], sys.argv[2]
reader = pypdf.PdfReader(pdf)
page = reader.pages[0]
PW, PH = float(page.mediabox.width), float(page.mediabox.height)
ops = ContentStream(page.get_contents(), reader).operations


def fmt(v):
    s = f"{round(v, 5):.5f}".rstrip("0").rstrip(".")
    return "0" if s == "-0" else s


def hexcolor(vals):
    return "#" + "".join(f"{int(float(v) * 255 + 0.5):02X}" for v in vals)


class State:
    def __init__(self):
        self.tx = self.ty = 0.0
        self.fill = "#000000"
        self.stroke = "#000000"
        self.w = 1.0
        self.cap = 0
        self.join = 0
        self.miter = 10.0
        self.dash = None
        self.clips = []  # ids de clipPath ativos

    def copy(self):
        s = State()
        s.__dict__ = {**self.__dict__, "clips": list(self.clips)}
        return s


st = State()
stack = []
path = []  # comandos SVG
pts = []
clip_pending = None
defs = []
items = []
clip_n = 0


def P(x, y):
    X, Y = float(x) + st.tx, PH - (float(y) + st.ty)
    pts.append((X, Y))
    return f"{fmt(X)} {fmt(Y)}"


def is_page_rect(d_pts):
    xs = [p[0] for p in d_pts]
    ys = [p[1] for p in d_pts]
    return len(d_pts) == 4 and min(xs) <= 0.01 and min(ys) <= 0.01 and max(xs) >= PW - 0.01 and max(ys) >= PH - 0.01


def emit(kind, rule):
    d = " ".join(path)
    attrs = []
    if kind in ("f", "B"):
        attrs.append(f'fill="{st.fill}" fill-rule="{rule}"')
    else:
        attrs.append('fill="none"')
    if kind in ("S", "B"):
        caps = ["butt", "round", "square"]
        joins = ["miter", "round", "bevel"]
        attrs.append(
            f'stroke="{st.stroke}" stroke-width="{fmt(st.w)}" stroke-linecap="{caps[st.cap]}" '
            f'stroke-linejoin="{joins[st.join]}" stroke-miterlimit="{fmt(st.miter)}"'
        )
        if st.dash:
            attrs.append(f'stroke-dasharray="{st.dash}"')
    el = f'<path {" ".join(attrs)} d="{d}"/>'
    for cid in reversed(st.clips):
        el = f'<g clip-path="url(#{cid})">{el}</g>'
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    items.append({
        "kind": "stroke" if kind == "S" else "fill",
        "color": st.stroke if kind == "S" else st.fill,
        "clips": list(st.clips),
        "bbox": [min(xs), min(ys), max(xs), max(ys)],
        "svg": el,
    })


for operands, op in ops:
    op = op.decode() if isinstance(op, bytes) else op
    a = [float(x) if isinstance(x, (int, float, pypdf.generic.FloatObject, pypdf.generic.NumberObject)) else x for x in operands]
    if op == "q":
        stack.append(st.copy())
    elif op == "Q":
        st = stack.pop()
    elif op == "cm":
        m = [float(x) for x in operands]
        assert m[:4] == [1, 0, 0, 1], f"cm não é translação pura: {m}"
        st.tx += m[4]
        st.ty += m[5]
    elif op == "m":
        path.append("M " + P(*a))
        cur = a[:2]
    elif op == "l":
        path.append("L " + P(*a))
        cur = a[:2]
    elif op == "c":
        path.append("C " + P(a[0], a[1]) + " " + P(a[2], a[3]) + " " + P(a[4], a[5]))
        cur = a[4:6]
    elif op == "v":  # 1º ponto de controle = ponto corrente
        path.append("C " + P(cur[0], cur[1]) + " " + P(a[0], a[1]) + " " + P(a[2], a[3]))
        cur = a[2:4]
    elif op == "y":  # 2º ponto de controle = ponto final
        path.append("C " + P(a[0], a[1]) + " " + P(a[2], a[3]) + " " + P(a[2], a[3]))
        cur = a[2:4]
    elif op == "h":
        path.append("Z")
    elif op == "re":
        x, y, w, h = a
        path.append(f"M {P(x, y)} L {P(x + w, y)} L {P(x + w, y + h)} L {P(x, y + h)} Z")
    elif op in ("W", "W*"):
        clip_pending = "evenodd" if op == "W*" else "nonzero"
    elif op in ("f", "F", "f*", "S", "n", "B", "B*", "s", "b", "b*"):
        if op in ("s", "b", "b*"):
            path.append("Z")
        if op in ("f", "F", "f*"):
            emit("f", "evenodd" if op == "f*" else "nonzero")
        elif op == "S" or op == "s":
            emit("S", "nonzero")
        elif op in ("B", "B*", "b", "b*"):
            emit("B", "evenodd" if "*" in op else "nonzero")
        if clip_pending:
            if not is_page_rect(pts):  # o recorte da página inteira não altera o logo
                cid = f"pdfclip-{clip_n}"
                clip_n += 1
                defs.append(f'<clipPath id="{cid}" clipPathUnits="userSpaceOnUse"><path clip-rule="{clip_pending}" d="{" ".join(path)}"/></clipPath>')
                st.clips.append(cid)
            clip_pending = None
        path, pts = [], []
    elif op == "rg":
        st.fill = hexcolor(a)
    elif op == "RG":
        st.stroke = hexcolor(a)
    elif op == "w":
        st.w = a[0]
    elif op == "J":
        st.cap = int(a[0])
    elif op == "j":
        st.join = int(a[0])
    elif op == "M":
        st.miter = a[0]
    elif op == "d":
        arr = [float(x) for x in operands[0]]
        st.dash = " ".join(fmt(x) for x in arr) if arr else None
    elif op in ("gs", "BDC", "EMC", "BMC"):
        pass
    else:
        raise NotImplementedError(op)

# ---- camadas (ordem de pintura preservada)
BLOCKS = {"#E76847": "blockCoral", "#9A9F30": "blockOlive", "#E7A22B": "blockMustard", "#BB5108": "blockRust"}
seen = []
for it in items:
    x0, y0, x1, y1 = it["bbox"]
    cy = (y0 + y1) / 2
    if it["color"] == "#592400":
        it["layer"] = "line1" if cy < 260 else "line2" if cy < 515 else "line3"
    elif it["color"] == "#4C270F":
        it["layer"] = "line4"
    elif it["color"] in BLOCKS and it["kind"] == "fill" and not it["clips"]:
        it["layer"] = BLOCKS[it["color"]]
        seen.append(it["layer"])
    elif it["color"] == "#FFFFFF":
        last = seen[-1]
        if last == "blockOlive":
            it["layer"] = "ill400"
        elif last == "blockRust":
            it["layer"] = "illPattern"
        elif it["clips"] and (x0 + x1) / 2 > 610 and cy < 575:
            it["layer"] = "illCross"
        elif it["clips"]:
            it["layer"] = "illChurch"
        else:
            it["layer"] = "illAnos"
    else:
        raise ValueError(it)
for n, it in enumerate(items, start=1):
    it["i"] = n
    del it["clips"]

from collections import Counter
print(len(items), "elementos;", dict(Counter(i["layer"] for i in items)))
data = {"viewBox": f"0 0 {fmt(PW)} {fmt(PH)}", "defs": "<defs>" + "".join(defs) + "</defs>", "items": items}
with open(out, "w") as f:
    f.write("// Gerado por scripts/pdf_to_layers.py a partir do PDF original. Não editar.\n")
    f.write("export const LOGO = " + json.dumps(data, ensure_ascii=False) + " as const;\n")
