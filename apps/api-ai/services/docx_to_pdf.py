"""Conversion DOCX → PDF (version texte) pour le pipeline d'ingestion ELARA.

N'utilise pas LibreOffice/Word, ce qui le rend portable dans un conteneur
léger : le texte est extrait via python-docx et mis en page via reportlab.
Suffisant pour un document envoyé ensuite au pipeline OCR / extraction IA.
"""

import sys
import argparse
from reportlab.pdfgen import canvas as pdf_canvas


def _iter_blocks(doc):
    """Renvoie les blocs de texte (paragraphes + tableaux) du document, dans l'ordre."""
    from docx.oxml.ns import qn
    from docx.text.paragraph import Paragraph
    from docx.table import Table

    for child in doc.element.body.iterchildren():
        tag = child.tag
        if tag == qn("w:p"):
            p = Paragraph(child, doc)
            if p.text.strip():
                yield p.text.strip()
        elif tag == qn("w:tbl"):
            t = Table(child, doc)
            for row in t.rows:
                cells = [cell.text.strip() for cell in row.cells]
                yield " | ".join(cells)


def docx_to_pdf(input_docx: str, output_pdf: str) -> None:
    from docx import Document
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm

    doc = Document(input_docx)

    # Récupération de tout le contenu (paragraphes + tableaux) dans l'ordre
    blocks: list[str] = list(_iter_blocks(doc))

    width, height = A4
    margin = 20 * mm
    max_width = width - (2 * margin)
    line_height = 5 * mm
    font_size = 11

    c = pdf_canvas.Canvas(output_pdf, pagesize=A4)
    c.setFont("Helvetica", font_size)

    y = height - margin
    for block in blocks:
        lines = _wrap_text(block, max_width, font_size, c)
        for line in lines:
            if y < margin:
                c.showPage()
                c.setFont("Helvetica", font_size)
                y = height - margin
            c.drawString(margin, y, line)
            y -= line_height

    c.save()
    print(f"DOCX '{input_docx}' → PDF '{output_pdf}' ({len(blocks)} blocs de texte)")


def _wrap_text(text: str, max_width: float, font_size: int, canvas: pdf_canvas.Canvas) -> list[str]:
    """Découpe un texte en lignes tenant dans max_width."""
    from reportlab.pdfbase.pdfmetrics import stringWidth

    lines: list[str] = []
    current = ""
    for word in text.split():
        candidate = f"{current} {word}".strip()
        if stringWidth(candidate, "Helvetica", font_size) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [""]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convertir un fichier DOCX en PDF (texte).")
    parser.add_argument("input_docx", help="Chemin du DOCX source")
    parser.add_argument("output_pdf", help="Chemin du PDF de sortie")
    args = parser.parse_args()

    try:
        docx_to_pdf(args.input_docx, args.output_pdf)
    except Exception as e:
        print(f"Erreur conversion DOCX → PDF : {e}", file=sys.stderr)
        sys.exit(1)