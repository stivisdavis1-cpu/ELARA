import type { Metadata } from "next";
import "./globals.css";
import NextAuthProvider from "@/components/NextAuthProvider";

export const metadata: Metadata = {
  title: "Elara — Design System 2.0",
  description: "Plateforme Avancé et Gestion d'entreprise",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  );
}

