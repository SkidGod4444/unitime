import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";

// Keys that are safe to remove on an update. Keep this list tight.
// Do NOT include device id, auth/session, or user prefs here.
const SAFE_KEYS_TO_REMOVE = [
  // Ephemeral caches
  "MARKED_SESSIONS",
  // Background update flag set by our task (read/cleared by the hook too)
  "@unitime/bg_update_ready",
];

const MIGRATION_FLAG_PREFIX = "@unitime/migrated/";

export async function hasMigrated(updateId: string): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(MIGRATION_FLAG_PREFIX + updateId);
    return v === "true";
  } catch {
    return false;
  }
}

export async function markMigrated(updateId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(MIGRATION_FLAG_PREFIX + updateId, "true");
  } catch {}
}

/**
 * Run targeted, one-time storage cleanups for the current update id.
 * This avoids blanket wipes that log users out or break state.
 */
export async function runUpdateMigrationsOnce(): Promise<void> {
  const id = Updates.updateId ?? null;
  if (!id) return; // Nothing to do if not running an Update bundle

  if (await hasMigrated(id)) return;

  // Remove only explicitly safe, ephemeral keys
  await Promise.all(
    SAFE_KEYS_TO_REMOVE.map((k) =>
      AsyncStorage.removeItem(k).catch(() => undefined),
    ),
  );

  await markMigrated(id);
}

