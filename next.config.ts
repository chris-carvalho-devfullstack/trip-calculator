import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuração adicionada para permitir imagens com 100% de qualidade
  images: {
    qualities: [75, 100],
  },
};

export default nextConfig;