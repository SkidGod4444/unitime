import type { MiddlewareHandler } from "hono";
import { Account, Client, Models } from "node-appwrite";
import { prisma } from "@unitime/db";
import type { UserRole } from "@unitime/db";
import type { AppEnv } from "@/types/app-env";

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT as string;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID as string;
const APPWRITE_JWT_COOKIE = "appwrite_jwt"; // make sure your frontend sets this

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const cookies = header.split(";").map((c) => c.trim());
  const target = cookies.find((c) => c.startsWith(name + "="));
  if (!target) return null;
  return decodeURIComponent(target.split("=", 2)[1]);
}

function extractJwt(
  cookieHeader: string | null,
  authHeader: string | null,
): string | null {
  // 1. Try Authorization: Bearer <jwt> header first (for React Native / mobile clients)
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  // 2. Fall back to cookie (for browser clients)
  return parseCookie(cookieHeader, APPWRITE_JWT_COOKIE);
}

async function getCurrentUserFromRequest(
  cookieHeader: string | null,
  authHeader: string | null,
): Promise<Models.User<Models.Preferences> | null> {
  const jwt = extractJwt(cookieHeader, authHeader);
  if (!jwt) return null;

  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setJWT(jwt);

  const account = new Account(client);

  try {
    const me = await account.get();
    return me;
  } catch {
    return null;
  }
}

// Hono middleware: attaches `user` to context
export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const cookieHeader = c.req.raw.headers.get("cookie");
  const authHeader = c.req.raw.headers.get("authorization");
  const user = await getCurrentUserFromRequest(cookieHeader, authHeader);

  // Attach user (or null) to context and continue.
  // Route-level guards should enforce authorization where required.
  c.set("user", user);
  await next();
};

// Role guard middleware: ensures the authenticated DB user has one of the required roles
export const requireRole = (
  ...roles: Array<UserRole>
): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    const user = c.get("user") as Models.User<Models.Preferences> | null;
    if (!user) {
      return c.json({ error: "You are not authorized!" }, 401);
    }
    try {
      const dbUser = await prisma.user.findUnique({ where: { id: user.$id } });
      if (!dbUser) {
        return c.json({ error: "Account not linked" }, 403);
      }
      if (!roles.includes(dbUser.role)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      // useful for downstream handlers
      c.set("requesterId", dbUser.id);
      c.set("requesterRole", dbUser.role);
      await next();
    } catch {
      return c.json({ error: "Authorization check failed" }, 500);
    }
  };
};
