import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oskars Ekonomi",
    short_name: "Ekonomi",
    description: "Din personliga ekonomiapp för budget, fria pengar och sparmål.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#081018",
    theme_color: "#0c131b",
    categories: ["finance", "productivity"],
    lang: "sv-SE",
    icons: [
      {
        src: "/pwa-icon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
    screenshots: [
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        form_factor: "narrow",
      },
      {
        src: "/pwa-icon.png",
        sizes: "1024x1024",
        type: "image/png",
        form_factor: "wide",
      },
    ],
  };
}
