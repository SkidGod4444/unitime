import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaClient } from "../prisma/generated/client.js";

const prismaClientSingleton = () => {
  const accelerateUrl = process.env.DATABASE_URL;
  if (!accelerateUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  return new PrismaClient({
    accelerateUrl,
  }).$extends(withAccelerate());
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
export * from "@prisma/client";
