import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    agentUpgrade: "security",
  },
};

export default nextConfig;
