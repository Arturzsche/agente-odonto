import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // O repositório também tem o package-lock.json do backend (na raiz);
  // fixa a raiz deste projeto para o Next não inferir a pasta errada.
  turbopack: { root: __dirname },
};

export default nextConfig;
