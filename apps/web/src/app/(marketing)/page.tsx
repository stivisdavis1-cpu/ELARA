import type { Metadata } from "next";
import { siteUrl } from "@/lib/seo";
import LandingClient from "./landing.client";

const SITE = siteUrl();

export const metadata: Metadata = {
  title: "Elara — L'assistant financier des PME d'Afrique",
  description:
    "Elara transforme les documents et messages de votre entreprise en tableau de bord financier : scanner, facturation, Business Health Score et assistant IA. Freemium dès 0 F.",
  alternates: { canonical: `${SITE}/` },
  openGraph: {
    type: "website",
    locale: "fr_CM",
    url: `${SITE}/`,
    siteName: "Elara",
    title: "Elara — L'assistant financier des PME d'Afrique",
    description:
      "Scanner, facturation, indicateurs financiers et assistant IA : le cerveau numérique des PME et cabinets comptables d'Afrique.",
    images: [
      { url: `${SITE}/og-image.png`, width: 1200, height: 630, alt: "Elara — le cerveau numérique des PME" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elara — L'assistant financier des PME d'Afrique",
    description:
      "Documents et messages transformés en tableau de bord financier. Rejoignez la liste d'attente.",
    images: [`${SITE}/og-image.png`],
  },
};

export default function PageAccueil() {
  return <LandingClient />;
}