import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

const BASE_URL = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/*", "/adsense-readiness"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
