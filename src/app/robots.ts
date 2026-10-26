import type { MetadataRoute } from "next";
import { store } from "@/config/store";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/*/checkout", "/*/cart", "/*/order/"] },
    sitemap: `${store.url}/sitemap.xml`,
  };
}
