import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@unitime/db", "node-appwrite"],
};

export default nextConfig;
