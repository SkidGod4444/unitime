import { getDeviceId } from "@/lib/device.id";
import { getAuthToken } from "@/lib/auth.token";

export const apiOrigin =
  process.env.EXPO_PUBLIC_API_URL || "https://unitime-backend.vercel.app/v1";

export let isAppOnMaintenance = false;

export const setAppOnMaintenance = (status: boolean) => {
  isAppOnMaintenance = status;
};

export const withAuth = (init?: RequestInit): RequestInit => {
  const token = getAuthToken();
  const deviceId = getDeviceId();
  const headers = new Headers(init?.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (deviceId) headers.set("X-Device-ID", deviceId);
  return { ...init, headers };
};

export const apiFetch = (path: string, init?: RequestInit) => {
  if (isAppOnMaintenance) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          success: false,
          error: "We are under maintenance. Please try again later.",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
  }

  const url = path.startsWith("http")
    ? path
    : `${apiOrigin}${path.startsWith("/") ? path : "/" + path}`;
  return fetch(url, withAuth(init));
};
