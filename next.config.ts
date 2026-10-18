import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["winston"],
  devIndicators: false,
};

export default nextConfig;
