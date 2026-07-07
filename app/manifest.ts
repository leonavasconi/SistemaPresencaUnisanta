import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Unisanta Presença",
    short_name: "Presença",
    description: "Registro de presença por geolocalização e biometria facial",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#29166f",
    icons: [
      {
        src: "/logo-unisanta.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
