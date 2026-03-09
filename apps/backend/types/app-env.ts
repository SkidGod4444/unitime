import type { Models } from "node-appwrite";
import type { UserRole } from "@unitime/db";

export type AppEnv = {
  Variables: {
    user: Models.User<Models.Preferences> | null;
    requesterId?: string;
    requesterRole?: UserRole;
  };
};
