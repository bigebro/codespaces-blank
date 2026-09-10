import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "lucide-react",
    "@supabase/supabase-js",
    "react-markdown",
    "remark-gfm",
    "xlsx",
  ],
};

export default nextConfig;