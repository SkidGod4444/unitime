import { Alarm, useAlarms } from "@/contexts/alarms.cntxt";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInRight,
  Layout,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LEAD_OPTIONS = [5, 10, 15, 20, 30];
const COLORS = [
  "#6366f1",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
];

const formatDisplayTime = (
  time: string,
): { h: string; m: string; period: string } => {
  const [hStr, mStr] = time.split(":");
  const h24 = parseInt(hStr, 10);
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { h: String(h12).padStart(2, "0"), m: mStr, period };
};

const formatDays = (days: number[]) => {
  if (days.length === 7) return "Every day";
  if (days.length === 0) return "No days";
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 5 && sorted.every((d) => d >= 1 && d <= 5))
    return "Weekdays";
  return sorted.map((d) => DAY_FULL[d]).join(", ");
};

// ---------------------------------------------------------------------------
// AlarmCard
// ---------------------------------------------------------------------------

const AlarmCard = ({
  alarm,
  index,
  onToggle,
  onEdit,
  onDelete,
}: {
  alarm: Alarm;
  index: number;
  onToggle: (id: string) => void;
  onEdit: (alarm: Alarm) => void;
  onDelete: (id: string) => void;
}) => {
  const { h, m, period } = formatDisplayTime(alarm.time);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify()}
      layout={Layout.springify()}
      className="mb-3"
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onEdit(alarm)}
        onLongPress={() =>
          Alert.alert("Delete Alarm", `Delete alarm for "${alarm.label}"?`, [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => onDelete(alarm.id),
            },
          ])
        }
        className={`bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden ${!alarm.enabled ? "opacity-60" : ""}`}
      >
        {/* Colored accent bar */}
        <View style={{ height: 4, backgroundColor: alarm.color }} />

        <View className="px-5 py-4 flex-row items-center justify-between">
          {/* Left – time + meta */}
          <View className="flex-1 mr-4">
            <View className="flex-row items-baseline gap-1 mb-1">
              <Text className="text-4xl font-bold text-gray-900 tracking-tight">
                {h}:{m}
              </Text>
              <Text className="text-lg font-semibold text-gray-400 mb-0.5">
                {period}
              </Text>
            </View>
            <Text
              className="text-sm font-semibold text-gray-700 mb-0.5"
              numberOfLines={1}
            >
              {alarm.label}
            </Text>
            <View className="flex-row items-center gap-2">
              <View
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: alarm.color + "22" }}
              >
                <Text
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: alarm.color }}
                >
                  {alarm.courseCode}
                </Text>
              </View>
              <Text className="text-xs text-gray-400">
                {formatDays(alarm.days)} · {alarm.leadMinutes}m before
              </Text>
            </View>
          </View>

          {/* Right – toggle */}
          <Switch
            value={alarm.enabled}
            onValueChange={() => onToggle(alarm.id)}
            trackColor={{ false: "#e5e7eb", true: alarm.color + "80" }}
            thumbColor={alarm.enabled ? alarm.color : "#9ca3af"}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// EditModal (Add / Edit alarm)
// ---------------------------------------------------------------------------

type AlarmDraft = {
  id?: string;
  label: string;
  courseCode: string;
  color: string;
  time: string;
  days: number[];
  leadMinutes: number;
  enabled: boolean;
};

const EditModal = ({
  visible,
  draft,
  saving,
  onSave,
  onClose,
}: {
  visible: boolean;
  draft: AlarmDraft | null;
  saving: boolean;
  onSave: (d: AlarmDraft) => void;
  onClose: () => void;
}) => {
  const [label, setLabel] = React.useState(draft?.label ?? "");

  // Parse incoming 24h time into 12h + period
  const parseDraftTime = (time?: string) => {
    const h24 = time ? parseInt(time.split(":")[0], 10) : 8;
    return {
      hour12: h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24,
      period: (h24 >= 12 ? "PM" : "AM") as "AM" | "PM",
    };
  };

  const initial = parseDraftTime(draft?.time);
  const [hour, setHour] = React.useState(initial.hour12);
  const [period, setPeriod] = React.useState<"AM" | "PM">(initial.period);
  const [minute, setMinute] = React.useState(
    draft?.time ? parseInt(draft.time.split(":")[1], 10) : 0,
  );
  const [days, setDays] = React.useState<number[]>(
    draft?.days ?? [1, 2, 3, 4, 5],
  );
  const [leadMinutes, setLeadMinutes] = React.useState(
    draft?.leadMinutes ?? 15,
  );
  const [color, setColor] = React.useState(draft?.color ?? COLORS[0]);

  React.useEffect(() => {
    setLabel(draft?.label ?? "");
    const p = parseDraftTime(draft?.time);
    setHour(p.hour12);
    setPeriod(p.period);
    setMinute(draft?.time ? parseInt(draft.time.split(":")[1], 10) : 0);
    setDays(draft?.days ?? [1, 2, 3, 4, 5]);
    setLeadMinutes(draft?.leadMinutes ?? 15);
    setColor(draft?.color ?? COLORS[0]);
  }, [draft]);

  const toggleDay = (d: number) =>
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );

  // 12-hour cycle: 1 → 2 → … → 12 → 1
  const adjustHour = (delta: number) =>
    setHour((h) => ((h - 1 + delta + 12) % 12) + 1);
  const adjustMinute = (delta: number) =>
    setMinute((m) => (m + delta + 60) % 60);
  const togglePeriod = () =>
    setPeriod((p) => (p === "AM" ? "PM" : "AM"));

  const handleSave = () => {
    if (!label.trim()) {
      Alert.alert("Label required", "Please enter a name for this alarm.");
      return;
    }
    // Convert 12h → 24h for storage
    const h24 =
      period === "AM"
        ? hour === 12 ? 0 : hour
        : hour === 12 ? 12 : hour + 12;
    onSave({
      id: draft?.id,
      label: label.trim(),
      time: `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      days,
      leadMinutes,
      enabled: draft?.enabled ?? true,
      color,
      courseCode: draft?.courseCode ?? "CUSTOM",
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 bg-black/50 justify-end"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          className="bg-white rounded-t-3xl"
          style={{ paddingBottom: 40 }}
        >
          {/* Handle */}
          <View className="items-center pt-3 pb-2">
            <View className="w-10 h-1 rounded-full bg-gray-200" />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="px-6 pt-2 pb-4">
              {/* Title */}
              <Text className="text-2xl font-bold text-gray-900 mb-6">
                {draft?.id ? "Edit Alarm" : "New Alarm"}
              </Text>

              {/* Time picker */}
              <View className="items-center mb-8">
                <View className="flex-row items-center gap-3">
                  {/* Hour */}
                  <View className="items-center">
                    <TouchableOpacity
                      onPress={() => adjustHour(1)}
                      className="p-3 bg-gray-100 rounded-2xl mb-2"
                    >
                      <Ionicons name="chevron-up" size={20} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-6xl font-bold text-gray-900 w-24 text-center">
                      {String(hour).padStart(2, "0")}
                    </Text>
                    <TouchableOpacity
                      onPress={() => adjustHour(-1)}
                      className="p-3 bg-gray-100 rounded-2xl mt-2"
                    >
                      <Ionicons name="chevron-down" size={20} color="#374151" />
                    </TouchableOpacity>
                  </View>

                  <Text className="text-6xl font-bold text-gray-300 mb-1">
                    :
                  </Text>

                  {/* Minute */}
                  <View className="items-center">
                    <TouchableOpacity
                      onPress={() => adjustMinute(5)}
                      className="p-3 bg-gray-100 rounded-2xl mb-2"
                    >
                      <Ionicons name="chevron-up" size={20} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-6xl font-bold text-gray-900 w-24 text-center">
                      {String(minute).padStart(2, "0")}
                    </Text>
                    <TouchableOpacity
                      onPress={() => adjustMinute(-5)}
                      className="p-3 bg-gray-100 rounded-2xl mt-2"
                    >
                      <Ionicons name="chevron-down" size={20} color="#374151" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* AM / PM toggle */}
                <TouchableOpacity
                  onPress={togglePeriod}
                  className="mt-4 px-8 py-2.5 rounded-2xl border-2"
                  style={{ borderColor: color }}
                >
                  <Text className="text-2xl font-bold" style={{ color }}>
                    {period}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Label */}
              <Text className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Label
              </Text>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder="Class name…"
                placeholderTextColor="#9ca3af"
                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-5 text-gray-900 font-medium"
                returnKeyType="done"
              />

              {/* Days */}
              <Text className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                Repeat
              </Text>
              <View className="flex-row gap-2 mb-5">
                {DAY_LABELS.map((d, i) => {
                  const active = days.includes(i);
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => toggleDay(i)}
                      className="flex-1 items-center justify-center rounded-2xl py-2.5"
                      style={{
                        backgroundColor: active ? color : "#f3f4f6",
                      }}
                    >
                      <Text
                        className="text-xs font-bold"
                        style={{ color: active ? "#fff" : "#9ca3af" }}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Lead time */}
              <Text className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                Remind me before class
              </Text>
              <View className="flex-row gap-2 mb-5">
                {LEAD_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setLeadMinutes(opt)}
                    className="flex-1 items-center py-2.5 rounded-2xl"
                    style={{
                      backgroundColor: leadMinutes === opt ? color : "#f3f4f6",
                    }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{
                        color: leadMinutes === opt ? "#fff" : "#9ca3af",
                      }}
                    >
                      {opt}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color */}
              <Text className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                Color
              </Text>
              <View className="flex-row flex-wrap gap-3 mb-8">
                {COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setColor(c)}
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: c }}
                  >
                    {color === c && (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Save */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className="w-full py-4 rounded-2xl items-center"
                style={{ backgroundColor: color, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    Save Alarm
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function AlarmScreen() {
  const router = useRouter();
  const { alarms, loading, createAlarm, updateAlarm, deleteAlarm, toggleAlarm } =
    useAlarms();
  const [draft, setDraft] = useState<AlarmDraft | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeCount = alarms.filter((a) => a.enabled).length;

  const handleToggle = useCallback(
    (id: string) => {
      toggleAlarm(id);
    },
    [toggleAlarm],
  );

  const handleEdit = (alarm: Alarm) => {
    setDraft({
      id: alarm.id,
      label: alarm.label,
      courseCode: alarm.courseCode,
      color: alarm.color,
      time: alarm.time,
      days: alarm.days,
      leadMinutes: alarm.leadMinutes,
      enabled: alarm.enabled,
    });
    setModalVisible(true);
  };

  const handleDelete = useCallback(
    (id: string) => {
      deleteAlarm(id);
    },
    [deleteAlarm],
  );

  const handleSave = async (d: AlarmDraft) => {
    setSaving(true);
    if (d.id) {
      await updateAlarm(d.id, {
        label: d.label,
        courseCode: d.courseCode,
        color: d.color,
        time: d.time,
        days: d.days,
        leadMinutes: d.leadMinutes,
        enabled: d.enabled,
      });
    } else {
      await createAlarm({
        label: d.label,
        courseCode: d.courseCode,
        color: d.color,
        time: d.time,
        days: d.days,
        leadMinutes: d.leadMinutes,
        enabled: d.enabled,
      });
    }
    setSaving(false);
    setModalVisible(false);
  };

  const handleAddNew = () => {
    setDraft(null);
    setModalVisible(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* ── Header ── */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center bg-white rounded-full border border-gray-100 shadow-sm"
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <View>
            <Text className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Class Alarms
            </Text>
            <Text className="text-2xl font-bold text-gray-900">Alarms</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleAddNew}
          className="w-11 h-11 bg-black rounded-full items-center justify-center shadow-sm"
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 120,
          paddingHorizontal: 20,
          gap: 28,
        }}
      >
        {/* ── Summary banner ── */}
        <Animated.View
          entering={FadeInDown.delay(50).springify()}
          className="bg-indigo-600 rounded-3xl p-5 flex-row items-center justify-between shadow-sm overflow-hidden"
        >
          {/* Decorative background circle */}
          <View className="absolute -right-6 -top-10 w-32 h-32 rounded-full bg-indigo-500/50" />

          <View className="z-10">
            <Text className="text-indigo-100 text-sm font-medium mb-1">
              Active alarms
            </Text>
            <Text className="text-white text-4xl font-bold">
              {activeCount}
              <Text className="text-indigo-300 text-2xl">/{alarms.length}</Text>
            </Text>
          </View>
          <View className="items-end gap-2 z-10">
            <Ionicons name="alarm-outline" size={40} color="#e0e7ff" />
            <TouchableOpacity
              onPress={() => router.push("/alarm.player" as any)}
              className="flex-row items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full"
            >
              <Ionicons name="play-circle-outline" size={14} color="#ffffff" />
              <Text className="text-white text-xs font-semibold">Preview</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Alarm list ── */}
        <View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-gray-900">
              Your Alarms
            </Text>
            <Text className="text-xs text-gray-400">Long-press to delete</Text>
          </View>

          {loading ? (
            <View className="items-center py-16 bg-white rounded-3xl border border-gray-100">
              <ActivityIndicator size="large" color="#6366f1" />
              <Text className="text-gray-400 text-sm mt-3">
                Loading alarms…
              </Text>
            </View>
          ) : alarms.length === 0 ? (
            <Animated.View
              entering={FadeInRight.springify()}
              className="items-center py-16 bg-white rounded-3xl border border-gray-100"
            >
              <Ionicons name="alarm-outline" size={52} color="#d1d5db" />
              <Text className="text-gray-400 text-base font-semibold mt-3">
                No alarms yet
              </Text>
              <Text className="text-gray-300 text-sm mt-1 text-center px-10">
                Tap + to create your first class alarm
              </Text>
            </Animated.View>
          ) : (
            alarms.map((alarm, index) => (
              <AlarmCard
                key={alarm.id}
                alarm={alarm}
                index={index}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </View>

        {/* ── Tips card ── */}
        <View className="bg-indigo-50 rounded-3xl p-5 flex-row items-start gap-4">
          <View className="w-10 h-10 bg-indigo-100 rounded-full items-center justify-center mt-0.5">
            <Ionicons
              name="information-circle-outline"
              size={22}
              color="#6366f1"
            />
          </View>
          <View className="flex-1">
            <Text className="text-indigo-900 font-bold text-sm mb-1">
              How class alarms work
            </Text>
            <Text className="text-indigo-500 text-xs leading-relaxed">
              Alarms send push notifications at the set lead-time before your
              class starts. Tap the notification to open the alarm screen. Slide
              to dismiss the alarm. Only enabled alarms on today&apos;s day of
              the week will ring.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Edit / Add Modal ── */}
      <EditModal
        visible={modalVisible}
        draft={draft}
        saving={saving}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}
