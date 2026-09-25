import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Falco Services",
    short_name: "Falco",
    description: "Saudi Hajj and Umrah ground-services website.",
    start_url: "/en",
    display: "standalone",
    background_color: "#fbf9f5",
    theme_color: "#0e4d8c",
    icons: [
      {
        src: "/falco-logo.png",
        sizes: "640x640",
        type: "image/png",
      },
    ],
  };
}
