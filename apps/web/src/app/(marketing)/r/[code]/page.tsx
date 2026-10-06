import type { Metadata } from "next";
import { siteUrl } from "@/lib/seo";
import LienParrainageClient from "./lien.client";

// Les positions changent à chaque inscription : la page ne doit jamais être
// figée au moment du build.
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const propre = code.trim().toUpperCase();
  return {
    title: `Position ${propre} — file d'attente Elara`,
    description:
      "Position réelle dans la file d'attente Elara liée à ce code de parrainage.",
    // Page mince générée par code : pas d'indexation.
    robots: { index: false, follow: false },
    alternates: { canonical: `${siteUrl()}/r/${encodeURIComponent(propre)}` },
  };
}

export default async function PageLienParrainage({ params }: Props) {
  const { code } = await params;
  return <LienParrainageClient code={code} />;
}