// ─────────────────────────────────────────────────────────────────────────────
// expo-alarm-kit — Public Types
// ─────────────────────────────────────────────────────────────────────────────

export type AlarmPermissionsResponse = {
  granted: boolean;
  canAskAgain: boolean;
};

export type AlarmRequest = {
  /** Unique identifier — used to cancel or replace this alarm. */
  identifier: string;
  /** Notification / activity title shown when the alarm fires. */
  title: string;
  /** Optional body text shown under the title. */
  body?: string;
  /**
   * When to fire the alarm — epoch milliseconds (number), NOT a Date object.
   * Pass `Date.now() + delayMs` to schedule from now.
   */
  date: number;
  /** Set to true to repeat. Requires `repeatInterval`. */
  repeating?: boolean;
  /** Repeat interval in milliseconds (only used when repeating = true). */
  repeatInterval?: number;
};

export type AlarmTriggeredPayload = {
  identifier: string;
};

export type AlarmDismissedPayload = {
  identifier: string;
};
