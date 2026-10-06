import type { Metadata } from "next";
import { siteUrl } from "@/lib/seo";
import PrelancementClient from "./prelancement.client";

const SITE = siteUrl();

export const metadata: Metadata = {
  title: "Elara — Liste d'attente & parrainage",
  description:
    "Elara ouvre progressivement ses accès au Cameroun. Inscrivez-vous à la liste d'attente, partagez votre lien et avancez dans la file à chaque invitation.",
  alternates: { canonical: `${SITE}/prelancement` },
  openGraph: {
    type: "website",
    locale: "fr_CM",
    url: `${SITE}/prelancement`,
    siteName: "Elara",
    title: "Elara — Liste d'attente & parrainage",
    description:
      "Rejoignez la liste d'attente d'Elara et faites avancer votre place en invitant d'autres entrepreneurs.",
    images: [
      { url: `${SITE}/og-image.png`, width: 1200, height: 630, alt: "Elara — liste d'attente" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elara — Liste d'attente & parrainage",
    description: "Inscrivez-vous, partagez votre lien, avancez dans la file.",
    images: [`${SITE}/og-image.png`],
  },
};

export default function PagePrelancement() {
  return <PrelancementClient />;
}