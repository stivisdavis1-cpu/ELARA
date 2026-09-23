"""Recadrage (crop) d'une zone d'une image, préalable à l'OCR zonal."""

import sys
import argparse


def crop_image(src: str, dst: str, x: int, y: int, width: int, height: int) -> None:
    from PIL import Image

    with Image.open(src) as img:
        img = img.convert("RGB")
        box = (x, y, x + width, y + height)
        cropped = img.crop(box)
        cropped.save(dst)
        print(f"Image recadrée {src} → {dst} ({width}x{height}@({x},{y}))")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Recadrer une zone d'une image (OCR zonal).")
    parser.add_argument("input_img", help="Chemin de l'image source")
    parser.add_argument("output_img", help="Chemin de l'image recadrée")
    parser.add_argument("x", type=int, help="Abscisse de la zone")
    parser.add_argument("y", type=int, help="Ordonnée de la zone")
    parser.add_argument("width", type=int, help="Largeur de la zone")
    parser.add_argument("height", type=int, help="Hauteur de la zone")
    args = parser.parse_args()

    try:
        crop_image(args.input_img, args.output_img, args.x, args.y, args.width, args.height)
    except Exception as e:
        print(f"Erreur recadrage : {e}", file=sys.stderr)
        sys.exit(1)