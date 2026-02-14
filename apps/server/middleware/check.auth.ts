import { Client, Account, Models } from "node-appwrite";
import type { MiddlewareHandler } from "hono";

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

async function getCurrentUserFromRequest(
  cookieHeader: string | null,
): Promise<Models.User<Models.Preferences> | null> {
  const jwt = parseCookie(cookieHeader, APPWRITE_JWT_COOKIE);
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
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const cookieHeader = c.req.raw.headers.get("cookie");
  const user = await getCurrentUserFromRequest(cookieHeader);

  // Attach user (or null) to context
  c.set("user", user);

  // If you want to enforce auth globally, you can 401 here:
  if (!user) {
    return c.json({ error: "You are not authorized!" }, 401);
  }

  await next();
};
