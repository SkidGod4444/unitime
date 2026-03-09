/**
 * alarms.cntxt.tsx
 *
 * Manages alarm CRUD against the backend API.
 * Native alarm scheduling is stubbed out — the alarm screen shows a
 * "coming soon" notice while the feature is under development.
 */

import { apiFetch } from "@/lib/api";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Alert } from "react-native";

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

  // ── Fetch alarms from server ─────────────────────────────────────────────

  const refreshAlarms = useCallback(async () => {
    if (!userId) {
      setAlarms([]);
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch(`/alarms/${userId}`);
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
  }, [userId]);

  useEffect(() => {
    refreshAlarms();
  }, [refreshAlarms]);

  // ── CRUD operations ──────────────────────────────────────────────────────

  const createAlarm = useCallback(
    async (input: CreateAlarmInput): Promise<Alarm | null> => {
      if (!userId) return null;
      try {
        const res = await apiFetch("/alarms", {
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
        return alarm;
      } catch (err) {
        console.error("[AlarmsCtx] createAlarm error:", err);
        Alert.alert("Error", "Failed to save alarm. Please try again.");
        return null;
      }
    },
    [userId],
  );

  const updateAlarm = useCallback(
    async (id: string, input: UpdateAlarmInput): Promise<Alarm | null> => {
      try {
        const res = await apiFetch(`/alarms/${id}`, {
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
        return updated;
      } catch (err) {
        console.error("[AlarmsCtx] updateAlarm error:", err);
        Alert.alert("Error", "Failed to update alarm. Please try again.");
        return null;
      }
    },
    [userId],
  );

  const deleteAlarm = useCallback(
    async (id: string): Promise<void> => {
      try {
        const res = await apiFetch(`/alarms/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Delete failed");
        setAlarms((prev) => prev.filter((a) => a.id !== id));
      } catch (err) {
        console.error("[AlarmsCtx] deleteAlarm error:", err);
        Alert.alert("Error", "Failed to delete alarm. Please try again.");
      }
    },
    [],
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
