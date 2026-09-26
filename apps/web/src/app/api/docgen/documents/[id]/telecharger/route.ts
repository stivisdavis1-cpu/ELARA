import { NextResponse } from "next/server";
import { gedBinaryRoute } from "@/lib/ged-binary";

/**
 * Téléchargement du .docx généré.
 *
 * Pourquoi une route et pas une Server Action : l'action ne peut pas créer de
 * Blob ni cliquer un lien, ça n'existe pas côté serveur. La route relaie les
 * octets de l'API Nest avec la session de l'utilisateur et renvoie un
 * Content-Disposition, donc un simple <a download> suffit côté navigateur.
 */
export async function GET(_requete: Request, contexte: { params: Promise<{ id: string }> }) {
  const { id } = await contexte.params;

  try {
    const { octets, nom } = await gedBinaryRoute(`/v1/docgen/documents/${encodeURIComponent(id)}/telecharger`, `document-${id}.docx`);
    return new NextResponse(octets, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Length": String(octets.byteLength),
        "Content-Disposition": `attachment; filename="${nom.replace(/["\\]/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Téléchargement impossible." },
      { status: 502 },
    );
  }
}
