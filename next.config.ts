import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Modelos do face-api.js (~7 MB) não mudam entre deploys: o navegador
        // guarda a cópia e não baixa de novo a cada abertura do check-in.
        source: "/models/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
