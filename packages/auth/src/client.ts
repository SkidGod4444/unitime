import { expoClient } from "@better-auth/expo/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/client";
import {
    adminClient,
    emailOTPClient,
    lastLoginMethodClient,
    organizationClient,
} from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";

// Get the base URL from environment or use localhost as fallback for development
// For physical devices/emulators, you'll need to set EXPO_PUBLIC_API_URL to your machine's IP
// Example: http://192.168.1.5:3001/v1
const getBaseURL = (): string => {
  // Use environment variable if provided
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Fallback for local development (works for web/localhost testing)
  return "http://localhost:3001/v1";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [
    expoClient({
      scheme: "unitime",
      storagePrefix: "unitime",
      storage: SecureStore,
    }),
    passkeyClient(),
    adminClient(),
    organizationClient(),
    lastLoginMethodClient(),
    emailOTPClient(),
  ],
});
