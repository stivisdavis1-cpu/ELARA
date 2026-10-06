import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Espace application, API, liens de parrainage (pages minces) et
        // fichiers techniques.
        disallow: [
          "/api/",
          "/r/",
          "/dashboard",
          "/documents",
          "/ged",
          "/scanner",
          "/assistant",
          "/cfo",
          "/report",
          "/settings",
          "/admin",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}