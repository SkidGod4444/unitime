import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaClient } from "../prisma/generated/client";

// Cache a single instance across hot reloads (dev)
declare const globalThis: {
  prismaGlobal?: PrismaClient;
} & typeof global;

function createPrisma(): PrismaClient {
  const datasourceUrl = process.env.DATABASE_URL;

  // Construct a base client; do not throw at import-time if env is missing
  const base = datasourceUrl
    ? new PrismaClient({ datasourceUrl })
    : new PrismaClient();

  // Extend with Accelerate only when a datasourceUrl is provided
  try {
    return datasourceUrl ? base.$extends(withAccelerate()) : base;
  } catch {
    // Defensive: if extension fails (e.g., build without env), fall back to base client
    return base;
  }
}

export const prisma: PrismaClient =
  globalThis.prismaGlobal ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

// Re-export types
export * from "../prisma/generated/client";
