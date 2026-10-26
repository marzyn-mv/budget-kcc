import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["winston"],
  devIndicators: false,
  experimental: {
    agentUpgrade: "security",
  },
};

export default nextConfig;
