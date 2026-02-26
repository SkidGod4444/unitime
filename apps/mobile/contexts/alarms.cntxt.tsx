/**
 * alarms.cntxt.tsx
 *
 * Manages alarm CRUD against the backend and schedules real native alarms
 * using expo-alarm-devkit — a custom module with:
 *   • Android: AlarmManager + FullScreenIntent + AlarmActivity over lock screen
 *   • iOS: UNUserNotificationCenter with critical interruption level
 *
 * Alarm flow:
 *   Foreground  → alarmTriggered JS event → router.push /alarm.player
 *   Background  → AlarmActivity (Android) or notification tap (iOS)
 *               → app re-launches with ALARM_KIT_* intent extras
 *               → useEffect reads extras → router.push /alarm.player
 */

import type { AlarmRequest } from "expo-alarm-devkit";
import ExpoAlarmKit from "expo-alarm-devkit";
import { router } from "expo-router";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, Platform } from "react-native";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Alarm = {
  id: string;
  userId: string;
  label: string;
  courseCode: string;
  color: string;
  time: string; // "HH:MM" 24-hour
  days: number[]; // 0=Sun…6=Sat
  leadMinutes: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAlarmInput = Omit<
  Alarm,
  "id" | "userId" | "createdAt" | "updatedAt"
>;
export type UpdateAlarmInput = Partial<
  Omit<Alarm, "id" | "userId" | "createdAt" | "updatedAt">
>;

type AlarmsContextType = {
  alarms: Alarm[];
  loading: boolean;
  createAlarm: (input: CreateAlarmInput) => Promise<Alarm | null>;
  updateAlarm: (id: string, input: UpdateAlarmInput) => Promise<Alarm | null>;
  deleteAlarm: (id: string) => Promise<void>;
  toggleAlarm: (id: string) => Promise<void>;
  refreshAlarms: () => Promise<void>;
};

// ---------------------------------------------------------------------------
// Scheduling helpers
// ---------------------------------------------------------------------------

/** Unique native identifier tied to a DB alarm */
const nativeId = (alarmId: string) => `unitime-alarm-${alarmId}`;

/**
 * Computes the next fire time for an alarm (class start - leadMinutes).
 * Day-of-week check is done on the class start day to avoid midnight rollback.
 */
function nextFireDate(alarm: Alarm): Date | null {
  const [hStr, mStr] = alarm.time.split(":");
  const classHour = parseInt(hStr, 10);
  const classMinute = parseInt(mStr, 10);
  if (!alarm.days.length) return null;

  const now = new Date();
  for (let offset = 0; offset <= 7; offset++) {
    const classStart = new Date(now);
    classStart.setDate(now.getDate() + offset);
    classStart.setHours(classHour, classMinute, 0, 0);

    const dow = classStart.getDay();
    if (!alarm.days.includes(dow)) continue;

    const fireTime = new Date(classStart.getTime() - alarm.leadMinutes * 60_000);
    if (fireTime.getTime() > now.getTime()) {
      return fireTime;
    }
  }
  return null;
}

async function scheduleNativeAlarm(alarm: Alarm) {
  if (!ExpoAlarmKit) return;
  try {
    if (!ExpoAlarmKit.isSupported()) return;
    const date = nextFireDate(alarm);
    if (!date) return;

    await ExpoAlarmKit.cancelAlarmAsync(nativeId(alarm.id)).catch(() => {});

    const request: AlarmRequest = {
      identifier: nativeId(alarm.id),
      title: "⏰ Class Alarm",
      body: `${alarm.label} starts in ${alarm.leadMinutes} min`,
      date: date.getTime(), // epoch ms — number, not Date
      repeating: false,
    };
    await ExpoAlarmKit.scheduleAlarmAsync(request);
  } catch (err) {
    console.warn("[AlarmsCtx] scheduleNativeAlarm failed:", err);
  }
}

async function cancelNativeAlarm(alarmId: string) {
  if (!ExpoAlarmKit) return;
  try {
    if (!ExpoAlarmKit.isSupported()) return;
    await ExpoAlarmKit.cancelAlarmAsync(nativeId(alarmId));
  } catch (err) {
    console.warn("[AlarmsCtx] cancelNativeAlarm failed:", err);
  }
}

/**
 * Schedules a demo native alarm that fires in ~30 seconds.
 * Useful for quickly verifying the alarm player flow.
 */
export async function scheduleDemoAlarmAsync(): Promise<void> {
  if (!ExpoAlarmKit) {
    console.warn("[AlarmsCtx] scheduleDemoAlarmAsync: native module not available (rebuild required).");
    return;
  }
  try {
    if (!ExpoAlarmKit.isSupported()) {
      console.warn("[AlarmsCtx] scheduleDemoAlarmAsync: not supported.");
      return;
    }
    const fireTime = Date.now() + 30_000;
    await ExpoAlarmKit.cancelAlarmAsync("unitime-demo").catch(() => {});
    await ExpoAlarmKit.scheduleAlarmAsync({
      identifier: "unitime-demo",
      title: "⏰ Demo Alarm",
      body: "Demo class starts in 15 min — tap to dismiss",
      date: fireTime,
      repeating: false,
    });
    console.log(
      "[AlarmsCtx] Demo alarm scheduled for:",
      new Date(fireTime).toLocaleTimeString(),
    );
  } catch (err) {
    console.warn("[AlarmsCtx] scheduleDemoAlarmAsync failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Helper — navigate to alarm player with the right params
// ---------------------------------------------------------------------------

function navigateToAlarmPlayer(
  identifier: string,
  alarmsRef: React.MutableRefObject<Alarm[]>,
) {
  const triggered = alarmsRef.current.find(
    (a) => nativeId(a.id) === identifier,
  );
  const isDemo = identifier === "unitime-demo";

  router.push({
    pathname: "/alarm.player",
    params: triggered
      ? {
          alarmId: triggered.id,
          label: triggered.label,
          courseCode: triggered.courseCode,
          color: triggered.color,
          time: triggered.time,
          leadMinutes: String(triggered.leadMinutes),
        }
      : isDemo
        ? {
            label: "Demo Class Alarm",
            courseCode: "DEMO",
            color: "#f59e0b",
            leadMinutes: "15",
          }
        : {},
  });
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AlarmsContext = createContext<AlarmsContextType>({
  alarms: [],
  loading: true,
  createAlarm: async () => null,
  updateAlarm: async () => null,
  deleteAlarm: async () => {},
  toggleAlarm: async () => {},
  refreshAlarms: async () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AlarmsProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId: string | null;
}) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);

  const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

  // Keep a ref so the listener closures always see the latest alarms list
  const alarmsRef = useRef(alarms);
  useEffect(() => {
    alarmsRef.current = alarms;
  }, [alarms]);

  // ── Request permissions on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!ExpoAlarmKit) return;
    (async () => {
      try {
        if (ExpoAlarmKit.isSupported()) {
          await ExpoAlarmKit.requestPermissionsAsync();
        }
      } catch (err) {
        console.warn("[AlarmsCtx] requestPermissionsAsync failed:", err);
      }
    })();
  }, []);

  // ── Listen for alarmTriggered (foreground JS event) ──────────────────────
  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    try {
      sub = ExpoAlarmKit.addListener(
        "alarmTriggered",
        (payload: { identifier?: string }) => {
          if (!payload.identifier) return;
          navigateToAlarmPlayer(payload.identifier, alarmsRef);
        },
      );
    } catch (err) {
      console.warn("[AlarmsCtx] addListener(alarmTriggered) failed:", err);
    }
    return () => {
      sub?.remove();
    };
  }, []);

  // ── Android: handle AlarmActivity re-launch via intent extras ────────────
  //
  // AlarmActivity starts the RN app with ALARM_KIT_IDENTIFIER extra in the
  // launch intent. We detect it here on mount (and on resume via AppState if
  // needed). Only runs on Android.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    try {
      // expo-modules-core exposes the initial intent extras at module load time
      // via the global `__expo_module_initial_props__` or via the NativeModule.
      // We read them from the NativeModule's initialProps if available.
       
      const initialProps = (global as any).__initialProps ?? {};
      const identifier: string | undefined =
        initialProps["ALARM_KIT_IDENTIFIER"];
      if (identifier) {
        // Small delay so the router is ready
        setTimeout(() => navigateToAlarmPlayer(identifier, alarmsRef), 400);
      }
    } catch {
      // Not available in all build configurations
    }
   
  }, []);

  // ── Fetch alarms from server ─────────────────────────────────────────────

  const refreshAlarms = useCallback(async () => {
    if (!userId) {
      setAlarms([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${origin}/alarms/${userId}`);
      if (!res.ok) {
        setAlarms([]);
        return;
      }
      const data = await res.json();
      setAlarms(data.alarms ?? []);
    } catch (err) {
      console.warn("[AlarmsCtx] refreshAlarms error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, origin]);

  useEffect(() => {
    refreshAlarms();
  }, [refreshAlarms]);

  // ── CRUD operations ──────────────────────────────────────────────────────

  const createAlarm = useCallback(
    async (input: CreateAlarmInput): Promise<Alarm | null> => {
      if (!userId) return null;
      try {
        const res = await fetch(`${origin}/alarms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, userId }),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error(`[AlarmsCtx] createAlarm ${res.status}:`, text);
          throw new Error(`Create failed: ${res.status}`);
        }
        const data = await res.json();
        const alarm: Alarm = data.alarm;
        setAlarms((prev) => [...prev, alarm]);
        if (alarm.enabled) await scheduleNativeAlarm(alarm);
        return alarm;
      } catch (err) {
        console.error("[AlarmsCtx] createAlarm error:", err);
        Alert.alert("Error", "Failed to save alarm. Please try again.");
        return null;
      }
    },
    [userId, origin],
  );

  const updateAlarm = useCallback(
    async (id: string, input: UpdateAlarmInput): Promise<Alarm | null> => {
      try {
        const res = await fetch(`${origin}/alarms/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error(`[AlarmsCtx] updateAlarm ${res.status}:`, text);
          throw new Error(`Update failed: ${res.status}`);
        }
        const data = await res.json();
        const updated: Alarm = data.alarm;
        setAlarms((prev) => prev.map((a) => (a.id === id ? updated : a)));
        if (updated.enabled) {
          await scheduleNativeAlarm(updated);
        } else {
          await cancelNativeAlarm(id);
        }
        return updated;
      } catch (err) {
        console.error("[AlarmsCtx] updateAlarm error:", err);
        Alert.alert("Error", "Failed to update alarm. Please try again.");
        return null;
      }
    },
    [origin],
  );

  const deleteAlarm = useCallback(
    async (id: string): Promise<void> => {
      try {
        const res = await fetch(`${origin}/alarms/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Delete failed");
        setAlarms((prev) => prev.filter((a) => a.id !== id));
        await cancelNativeAlarm(id);
      } catch (err) {
        console.error("[AlarmsCtx] deleteAlarm error:", err);
        Alert.alert("Error", "Failed to delete alarm. Please try again.");
      }
    },
    [origin],
  );

  const toggleAlarm = useCallback(
    async (id: string): Promise<void> => {
      const alarm = alarms.find((a) => a.id === id);
      if (!alarm) return;
      await updateAlarm(id, { enabled: !alarm.enabled });
    },
    [alarms, updateAlarm],
  );

  return (
    <AlarmsContext.Provider
      value={{
        alarms,
        loading,
        createAlarm,
        updateAlarm,
        deleteAlarm,
        toggleAlarm,
        refreshAlarms,
      }}
    >
      {children}
    </AlarmsContext.Provider>
  );
}

export const useAlarms = () => useContext(AlarmsContext);
