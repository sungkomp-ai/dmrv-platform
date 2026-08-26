import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "0.0.0.0",
    "0.0.0.0:81",
    "http://0.0.0.0:81",
    "http://0.0.0.0",
    "21.0.8.14",
    "21.0.8.14:81",
    "http://21.0.8.14:81",
    "http://21.0.8.14",
    "21.0.5.182",
    "21.0.5.182:3000",
    "http://21.0.5.182:3000",
    "http://21.0.5.182",
    "localhost:3000",
    "http://localhost:3000",
    "space-z.ai",
  ],
};

export default nextConfig;
