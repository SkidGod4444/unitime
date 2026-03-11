import type { AppEnv } from "@/types/app-env";
import type { UserRole } from "@unitime/db";
import { prisma } from "@unitime/db";
import type { MiddlewareHandler } from "hono";
import { Account, Client, Models } from "node-appwrite";

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
    const jwt = authHeader.slice(7).trim();
    console.log(`[Auth] Extracted JWT from header (len: ${jwt.length})`);
    return jwt;
  }
  // 2. Fall back to cookie (for browser clients)
  const cookieJwt = parseCookie(cookieHeader, APPWRITE_JWT_COOKIE);
  if (cookieJwt)
    console.log(`[Auth] Extracted JWT from cookie (len: ${cookieJwt.length})`);
  return cookieJwt;
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
    console.log(`[Auth] Appwrite user found: ${me.$id} (${me.email})`);
    return me;
  } catch (err) {
    console.error(
      `[Auth] Appwrite account.get() failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
    return null;
  }
}

// Hono middleware: attaches `user` to context
export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const cookieHeader = c.req.raw.headers.get("cookie");
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    console.log(`[Auth] Incoming request: ${c.req.method} ${c.req.path}`);
    if (!authHeader && !cookieHeader)
      console.log("[Auth] No auth headers present");
  }

  const user = await getCurrentUserFromRequest(
    cookieHeader,
    authHeader || null,
  );

  // Attach Appwrite user (or null)
  c.set("user", user);

  // Best-effort: resolve DB user and attach requesterId/requesterRole
  if (user) {
    try {
      let dbUser = await prisma.user.findUnique({ where: { id: user.$id } });
      if (!dbUser && user.email) {
        dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      }
      if (dbUser) {
        c.set("requesterId", dbUser.id);
        c.set("requesterRole", dbUser.role);
      }
    } catch (e) {
      // Non-fatal: proceed without requesterId/Role
      console.warn("authMiddleware: DB user resolve failed", e);
    }
  }

  await next();
};

// Auth guard: ensures the user is authenticated and exists in the database
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = c.get("user") as Models.User<Models.Preferences> | null;
  if (!user) {
    return c.json({ error: "You are not authorized!" }, 401);
  }

  // Optimization: Check if authMiddleware already resolved the DB user
  const existingId = c.get("requesterId");
  if (existingId) {
    return await next();
  }

  try {
    let dbUser = await prisma.user.findUnique({ where: { id: user.$id } });
    if (!dbUser && user.email) {
      dbUser = await prisma.user.findUnique({ where: { email: user.email } });
    }
    if (!dbUser) {
      return c.json({ error: "Account not linked" }, 403);
    }
    c.set("requesterId", dbUser.id);
    c.set("requesterRole", dbUser.role);
    await next();
  } catch {
    return c.json({ error: "Authentication check failed" }, 500);
  }
};

// Role guard middleware: ensures the authenticated DB user has one of the required roles OR is an ADMIN
export const requireRole = (
  ...roles: Array<UserRole>
): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    const user = c.get("user") as Models.User<Models.Preferences> | null;
    if (!user) {
      return c.json({ error: "You are not authorized!" }, 401);
    }

    // Optimization: Check if context already has role/id
    const existingId = c.get("requesterId");
    const existingRole = c.get("requesterRole");

    if (existingId && existingRole) {
      if (existingRole === "ADMIN" || roles.includes(existingRole)) {
        return await next();
      } else {
        return c.json({ error: "Forbidden" }, 403);
      }
    }

    try {
      let dbUser = await prisma.user.findUnique({ where: { id: user.$id } });
      if (!dbUser && user.email) {
        dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      }
      if (!dbUser) {
        return c.json({ error: "Account not linked" }, 403);
      }

      // Implicitly allow ADMIN role for all guarded routes
      if (dbUser.role === "ADMIN" || roles.includes(dbUser.role)) {
        c.set("requesterId", dbUser.id);
        c.set("requesterRole", dbUser.role);
        await next();
      } else {
        return c.json({ error: "Forbidden" }, 403);
      }
    } catch {
      return c.json({ error: "Authorization check failed" }, 500);
    }
  };
};
