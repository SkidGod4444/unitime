/**
 * alarms.cntxt.tsx
 *
 * Manages alarm CRUD against the backend and schedules real native alarms
 * using @vall370/expo-alarm — which uses Android AlarmManager and iOS
 * UserNotifications to fire alarms reliably in the background.
 *
 * When an alarm fires the `alarmTriggered` event is emitted → we navigate
 * to /alarm.player with the class info as route params.
 */

import type { AlarmTriggerInput } from "@vall370/expo-alarm";
import { router } from "expo-router";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";
import { Alert } from "react-native";

// ---------------------------------------------------------------------------
// Safe lazy loader – never crashes when native module isn't in the build
// ---------------------------------------------------------------------------

type ExpoAlarmModule = {
  isSupported: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean; canAskAgain: boolean }>;
  scheduleAlarmAsync: (alarm: AlarmTriggerInput) => Promise<void>;
  cancelAlarmAsync: (identifier: string) => Promise<void>;
  addListener: (event: string, listener: (payload: any) => void) => { remove: () => void };
};

let ExpoAlarm: ExpoAlarmModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ExpoAlarm = require("@vall370/expo-alarm").default as ExpoAlarmModule;
} catch {
  // Native module not present in current build – scheduling will be no-op.
  console.warn("[AlarmsCtx] @vall370/expo-alarm native module not available (expected until native build).");
}


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
 * Computes the next Date (relative to now) that an alarm should fire,
 * subtracting leadMinutes from the class start time.
 */
function nextFireDate(alarm: Alarm): Date | null {
  const [hStr, mStr] = alarm.time.split(":");
  const classHour = parseInt(hStr, 10);
  const classMinute = parseInt(mStr, 10);
  if (!alarm.days.length) return null;

  const now = new Date();
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(classHour, classMinute - alarm.leadMinutes, 0, 0);
    const dow = candidate.getDay(); // 0=Sun … 6=Sat
    if (alarm.days.includes(dow) && candidate.getTime() > now.getTime()) {
      return candidate;
    }
  }
  return null;
}

async function scheduleNativeAlarm(alarm: Alarm) {
  if (!ExpoAlarm) return;
  try {
    if (!ExpoAlarm.isSupported()) return;
    const date = nextFireDate(alarm);
    if (!date) return;

    await ExpoAlarm.cancelAlarmAsync(nativeId(alarm.id)).catch(() => {});

    const payload: AlarmTriggerInput = {
      identifier: nativeId(alarm.id),
      title: "⏰ Class Alarm",
      body: `${alarm.label} starts in ${alarm.leadMinutes} min`,
      date,
      repeating: alarm.days.length > 0,
    };
    await ExpoAlarm.scheduleAlarmAsync(payload);
  } catch (err) {
    console.warn("[AlarmsCtx] scheduleNativeAlarm failed:", err);
  }
}

async function cancelNativeAlarm(alarmId: string) {
  if (!ExpoAlarm) return;
  try {
    if (!ExpoAlarm.isSupported()) return;
    await ExpoAlarm.cancelAlarmAsync(nativeId(alarmId));
  } catch (err) {
    console.warn("[AlarmsCtx] cancelNativeAlarm failed:", err);
  }
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

  // ---- Request permissions on mount ------------------------------------

  useEffect(() => {
    if (!ExpoAlarm) return;
    (async () => {
      try {
        if (ExpoAlarm.isSupported()) {
          await ExpoAlarm.requestPermissionsAsync();
        }
      } catch (err) {
        console.warn("[AlarmsCtx] requestPermissionsAsync failed:", err);
      }
    })();
  }, []);

  // ---- Listen for alarmTriggered via addListener (safe without useEvent) -

  const alarmsRef = useRef(alarms);
  useEffect(() => { alarmsRef.current = alarms; }, [alarms]);

  useEffect(() => {
    if (!ExpoAlarm) return;
    let sub: { remove: () => void } | null = null;
    try {
      sub = ExpoAlarm.addListener(
        "alarmTriggered",
        (payload: { identifier?: string }) => {
          const triggered = alarmsRef.current.find(
            (a: Alarm) => nativeId(a.id) === payload.identifier,
          );
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
              : {},
          });
        },
      );
    } catch (err) {
      console.warn("[AlarmsCtx] addListener failed:", err);
    }
    return () => { sub?.remove(); };
  }, []);

  // ---- Fetch alarms from server -----------------------------------------

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

  // ---- CRUD operations -------------------------------------------------

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
