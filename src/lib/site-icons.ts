import type { Metadata } from "next";

/** The "E" brand mark: favicon for browser tabs, PNG icons for home screens (shared by the shop and the admin). */
export const SITE_ICONS: Metadata["icons"] = {
  icon: [
    { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
    { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
    { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
  ],
  apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
};
