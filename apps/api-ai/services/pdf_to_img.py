"""Rendu PDF → PNG (première page par défaut) pour le pipeline OCR Tesseract."""

import subprocess
import sys
import argparse


def pdf_to_img(pdf_path: str, img_path: str, page_index: int = 0) -> None:
    try:
        import pymupdf

        doc = pymupdf.open(pdf_path)
        if len(doc) > 0:
            page = doc[page_index if page_index < len(doc) else 0]
            # DPI élevé pour un OCR de qualité
            pix = page.get_pixmap(dpi=300)
            pix.save(img_path)
            print(f"PDF '{pdf_path}' → image '{img_path}' (page {page_index}, {pix.width}x{pix.height})")
        doc.close()
        return
    except ImportError:
        pass

    # Repli poppler-utils (pdftoppm) : disponible sans dépendance pip
    # dans l'image api-nest (poppler-utils embarqué dans le Dockerfile).
    try:
        page_arg = str(page_index + 1)
        subprocess.run(
            [
                "pdftoppm", "-png", "-r", "300",
                "-f", page_arg, "-l", page_arg, "-singlefile",
                pdf_path, img_path[:-4],
            ],
            check=True,
            capture_output=True,
        )
        print(f"PDF '{pdf_path}' → image '{img_path}' (page {page_index}, via pdftoppm)")
    except Exception as e:
        print(f"Erreur conversion PDF → image : {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convertir un PDF en image PNG pour OCR.")
    parser.add_argument("input_pdf", help="Chemin du PDF source")
    parser.add_argument("output_img", help="Chemin de l'image PNG de sortie")
    parser.add_argument("--page", type=int, default=0, help="Index de page à rendre (défaut: 0)")
    args = parser.parse_args()

    try:
        pdf_to_img(args.input_pdf, args.output_img, args.page)
    except Exception as e:
        print(f"Erreur conversion PDF → image : {e}", file=sys.stderr)
        sys.exit(1)