"""Separa o PDF do telão em dois PDFs vetoriais: logo (só curvas brancas) e fundo de seda.
Estrutura do PDF original:
  op 0      BDC (camada)
  op 1-4    preenchimento cinza #282828 (0.157)
  op 5-8    q + clip da página
  op 9-20   formas Fm0/Fm1 (textura de seda)
  op 21-fim logo branco em curvas, fecha com EMC/Q
"""
import sys, pikepdf
src, outdir = sys.argv[1], sys.argv[2]
def build(fn, name):
    pdf = pikepdf.open(src); pg = pdf.pages[0]
    ops = list(pikepdf.parse_content_stream(pg))
    pg.obj['/Contents'] = pdf.make_stream(pikepdf.unparse_content_stream(fn(ops)))
    pdf.save(f'{outdir}/{name}')
Q = pikepdf.ContentStreamInstruction([], pikepdf.Operator('Q'))
EMC = pikepdf.ContentStreamInstruction([], pikepdf.Operator('EMC'))
build(lambda o: [o[0]] + o[5:9] + o[21:], 'logo_only.pdf')
build(lambda o: o[:21] + [Q, EMC], 'seda_only.pdf')
