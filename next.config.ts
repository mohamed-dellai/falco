import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
