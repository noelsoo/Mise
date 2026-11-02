import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mise",
    short_name: "Mise",
    description: "Recipes, macros per serving, a weekly plan and one grocery list.",
    start_url: "/recipes",
    scope: "/",
    display: "standalone",
    background_color: "#f6f4ef",
    theme_color: "#3f6f4e",
    lang: "en-GB",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Grocery list", url: "/groceries" },
      { name: "This week's plan", url: "/plan" },
      { name: "Add a recipe", url: "/add" },
    ],
  };
}
