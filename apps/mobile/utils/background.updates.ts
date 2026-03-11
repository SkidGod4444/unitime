import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";

// ─── Shared Constants ─────────────────────────────────────────────────────────

/**
 * AsyncStorage key written by the background task when an update has been
 * pre-downloaded. The `useAppUpdates` hook reads and clears this flag the next
 * time the app comes to the foreground, skipping the network round-trip.
 */
export const BG_UPDATE_READY_KEY = "@unitime/bg_update_ready";

/** Unique name for the background task registered with the OS. */
export const BACKGROUND_UPDATE_TASK = "unitime-bg-update-check";

// ─── Task Definition ──────────────────────────────────────────────────────────
//
// IMPORTANT: `TaskManager.defineTask` MUST be called at the module's top level
// (i.e. not inside a function, conditional, or after an `await`). The native
// layer registers task handlers at import time; if the definition runs too late
// the OS cannot wake the app to execute the task.
//
// We use a synchronous `require()` inside a try-catch so that:
//   a) TypeScript does not error on a missing package declaration, and
//   b) The app doesn't crash if `expo-task-manager` hasn't been installed yet.
//
// Once `npx expo install expo-task-manager expo-background-task` is run and
// `'expo-background-task'` is added to the plugins in app.config.js, this
// block executes normally and the task is registered with the native layer.

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const TaskManager = require("expo-task-manager");

  TaskManager.defineTask(BACKGROUND_UPDATE_TASK, async () => {
    try {
      // expo-updates is unavailable in dev/Expo Go builds.
      if (__DEV__) return;

      const result = await Updates.checkForUpdateAsync();

      if (result.isAvailable) {
        // Pre-download the bundle while the user isn't actively using the app.
        await Updates.fetchUpdateAsync();

        // ⚠️  We intentionally do NOT call Updates.reloadAsync() here.
        //
        // Reloading inside a background task would forcefully restart the app
        // without any user consent — this is jarring, can cause data loss if
        // the user was mid-action, and violates both Apple and Google UX
        // guidelines. Instead we set a flag so the foreground UpdateModal can
        // ask the user to restart at their convenience.
        await AsyncStorage.setItem(BG_UPDATE_READY_KEY, "true");
      }
    } catch {
      // Silently swallow errors — this is a best-effort optimisation.
      // The foreground AppState check in `useAppUpdates` will cover any misses.
    }
  });
} catch {
  // expo-task-manager is not installed yet — defineTask is skipped entirely.
  // The foreground AppState-based check in `useAppUpdates` remains the primary
  // and fully sufficient update mechanism.
}

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Register the background update task with the OS scheduler.
 *
 * Call this once during app startup (e.g. inside a `useEffect` in `_layout.tsx`).
 * It is safe to call multiple times — duplicate registrations are ignored.
 *
 * ### Required setup (one-time)
 *
 * Install the packages:
 * ```sh
 * npx expo install expo-task-manager expo-background-task
 * ```
 *
 * Add the plugin to `app.config.js`:
 * ```js
 * plugins: [
 *   'expo-background-task',
 *   // ...other plugins
 * ]
 * ```
 *
 * ### Platform notes
 * - **iOS**: The OS decides *when* to run background tasks based on battery,
 *   network conditions, and app usage patterns. The `minimumInterval` is a
 *   hint — iOS may run the task much less frequently or not at all.
 * - **Android**: More reliable, but still subject to Doze mode and battery
 *   optimisation settings.
 *
 * Because background tasks are unreliable, they are a *bonus* optimisation on
 * top of the primary `AppState`-based check in `useAppUpdates`. The app works
 * perfectly without them.
 */
export const registerBackgroundUpdateTask = async (): Promise<void> => {
  try {
    if (__DEV__) return;

    // Dynamic requires keep the app from crashing if either package hasn't
    // been installed yet.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TaskManager = require("expo-task-manager");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const BackgroundTask = require("expo-background-task");

    const isAlreadyRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_UPDATE_TASK,
    );

    if (!isAlreadyRegistered) {
      await BackgroundTask.registerTaskAsync(BACKGROUND_UPDATE_TASK, {
        // Run at most once every 12 hours. The OS treats this as a lower bound,
        // not a guarantee — the actual interval will typically be longer.
        minimumInterval: 60 * 60 * 12,
      });
    }
  } catch {
    // Non-fatal. If the packages are not installed, or if the OS rejects the
    // registration (e.g. permissions denied), the app continues working — the
    // foreground AppState check in `useAppUpdates` is the primary path.
  }
};

// ─── Unregistration ───────────────────────────────────────────────────────────

/**
 * Unregister the background task. Call this if you need to disable background
 * update checks at runtime (e.g. in response to a user preference toggle).
 */
export const unregisterBackgroundUpdateTask = async (): Promise<void> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TaskManager = require("expo-task-manager");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const BackgroundTask = require("expo-background-task");

    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_UPDATE_TASK,
    );

    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(BACKGROUND_UPDATE_TASK);
    }
  } catch {
    // Non-fatal.
  }
};
