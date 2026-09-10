import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "lucide-react",
    "@supabase/supabase-js",
    "react-markdown",
    "remark-gfm",
    "xlsx",
    "@google/generative-ai",
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.target = ["web", "es2018"];
    }
    return config;
  },
};

export default nextConfig;