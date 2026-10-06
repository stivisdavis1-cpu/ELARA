"""Genere apps/web/public/og-image.png — carte Open Graph 1200x630 d'Elara.

Usage, a la racine du depot :
    python generate_og_image.py

Requiert Pillow (disponible dans l'environnement de developpement).
Le rendu est volontairement sobre : fond vert nuit, tracé du logo EKG,
titre or — la meme palette que les pages marketing.
"""

import os

from PIL import Image, ImageDraw, ImageFont

LARGEUR, HAUTEUR = 1200, 630
OR = (217, 166, 74)
VERT = (111, 168, 144)
BLANC = (244, 241, 234)
GRIS = (168, 178, 172)

SORTIE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "apps", "web", "public", "og-image.png")

# Tracé EKG repris du logo SVG du site (viewBox 0 0 30 26).
TRACE_EKG = [(0, 13), (6, 13), (8.5, 3), (12, 23), (15.5, 8), (18.5, 18), (21, 13), (30, 13)]


def police(candidats, taille):
    for chemin in candidats:
        if os.path.exists(chemin):
            try:
                return ImageFont.truetype(chemin, taille)
            except OSError:
                continue
    return ImageFont.load_default()


def melange(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def main():
    image = Image.new("RGB", (LARGEUR, HAUTEUR))
    dessin = ImageDraw.Draw(image)

    # Degradé vertical du vert nuit au vert profond.
    haut, bas = (8, 26, 22), (15, 52, 43)
    for y in range(HAUTEUR):
        dessin.line([(0, y), (LARGEUR, y)], fill=melange(haut, bas, y / HAUTEUR))

    # Tracé du logo, dégradé or -> vert le long du parcours.
    echelle, origine = 9, (96, 64)
    trace = [(x * echelle + origine[0], y * echelle + origine[1]) for x, y in TRACE_EKG]
    for i in range(len(trace) - 1):
        t = i / (len(trace) - 2)
        dessin.line([trace[i], trace[i + 1]], fill=melange(OR, VERT, t), width=10)

    f_titre = police(
        ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/calibrib.ttf"],
        132,
    )
    f_phrase = police(
        ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/calibri.ttf"],
        44,
    )
    f_petit = police(
        ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/calibri.ttf"],
        30,
    )

    dessin.text((96, 320), "ELARA", font=f_titre, fill=OR)
    dessin.text((100, 478), "Le cerveau numérique des PME", font=f_phrase, fill=BLANC)
    dessin.text((100, 532), "et cabinets comptables d'Afrique", font=f_petit, fill=GRIS)
    dessin.text((100, 584), "www.elara.app", font=f_petit, fill=VERT)

    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    image.save(SORTIE, "PNG")
    print("OK ->", SORTIE)


if __name__ == "__main__":
    main()