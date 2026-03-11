import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error';

// Shared key: background.updates.ts writes this, we read & clear it here.
export const BG_UPDATE_READY_KEY = '@unitime/bg_update_ready';

// Only check at most once every 30 minutes when foregrounding.
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Manages OTA update detection across two channels:
 *
 * 1. **AppState listener** — checks for an update every time the app comes
 *    back to the foreground (throttled to `CHECK_INTERVAL_MS`).
 *
 * 2. **Background task flag** — if the background update task already
 *    pre-downloaded an update it writes `BG_UPDATE_READY_KEY` to AsyncStorage.
 *    This hook reads that flag on the next foreground and jumps straight to
 *    `ready` state, skipping the network round-trip.
 *
 * The hook intentionally *never* auto-restarts the app. It exposes state that
 * a UI component (UpdateModal) uses to ask the user first.
 */
export function useAppUpdates() {
  const [status, setStatus] = useState<UpdateStatus>('idle');

  // Keep a ref so the AppState callback always sees the latest status without
  // needing to be re-created (avoids stale-closure issues).
  const statusRef = useRef<UpdateStatus>('idle');
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastCheckedRef = useRef<number>(0);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // ── Core check function ────────────────────────────────────────────────────

  const checkForUpdates = useCallback(async () => {
    // Never check in Expo Go / local dev builds — Updates are not supported.
    if (__DEV__) return;

    // Don't interrupt an ongoing download or a pending restart.
    if (
      statusRef.current === 'downloading' ||
      statusRef.current === 'ready'
    ) {
      return;
    }

    // Throttle: skip if we checked recently.
    const now = Date.now();
    if (now - lastCheckedRef.current < CHECK_INTERVAL_MS) return;
    lastCheckedRef.current = now;

    // ── 1. Fast path: background task already pre-downloaded an update ──────
    try {
      const bgReady = await AsyncStorage.getItem(BG_UPDATE_READY_KEY);
      if (bgReady === 'true') {
        await AsyncStorage.removeItem(BG_UPDATE_READY_KEY);
        setStatus('ready');
        return;
      }
    } catch {
      // Non-fatal — fall through to the network check.
    }

    // ── 2. Network check ────────────────────────────────────────────────────
    setStatus('checking');
    try {
      const result = await Updates.checkForUpdateAsync();
      setStatus(result.isAvailable ? 'available' : 'idle');
    } catch {
      // Swallow the error silently; the next foreground event will retry.
      setStatus('idle');
    }
  }, []); // no deps — all mutable state is accessed through refs

  // ── AppState listener ──────────────────────────────────────────────────────

  useEffect(() => {
    // Run once on mount (covers cold-start and first render).
    checkForUpdates();

    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        // Only fire when transitioning *into* the active foreground state.
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextState === 'active'
        ) {
          checkForUpdates();
        }
        appStateRef.current = nextState;
      },
    );

    return () => subscription.remove();
  }, [checkForUpdates]);

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Download the available update. Moves status through
   * `downloading` → `ready` (or `error` on failure).
   */
  const downloadUpdate = useCallback(async () => {
    setStatus('downloading');
    try {
      await Updates.fetchUpdateAsync();
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  /**
   * Apply the downloaded update by reloading the JS bundle.
   * Only call this after the user has explicitly confirmed.
   */
  const applyUpdate = useCallback(async () => {
    await Updates.reloadAsync();
  }, []);

  /**
   * Dismiss the update prompt and return to idle.
   * The update will be surfaced again on the next foreground check.
   */
  const dismiss = useCallback(() => {
    setStatus('idle');
    // Reset the throttle timer so the next foreground check isn't blocked.
    lastCheckedRef.current = 0;
  }, []);

  // ── Derived flags ──────────────────────────────────────────────────────────

  return {
    /** Raw status of the update lifecycle. */
    status,
    /** True when an update has been detected but not yet downloaded. */
    isUpdateAvailable: status === 'available',
    /** True when an update has been downloaded and is waiting to be applied. */
    isUpdateReady: status === 'ready',
    /** True while the update is being fetched from the server. */
    isDownloading: status === 'downloading',
    /** True while we are pinging the update server. */
    isChecking: status === 'checking',
    downloadUpdate,
    applyUpdate,
    dismiss,
  };
}
