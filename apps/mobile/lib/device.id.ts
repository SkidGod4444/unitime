import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";

const DEVICE_ID_KEY = "@unitime/device_id";

let _cachedDeviceId: string | null = null;

/**
 * Pure-JS UUID v4 generator — no native module required.
 * Entropy comes from Math.random() which is sufficient for a device
 * fingerprint (we just need uniqueness, not cryptographic security).
 */
function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Derives a best-effort stable hardware fingerprint from the OS-provided
 * installation / Android ID. Returns null when not available (iOS simulator,
 * web, etc.) so we can fall through to our own generated ID.
 */
async function getHardwareId(): Promise<string | null> {
  try {
    // Android: Settings.Secure.ANDROID_ID — stable across app installs
    // until factory reset or re-flash.
    const androidId = Application.getAndroidId?.();
    if (androidId) return `android:${androidId}`;

    // iOS: identifierForVendor — stable until the user deletes ALL apps
    // from this vendor.
    const iosId = await Application.getIosIdForVendorAsync?.();
    if (iosId) return `ios:${iosId}`;
  } catch {
    // Silently ignore — we have a UUID fallback.
  }
  return null;
}

/**
 * Returns the stable device ID for this installation.
 *
 * Resolution order:
 *  1. In-memory cache (fast path after first call)
 *  2. OS hardware ID (Android ID / iOS IFV)
 *  3. Previously stored UUID in AsyncStorage
 *  4. Freshly generated UUID (first cold-start ever)
 *
 * Always call `initDeviceId()` once at app startup so that
 * `getDeviceId()` never has to do async work on the hot path.
 */
export async function initDeviceId(): Promise<string> {
  if (_cachedDeviceId) return _cachedDeviceId;

  // 1. Try hardware ID first — most stable option.
  const hardwareId = await getHardwareId();
  if (hardwareId) {
    _cachedDeviceId = hardwareId;
    // Also persist so it's always available via AsyncStorage reads elsewhere.
    await AsyncStorage.setItem(DEVICE_ID_KEY, hardwareId).catch(() => {});
    return _cachedDeviceId;
  }

  // 2. Try previously stored UUID.
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) {
      _cachedDeviceId = stored;
      return _cachedDeviceId;
    }
  } catch {
    // AsyncStorage read failed — fall through to generate a fresh UUID.
  }

  // 3. Generate a new UUID and persist it.
  const fresh = uuidv4();
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, fresh);
  } catch {
    // Non-fatal — the UUID still lives in memory for this session.
  }
  _cachedDeviceId = fresh;
  return _cachedDeviceId;
}

/**
 * Synchronous getter — returns the cached device ID.
 * Returns `null` if `initDeviceId()` hasn't resolved yet.
 * Prefer calling `initDeviceId()` at startup so this is never null on the hot path.
 */
export function getDeviceId(): string | null {
  return _cachedDeviceId;
}
