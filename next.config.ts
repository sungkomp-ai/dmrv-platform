import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "0.0.0.0",
    "0.0.0.0:81",
    "http://0.0.0.0:81",
    "http://0.0.0.0",
  ],
};

export default nextConfig;
