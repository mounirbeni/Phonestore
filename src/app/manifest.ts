import type { MetadataRoute } from "next";
import { store } from "@/config/store";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: store.name,
    short_name: store.name,
    description: "Smartphones, tablettes, audio et accessoires — paiement à la livraison.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d0d10",
    theme_color: "#0d0d10",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Panier", url: "/fr/cart" },
      { name: "Promotions", url: "/fr/shop?deals=1" },
    ],
  };
}
