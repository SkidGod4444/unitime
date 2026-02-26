// ─────────────────────────────────────────────────────────────────────────────
// expo-alarm-kit — JS API
// ─────────────────────────────────────────────────────────────────────────────

import type {
    AlarmDismissedPayload,
    AlarmPermissionsResponse,
    AlarmRequest,
    AlarmTriggeredPayload,
} from "./ExpoAlarmKit.types";
import ExpoAlarmKitModule from "./ExpoAlarmKitModule";
export * from "./ExpoAlarmKit.types";

// ── Permission helpers ────────────────────────────────────────────────────────

/** Returns whether exact alarm scheduling is supported on this device. */
export function isSupported(): boolean {
  return ExpoAlarmKitModule.isSupported();
}

/**
 * Requests exact-alarm permission (Android 12+ / iOS notifications).
 * On Android < 12 always resolves `granted: true`.
 */
export async function requestPermissionsAsync(): Promise<AlarmPermissionsResponse> {
  return ExpoAlarmKitModule.requestPermissionsAsync();
}

/** Returns the current permission status without prompting. */
export async function getPermissionsAsync(): Promise<AlarmPermissionsResponse> {
  return ExpoAlarmKitModule.getPermissionsAsync();
}

// ── Scheduling ────────────────────────────────────────────────────────────────

/**
 * Schedule an alarm.
 *
 * ```ts
 * await scheduleAlarmAsync({
 *   identifier: 'class-alarm-1',
 *   title:      '⏰ Physics starts in 15 min',
 *   body:       'Lecture Hall B',
 *   date:       Date.now() + 15 * 60_000,
 * });
 * ```
 *
 * On Android this uses `AlarmManager.setExactAndAllowWhileIdle` and fires a
 * Full-Screen Intent that overlays the lock screen.
 *
 * On iOS this posts a `UNUserNotificationCenter` request with
 * `interruptionLevel = .critical` (bypasses silent mode).
 */
export async function scheduleAlarmAsync(alarm: AlarmRequest): Promise<void> {
  return ExpoAlarmKitModule.scheduleAlarmAsync(alarm);
}

/** Cancel a previously scheduled alarm by identifier. */
export async function cancelAlarmAsync(identifier: string): Promise<void> {
  return ExpoAlarmKitModule.cancelAlarmAsync(identifier);
}

/** Cancel every scheduled alarm. */
export async function cancelAllAlarmsAsync(): Promise<void> {
  return ExpoAlarmKitModule.cancelAllAlarmsAsync();
}

/** Returns true if an alarm with this identifier is still scheduled. */
export async function hasAlarmAsync(identifier: string): Promise<boolean> {
  return ExpoAlarmKitModule.hasAlarmAsync(identifier);
}

// ── Events ────────────────────────────────────────────────────────────────────

/**
 * Subscribe to alarm fire events.
 *
 * ```ts
 * const sub = addAlarmListener('alarmTriggered', ({ identifier }) => {
 *   router.push('/alarm.player');
 * });
 * // later…
 * sub.remove();
 * ```
 */
export function addAlarmListener(
  event: "alarmTriggered" | "alarmDismissed",
  listener: (payload: AlarmTriggeredPayload | AlarmDismissedPayload) => void
): { remove: () => void } {
  return ExpoAlarmKitModule.addListener(event, listener);
}

// ── Default export (drop-in-compatible object API) ────────────────────────────

const ExpoAlarmKit = {
  isSupported,
  requestPermissionsAsync,
  getPermissionsAsync,
  scheduleAlarmAsync,
  cancelAlarmAsync,
  cancelAllAlarmsAsync,
  hasAlarmAsync,
  addListener: addAlarmListener,
};

export default ExpoAlarmKit;
