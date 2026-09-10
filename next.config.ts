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
  compiler: {
    // Хуучин Safari хөтчүүдийн танихгүй RegExp, Lookbehind-ийг хуучин хэлбэр рүү хөрвүүлнэ
    removeConsole: false,
  },
};

export default nextConfig;