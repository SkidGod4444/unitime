import { getDeviceId } from "@/lib/device.id";
import { getAuthToken } from "@/lib/auth.token";

export const apiOrigin =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";

export const withAuth = (init?: RequestInit): RequestInit => {
  const token = getAuthToken();
  const deviceId = getDeviceId();
  const headers = new Headers(init?.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (deviceId) headers.set("X-Device-ID", deviceId);
  return { ...init, headers };
};

export const apiFetch = (path: string, init?: RequestInit) => {
  const url = path.startsWith("http")
    ? path
    : `${apiOrigin}${path.startsWith("/") ? path : "/" + path}`;
  return fetch(url, withAuth(init));
};
