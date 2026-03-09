import { withAuth } from "@/lib/api";
import { getAuthToken } from "@/lib/auth.token";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/auth.cntxt";
import { useRefresh } from "../hooks/use-refresh";
import {
  useCoursesStore,
  useFeedbacksStore,
  useOrgsStore,
  useProfilesStore,
  useTicketsStore,
  useUsersStore,
} from "../lib/store";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "ADMIN" | "PROFESSOR" | "REPRESENTATIVE" | "STUDENT";

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  admissionNumber?: string | null;
};

type Attendance = {
  id: string;
  course: string;
  className: string;
  date: string;
  present: number;
  total: number;
};

const SEMESTER_MAP: Record<string, string> = {
  FIRST_SEMESTER: "Sem I",
  SECOND_SEMESTER: "Sem II",
  THIRD_SEMESTER: "Sem III",
  FOURTH_SEMESTER: "Sem IV",
  FIFTH_SEMESTER: "Sem V",
  SIXTH_SEMESTER: "Sem VI",
  SEVENTH_SEMESTER: "Sem VII",
  EIGHTH_SEMESTER: "Sem VIII",
  NINTH_SEMESTER: "Sem IX",
  TENTH_SEMESTER: "Sem X",
};

// ─── Dummy Data ───────────────────────────────────────────────────────────────

const ATTENDANCES: Attendance[] = [
  {
    id: "a1",
    course: "CS201 – Data Structures",
    className: "CSE-A",
    date: "Feb 21, 2026",
    present: 55,
    total: 62,
  },
  {
    id: "a2",
    course: "CS301 – Operating Systems",
    className: "CSE-B",
    date: "Feb 21, 2026",
    present: 48,
    total: 58,
  },
  {
    id: "a3",
    course: "CS401 – Computer Networks",
    className: "IT-A",
    date: "Feb 20, 2026",
    present: 53,
    total: 55,
  },
  {
    id: "a4",
    course: "CS501 – DBMS",
    className: "ECE-A",
    date: "Feb 19, 2026",
    present: 42,
    total: 60,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<Role, { bg: string; text: string }> = {
  ADMIN: { bg: "bg-red-100", text: "text-red-700" },
  PROFESSOR: { bg: "bg-indigo-100", text: "text-indigo-700" },
  REPRESENTATIVE: { bg: "bg-amber-100", text: "text-amber-700" },
  STUDENT: { bg: "bg-green-100", text: "text-green-700" },
};

const emitAdminNotification = async (
  organizationId: string,
  title: string,
  body: string,
  actionUrl: string,
) => {
  try {
    const origin =
      process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1";
    const token = getAuthToken();
    await fetch(`${origin}/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        title,
        body,
        type: "SYSTEM",
        userId: null,
        organizationId,
        actionUrl,
      }),
    });
  } catch (error) {
    console.warn("Failed to dispatch admin notification", error);
  }
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabKey =
  | "users"
  | "roles"
  | "classes"
  | "professors"
  | "courses"
  | "attendance"
  | "feedbacks"
  | "tickets";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "users", label: "Users", icon: "people" },
  { key: "roles", label: "Roles", icon: "shield-outline" },
  { key: "classes", label: "Classes", icon: "school-outline" },
  { key: "professors", label: "Professors", icon: "person-circle-outline" },
  { key: "courses", label: "Courses", icon: "book-outline" },
  { key: "attendance", label: "Attendance", icon: "checkmark-done-outline" },
  { key: "feedbacks", label: "Feedbacks", icon: "chatbubble-ellipses-outline" },
  { key: "tickets", label: "Tickets", icon: "help-buoy-outline" },
];

// ─── Action button ────────────────────────────────────────────────────────────

const RowActions = ({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <View className="flex-row gap-x-1.5">
    <TouchableOpacity onPress={onEdit} className="p-2 bg-indigo-50 rounded-lg">
      <Ionicons name="create-outline" size={16} color="#4f46e5" />
    </TouchableOpacity>
    <TouchableOpacity onPress={onDelete} className="p-2 bg-red-50 rounded-lg">
      <Ionicons name="trash-outline" size={16} color="#dc2626" />
    </TouchableOpacity>
  </View>
);

// ─── Roles Tab ────────────────────────────────────────────────────────────────

const ALL_ROLES: Role[] = ["ADMIN", "PROFESSOR", "REPRESENTATIVE", "STUDENT"];

function RolesTab({ onAddUserPress }: { onAddUserPress: () => void }) {
  const { users: storeUsers, updateUser } = useUsersStore();
  const { profiles } = useProfilesStore();
  const [roleModal, setRoleModal] = useState<User | null>(null);

  // Only show non-STUDENT users that are ACTIVE in the Roles tab, joined with their profile
  const nonStudentUsers = useMemo(
    () =>
      storeUsers
        .filter((u) => u.role !== "STUDENT" && u.status !== "INACTIVE")
        .map((u) => {
          const profile = profiles.find((p) => p.userId === u.id);
          return {
            id: u.id,
            name: u.name ?? "",
            email: u.email,
            role: (u.role ?? "STUDENT") as Role,
            admissionNumber: profile?.admissionNumber ?? null,
          };
        }),
    [storeUsers, profiles],
  );

  const changeRole = async (userId: string, targetRole: Role) => {
    try {
      const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      const token = getAuthToken();
      const res = await fetch(`${origin}/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: targetRole }),
      });
      if (res.status === 401) {
        Alert.alert(
          "Not Authenticated",
          "Session expired. Please sign in again.",
        );
        return;
      }
      if (res.status === 403) {
        Alert.alert(
          "Insufficient permissions",
          "You do not have access to perform this action.",
        );
        return;
      }
      if (!res.ok) throw new Error("Failed to change role");
      // Optionally trigger a store refresh here by calling fetchUsers()
      // but modifying the store locally provides a snappier experience:
      // useUsersStore.getState().setUsers(...)
      setRoleModal(null);
      Alert.alert("Success", "Role updated successfully!");
    } catch {
      Alert.alert("Error", "Could not change role. Please try again.");
    }
  };

  const handleDelete = (user: User) => {
    Alert.alert(
      "Deactivate User",
      `Deactivate ${user.name}? They will lose admin access and be marked inactive.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            try {
              const origin =
                process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
              const res = await fetch(
                `${origin}/admin/users/${user.id}/status`,
                {
                  method: "PATCH",
                  headers: (() => {
                    const t = getAuthToken();
                    return {
                      "Content-Type": "application/json",
                      ...(t ? { Authorization: `Bearer ${t}` } : {}),
                    };
                  })(),
                  body: JSON.stringify({ status: "INACTIVE" }),
                },
              );
              if (res.status === 401) {
                Alert.alert(
                  "Not Authenticated",
                  "Session expired. Please sign in again.",
                );
                return;
              }
              if (res.status === 403) {
                Alert.alert(
                  "Insufficient permissions",
                  "You do not have access to perform this action.",
                );
                return;
              }
              if (!res.ok) throw new Error("Failed to deactivate user");

              updateUser(user.id, { status: "INACTIVE" });
              Alert.alert("Success", "User deactivated successfully.");
            } catch {
              Alert.alert(
                "Error",
                "Could not deactivate user. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <>
      <FlatList
        data={nonStudentUsers}
        keyExtractor={(u) => u.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <View className="items-center py-10">
            <Ionicons name="people-outline" size={40} color="#d1d5db" />
            <Text className="text-gray-400 mt-2 text-sm">
              No users with roles found.
            </Text>
          </View>
        }
        renderItem={({ item: user }) => {
          const colors = ROLE_COLORS[user.role];
          return (
            <Pressable
              onPress={() => setRoleModal(user)}
              className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm active:opacity-70"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">
                    {user.name}
                  </Text>
                  <Text className="text-sm text-gray-500 mt-0.5">
                    {user.admissionNumber ?? user.id}
                  </Text>
                  <View
                    className={`self-start mt-2 px-2.5 py-0.5 rounded-full ${colors.bg}`}
                  >
                    <Text className={`text-xs font-bold ${colors.text}`}>
                      {user.role}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(user)}
                  className="p-2 bg-red-50 rounded-lg"
                >
                  <Ionicons name="trash-outline" size={16} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </Pressable>
          );
        }}
      />

      {/* Role-change bottom sheet */}
      <Modal
        visible={!!roleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleModal(null)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setRoleModal(null)}
        >
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-lg font-bold text-gray-900 mb-1">
              Change Role for
            </Text>
            <Text className="text-sm text-gray-500 mb-4">
              {roleModal?.name} - {roleModal?.admissionNumber ?? roleModal?.id}
            </Text>
            {ALL_ROLES.map((role) => {
              const colors = ROLE_COLORS[role];
              const active = roleModal?.role === role;
              return (
                <Pressable
                  key={role}
                  onPress={() => roleModal && changeRole(roleModal.id, role)}
                  className={`flex-row items-center justify-between px-4 py-3 rounded-xl mb-2 border ${
                    active
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-gray-100 bg-gray-50"
                  }`}
                >
                  <View className={`px-2.5 py-0.5 rounded-full ${colors.bg}`}>
                    <Text className={`text-xs font-bold ${colors.text}`}>
                      {role}
                    </Text>
                  </View>
                  {active && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#4f46e5"
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Feedbacks Tab ───────────────────────────────────────────────────────────

type FeedbackRow = {
  id: string;
  message: string;
  category: "BUG" | "UX" | "FEATURE" | "OTHER";
  status: "NEW" | "ACKNOWLEDGED" | "RESOLVED";
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
};

function FeedbacksTab() {
  const { adminFeedbacks, fetchAdminFeedbacks, updateFeedbackStatus, loading } =
    useFeedbacksStore();

  useEffect(() => {
    fetchAdminFeedbacks();
  }, [fetchAdminFeedbacks]);

  const updateStatus = async (
    id: string,
    status: "ACKNOWLEDGED" | "RESOLVED",
  ) => {
    await updateFeedbackStatus(id, status);
  };

  if (loading && adminFeedbacks.length === 0) {
    return (
      <View className="items-center py-10">
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={40}
          color="#d1d5db"
        />
        <Text className="text-gray-400 mt-2 text-sm">Loading feedbacks…</Text>
      </View>
    );
  }

  if (adminFeedbacks.length === 0) {
    return (
      <View className="items-center py-10">
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={40}
          color="#d1d5db"
        />
        <Text className="text-gray-400 mt-2 text-sm">No feedbacks yet.</Text>
      </View>
    );
  }

  const catColor = (c: FeedbackRow["category"]) =>
    (
      ({
        BUG: ["bg-red-100", "text-red-700"],
        UX: ["bg-amber-100", "text-amber-700"],
        FEATURE: ["bg-indigo-100", "text-indigo-700"],
        OTHER: ["bg-gray-200", "text-gray-700"],
      }) as const
    )[c];
  const stColor = (s: FeedbackRow["status"]) =>
    (
      ({
        NEW: ["bg-blue-100", "text-blue-700"],
        ACKNOWLEDGED: ["bg-purple-100", "text-purple-700"],
        RESOLVED: ["bg-green-100", "text-green-700"],
      }) as const
    )[s];

  return (
    <FlatList
      data={adminFeedbacks as any}
      keyExtractor={(r) => r.id}
      scrollEnabled={false}
      renderItem={({ item: r }) => {
        const [catBg, catText] = catColor(r.category);
        const [stBg, stText] = stColor(r.status);
        return (
          <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
            <View className="flex-row items-start justify-between gap-x-3">
              <View className="flex-1">
                <Text
                  className="text-base font-bold text-gray-900"
                  numberOfLines={2}
                >
                  {r.message}
                </Text>
                <Text className="text-xs text-gray-500 mt-1">
                  {r.user?.name || "Unknown"} • {r.user?.email || "—"}
                </Text>
                <View className="flex-row gap-x-2 mt-2">
                  <View className={`px-2.5 py-0.5 rounded-full ${catBg}`}>
                    <Text className={`text-xs font-bold ${catText}`}>
                      {r.category}
                    </Text>
                  </View>
                  <View className={`px-2.5 py-0.5 rounded-full ${stBg}`}>
                    <Text className={`text-xs font-bold ${stText}`}>
                      {r.status}
                    </Text>
                  </View>
                </View>
              </View>
              <View className="items-end gap-y-1">
                {r.status !== "ACKNOWLEDGED" && r.status !== "RESOLVED" && (
                  <TouchableOpacity
                    onPress={() => updateStatus(r.id, "ACKNOWLEDGED")}
                    className="px-2 py-1 rounded-lg bg-purple-50"
                  >
                    <Text className="text-purple-700 text-xs font-bold">
                      Acknowledge
                    </Text>
                  </TouchableOpacity>
                )}
                {r.status !== "RESOLVED" && (
                  <TouchableOpacity
                    onPress={() => updateStatus(r.id, "RESOLVED")}
                    className="px-2 py-1 rounded-lg bg-green-50"
                  >
                    <Text className="text-green-700 text-xs font-bold">
                      Resolve
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        );
      }}
    />
  );
}

// ─── Tickets Tab ────────────────────────────────────────────────────────────

type TicketRow = {
  id: string;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  resolutionNote?: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
};

function TicketsTab() {
  const { adminTickets, fetchAdminTickets, setTicketStatus, resolveTicket } =
    useTicketsStore();
  const [loading, setLoading] = useState(false);
  const [resolveModal, setResolveModal] = useState<{
    id: string;
    note: string;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchAdminTickets().finally(() => setLoading(false));
  }, [fetchAdminTickets]);

  const setStatus = async (id: string, status: TicketRow["status"]) => {
    await setTicketStatus(id, status);
  };

  const resolveWithNote = async () => {
    if (!resolveModal) return;
    await resolveTicket(resolveModal.id, resolveModal.note);
    setResolveModal(null);
  };

  const statusColors = (s: TicketRow["status"]) =>
    (
      ({
        OPEN: ["bg-amber-100", "text-amber-700"],
        IN_PROGRESS: ["bg-indigo-100", "text-indigo-700"],
        RESOLVED: ["bg-green-100", "text-green-700"],
        CLOSED: ["bg-gray-200", "text-gray-700"],
      }) as const
    )[s];

  if (loading && adminTickets.length === 0) {
    return (
      <View className="items-center py-10">
        <Ionicons name="help-buoy-outline" size={40} color="#d1d5db" />
        <Text className="text-gray-400 mt-2 text-sm">Loading tickets…</Text>
      </View>
    );
  }
  if (adminTickets.length === 0) {
    return (
      <View className="items-center py-10">
        <Ionicons name="help-buoy-outline" size={40} color="#d1d5db" />
        <Text className="text-gray-400 mt-2 text-sm">No tickets yet.</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={adminTickets as any}
        keyExtractor={(r) => r.id}
        scrollEnabled={false}
        renderItem={({ item: r }) => {
          const [bg, text] = statusColors(r.status);
          return (
            <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
              <View className="flex-row items-start justify-between gap-x-2">
                <View className="flex-1">
                  <Text
                    className="text-base font-bold text-gray-900"
                    numberOfLines={1}
                  >
                    {r.title}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {r.user?.name || "Unknown"} • {r.user?.email || "—"}
                  </Text>
                  <Text
                    className="text-sm text-gray-700 mt-2"
                    numberOfLines={3}
                  >
                    {r.description}
                  </Text>
                  <View
                    className={`self-start mt-2 px-2.5 py-0.5 rounded-full ${bg}`}
                  >
                    <Text className={`text-xs font-bold ${text}`}>
                      {r.status.replace("_", " ")}
                    </Text>
                  </View>
                  {r.resolutionNote ? (
                    <View className="mt-2 bg-green-50 p-2 rounded-xl border border-green-100">
                      <Text className="text-xs font-semibold text-green-700">
                        Resolution
                      </Text>
                      <Text className="text-sm text-green-700 mt-0.5">
                        {r.resolutionNote}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View className="items-end gap-y-1">
                  {r.status !== "RESOLVED" && (
                    <TouchableOpacity
                      onPress={() => setResolveModal({ id: r.id, note: "" })}
                      className="px-2 py-1 rounded-lg bg-green-50"
                    >
                      <Text className="text-green-700 text-xs font-bold">
                        Resolve
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() =>
                      setStatus(
                        r.id,
                        r.status === "OPEN"
                          ? "IN_PROGRESS"
                          : r.status === "IN_PROGRESS"
                            ? "CLOSED"
                            : "OPEN",
                      )
                    }
                    className="px-2 py-1 rounded-lg bg-gray-100"
                  >
                    <Text className="text-gray-700 text-xs font-bold">
                      Cycle Status
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Resolve Modal */}
      <Modal
        visible={!!resolveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setResolveModal(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setResolveModal(null)}
          className="flex-1 bg-black/40 justify-end"
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View className="bg-white rounded-t-3xl p-6">
              <Text className="text-base font-bold text-gray-900 mb-2">
                Resolution Note
              </Text>
              <TextInput
                value={resolveModal?.note || ""}
                onChangeText={(t) =>
                  setResolveModal((s) => (s ? { ...s, note: t } : s))
                }
                placeholder="Describe the resolution"
                multiline
                textAlignVertical="top"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-3 min-h-[90px]"
              />
              <View className="flex-row justify-end gap-2">
                <TouchableOpacity
                  onPress={() => setResolveModal(null)}
                  className="px-4 py-2 rounded-lg bg-gray-200"
                >
                  <Text className="text-gray-700 font-bold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={resolveWithNote}
                  className="px-4 py-2 rounded-lg bg-green-600"
                >
                  <Text className="text-white font-bold">Resolve</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
// ─── Moderate User Modal ──────────────────────────────────────────────────────

function ModerateUserModal({
  visible,
  onClose,
  onBan,
}: {
  visible: boolean;
  onClose: () => void;
  onBan: (user: any, reason: string) => void;
}) {
  const { users } = useUsersStore();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [reason, setReason] = useState("");

  const unbannedUsers = React.useMemo(
    () => users.filter((u) => !u.banned),
    [users],
  );

  const filtered = React.useMemo(
    () =>
      unbannedUsers.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      ),
    [search, unbannedUsers],
  );

  const handleBan = () => {
    if (!selected) return;
    onBan(selected, reason || "Banned by admin");
    setSearch("");
    setSelected(null);
    setReason("");
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-zinc-900">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={onClose} className="p-1">
            <Ionicons name="close" size={22} color="#6b7280" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text className="text-base font-bold text-gray-900">
              Moderate User
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleBan}
            disabled={!selected}
            className={`px-4 py-1.5 rounded-lg ${selected ? "bg-red-600" : "bg-gray-200"}`}
          >
            <Text
              className={`font-bold text-sm ${selected ? "text-white" : "text-gray-400"}`}
            >
              Ban
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1 px-4 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 mb-4 gap-x-2">
            <Ionicons name="search-outline" size={18} color="#9ca3af" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or email…"
              className="flex-1 py-3 text-gray-800 text-sm"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
            {filtered.length} user{filtered.length !== 1 ? "s" : ""} found
          </Text>

          {filtered.slice(0, 50).map((user) => {
            const isSelected = selected?.id === user.id;
            return (
              <Pressable
                key={user.id}
                onPress={() => setSelected(isSelected ? null : user)}
                className={`flex-row items-center justify-between p-4 rounded-2xl mb-2 border ${
                  isSelected
                    ? "bg-red-50 border-red-300"
                    : "bg-white border-gray-100"
                }`}
              >
                <View className="flex-row items-center gap-x-3 flex-1">
                  <View
                    className={`w-9 h-9 rounded-full items-center justify-center ${isSelected ? "bg-red-200" : "bg-gray-100"}`}
                  >
                    <Text
                      className={`font-bold text-base ${isSelected ? "text-red-700" : "text-gray-500"}`}
                    >
                      {user.name?.[0] || "?"}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`font-semibold ${isSelected ? "text-red-800" : "text-gray-800"}`}
                    >
                      {user.name}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      {user.email}
                    </Text>
                  </View>
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color="#dc2626" />
                ) : (
                  <View className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
              </Pressable>
            );
          })}

          {selected && (
            <View className="mt-4 mb-6 relative z-10">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Ban Reason (Optional)
              </Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="e.g. Violation of community guidelines"
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
              />
            </View>
          )}
          <View className="h-10" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────

function AddUserModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (user: User) => void;
}) {
  const { users: storeUsers } = useUsersStore();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Omit<User, "role"> | null>(null);
  const [pickedRole, setPickedRole] = useState<Role>("STUDENT");

  // Show only STUDENT users from the store in the Add User picker
  const studentUsers = useMemo(
    () =>
      storeUsers
        .filter((u) => u.role === "STUDENT")
        .map((u) => ({ id: u.id, name: u.name ?? "", email: u.email })),
    [storeUsers],
  );

  const filtered = useMemo(
    () =>
      studentUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      ),
    [search, studentUsers],
  );

  const handleAdd = () => {
    if (!selected) return;
    onAdd({ ...selected, role: pickedRole });
    // reset
    setSearch("");
    setSelected(null);
    setPickedRole("STUDENT");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-zinc-900">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={onClose} className="p-1">
            <Ionicons name="close" size={22} color="#6b7280" />
          </TouchableOpacity>
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Text
              className="text-base font-bold text-gray-900"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{ textAlign: "center" }}
            >
              Add User
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleAdd}
            disabled={!selected}
            className={`px-4 py-1.5 rounded-lg ${selected ? "bg-indigo-600" : "bg-gray-200"}`}
          >
            <Text
              className={`font-bold text-sm ${selected ? "text-white" : "text-gray-400"}`}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1 px-4 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          {/* Search bar */}
          <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 mb-4 gap-x-2">
            <Ionicons name="search-outline" size={18} color="#9ca3af" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or email…"
              placeholderTextColor="#9ca3af"
              className="flex-1 py-3 text-gray-800 text-sm"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {/* User list */}
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
            {filtered.length} user{filtered.length !== 1 ? "s" : ""} found
          </Text>

          {filtered.length === 0 && (
            <View className="items-center py-10">
              <Ionicons name="person-add-outline" size={40} color="#d1d5db" />
              <Text className="text-gray-400 mt-2 text-sm text-center">
                {studentUsers.length === 0
                  ? "No users in the system yet."
                  : "No users match your search."}
              </Text>
            </View>
          )}

          {filtered.map((user) => {
            const isSelected = selected?.id === user.id;
            return (
              <Pressable
                key={user.id}
                onPress={() => setSelected(isSelected ? null : user)}
                className={`flex-row items-center justify-between p-4 rounded-2xl mb-2 border ${
                  isSelected
                    ? "bg-indigo-50 border-indigo-300"
                    : "bg-white border-gray-100"
                }`}
              >
                <View className="flex-row items-center gap-x-3 flex-1">
                  {/* Avatar */}
                  <View
                    className={`w-9 h-9 rounded-full items-center justify-center ${isSelected ? "bg-indigo-200" : "bg-gray-100"}`}
                  >
                    <Text
                      className={`font-bold text-base ${isSelected ? "text-indigo-700" : "text-gray-500"}`}
                    >
                      {user.name[0]}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`font-semibold ${isSelected ? "text-indigo-800" : "text-gray-800"}`}
                    >
                      {user.name}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      {user.email}
                    </Text>
                  </View>
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color="#4f46e5" />
                ) : (
                  <View className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
              </Pressable>
            );
          })}

          {/* Role picker — shown only after a user is selected */}
          {selected && (
            <View className="mt-4 mb-6">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Assign Role
              </Text>
              {ALL_ROLES.map((role) => {
                const colors = ROLE_COLORS[role];
                const active = pickedRole === role;
                return (
                  <Pressable
                    key={role}
                    onPress={() => setPickedRole(role)}
                    className={`flex-row items-center justify-between px-4 py-3.5 rounded-xl mb-2 border ${
                      active
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-gray-100 bg-white"
                    }`}
                  >
                    <View className="flex-row items-center gap-x-3">
                      <View
                        className={`px-2.5 py-0.5 rounded-full ${colors.bg}`}
                      >
                        <Text className={`text-xs font-bold ${colors.text}`}>
                          {role}
                        </Text>
                      </View>
                    </View>
                    {active ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#4f46e5"
                      />
                    ) : (
                      <View className="w-5 h-5 rounded-full border-2 border-gray-200" />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Add Course Modal ────────────────────────────────────────────────────────

function AddCourseModal({
  visible,
  onClose,
  onAdd,
  initialData,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: any) => void;
  initialData?: any;
}) {
  const { users } = useUsersStore();
  const professors = users.filter((u) => u.role === "PROFESSOR");
  const { orgs } = useOrgsStore();

  const [name, setName] = useState(initialData?.name || "");
  const [code, setCode] = useState(initialData?.code || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [creditStr, setCreditStr] = useState(
    initialData?.credit?.toString() || "",
  );
  const [classType, setClassType] = useState(
    initialData?.classType || "LECTURE",
  );
  const [professorId, setProfessorId] = useState<string | null>(
    initialData?.professorId || null,
  );
  const [organizationId, setOrganizationId] = useState(
    initialData?.organizationId || "",
  );
  const [enrollmentEnabled, setEnrollmentEnabled] = useState<boolean>(
    initialData?.enrollmentEnabled ?? true,
  );

  React.useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCode(initialData.code);
      setDescription(initialData.description || "");
      setCreditStr(initialData.credit?.toString() || "");
      setClassType(initialData.classType || "LECTURE");
      setProfessorId(initialData.professorId || "");
      setOrganizationId(initialData.organizationId || "");
      setEnrollmentEnabled(initialData.enrollmentEnabled ?? true);
    } else {
      setName("");
      setCode("");
      setDescription("");
      setCreditStr("");
      setClassType("LECTURE");
      setProfessorId(null);
      setOrganizationId("");
      setEnrollmentEnabled(true);
    }
  }, [initialData, visible]);

  const handleSave = () => {
    const cred = parseFloat(creditStr);
    if (!name || !code || isNaN(cred) || !organizationId) {
      Alert.alert("Error", "Please fill all required fields correctly.");
      return;
    }
    onAdd({
      name,
      code,
      description,
      credit: cred,
      classType,
      professorId: professorId || null,
      organizationId,
      enrollmentEnabled,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-zinc-900">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={onClose} className="p-1">
            <Ionicons name="close" size={22} color="#6b7280" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-gray-900">
            {initialData ? "Edit Course" : "Add Course"}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            className="px-4 py-1.5 rounded-lg bg-indigo-600"
          >
            <Text className="font-bold text-sm text-white">Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1 px-4 pt-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Course Code
          </Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="e.g. CS101"
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
          />

          <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Course Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Data Structures"
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
          />

          <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Description
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Optional description"
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
          />

          <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Credits
          </Text>
          <TextInput
            value={creditStr}
            onChangeText={setCreditStr}
            placeholder="e.g. 3.0"
            keyboardType="numeric"
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
          />

          <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Class Type
          </Text>
          <View className="flex-row gap-x-2 mb-4">
            {["LECTURE", "LAB", "TUTORIAL"].map((type) => (
              <Pressable
                key={type}
                onPress={() => setClassType(type)}
                className={`flex-1 items-center justify-center py-2.5 rounded-lg border ${classType === type ? "bg-indigo-50 border-indigo-300" : "bg-white border-gray-200"}`}
              >
                <Text
                  className={`text-sm font-semibold ${classType === type ? "text-indigo-700" : "text-gray-600"}`}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="flex-row items-center justify-between mt-4 mb-2">
            <Text className="text-xs font-semibold text-gray-500 uppercase">
              Professor (Optional)
            </Text>
            {professorId && (
              <TouchableOpacity onPress={() => setProfessorId(null)}>
                <Text className="text-xs font-semibold text-red-500">
                  Unassign
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {professors.length === 0 ? (
            <Text className="text-sm text-gray-500 mb-4">
              No professors available. Please add a professor first.
            </Text>
          ) : (
            professors.map((prof) => (
              <Pressable
                key={prof.id}
                onPress={() =>
                  setProfessorId(prof.id === professorId ? null : prof.id)
                }
                className={`flex-row items-center justify-between p-4 rounded-xl border mb-2 ${professorId === prof.id ? "bg-indigo-50 border-indigo-300" : "bg-white border-gray-200"}`}
              >
                <Text
                  className={`font-semibold ${professorId === prof.id ? "text-indigo-700" : "text-gray-700"}`}
                >
                  {prof.name}
                </Text>
                {professorId === prof.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#4f46e5" />
                )}
              </Pressable>
            ))
          )}

          <Text className="text-xs font-semibold text-gray-500 uppercase mt-2 mb-2">
            Organization/Class
          </Text>
          {orgs.length === 0 ? (
            <Text className="text-sm text-gray-500 mb-4">
              No classes available. Please add a class first.
            </Text>
          ) : (
            orgs.map((org) => (
              <Pressable
                key={org.id}
                onPress={() => setOrganizationId(org.id)}
                className={`flex-row items-center justify-between p-4 rounded-xl border mb-2 ${organizationId === org.id ? "bg-indigo-50 border-indigo-300" : "bg-white border-gray-200"}`}
              >
                <Text
                  className={`font-semibold ${organizationId === org.id ? "text-indigo-700" : "text-gray-700"}`}
                >
                  {org.courseName} –{" "}
                  {SEMESTER_MAP[org.semester] ||
                    org.semester.replace("_SEMESTER", "")}{" "}
                  ({org.departmentName}) Sect: {org.section}
                </Text>
                {organizationId === org.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#4f46e5" />
                )}
              </Pressable>
            ))
          )}

          <View className="flex-row items-center justify-between mt-4 mb-4 bg-white p-4 rounded-xl border border-gray-100">
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-800">
                Enable Enrollment
              </Text>
              <Text className="text-xs text-gray-500 mt-1">
                Allow students to enroll in this course.
              </Text>
            </View>
            <Switch
              value={enrollmentEnabled}
              onValueChange={setEnrollmentEnabled}
              trackColor={{ false: "#d1d5db", true: "#c7d2fe" }}
              thumbColor={enrollmentEnabled ? "#4f46e5" : "#f3f4f6"}
            />
          </View>
          <View className="h-10" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Add Class (Org) Modal ───────────────────────────────────────────────────

function AddClassModal({
  visible,
  onClose,
  onAdd,
  initialData,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: any) => void;
  initialData?: any;
}) {
  const [departmentName, setDepartmentName] = useState(
    initialData?.departmentName || "",
  );
  const [courseName, setCourseName] = useState(initialData?.courseName || "");
  const [semester, setSemester] = useState(
    initialData?.semester || "FIRST_SEMESTER",
  );
  const [sectionStr, setSectionStr] = useState(
    initialData?.section?.toString() || "",
  );

  React.useEffect(() => {
    if (initialData) {
      setDepartmentName(initialData.departmentName);
      setCourseName(initialData.courseName);
      setSemester(initialData.semester || "FIRST_SEMESTER");
      setSectionStr(initialData.section?.toString() || "");
    } else {
      setDepartmentName("");
      setCourseName("");
      setSemester("FIRST_SEMESTER");
      setSectionStr("");
    }
  }, [initialData, visible]);

  const handleSave = () => {
    const section = parseInt(sectionStr, 10);
    if (!departmentName || !courseName || isNaN(section)) {
      Alert.alert("Error", "Please fill all required fields correctly.");
      return;
    }
    onAdd({
      departmentName,
      courseName,
      semester,
      section,
    });
    onClose();
  };

  const semesters = [
    "FIRST_SEMESTER",
    "SECOND_SEMESTER",
    "THIRD_SEMESTER",
    "FOURTH_SEMESTER",
    "FIFTH_SEMESTER",
    "SIXTH_SEMESTER",
    "SEVENTH_SEMESTER",
    "EIGHTH_SEMESTER",
    "NINTH_SEMESTER",
    "TENTH_SEMESTER",
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-zinc-900">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={onClose} className="p-1">
            <Ionicons name="close" size={22} color="#6b7280" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-gray-900">
            {initialData ? "Edit Class" : "Add Class"}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            className="px-4 py-1.5 rounded-lg bg-indigo-600"
          >
            <Text className="font-bold text-sm text-white">Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1 px-4 pt-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Department Name
          </Text>
          <TextInput
            value={departmentName}
            onChangeText={setDepartmentName}
            placeholder="e.g. CSE"
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
          />

          <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Course Name
          </Text>
          <TextInput
            value={courseName}
            onChangeText={setCourseName}
            placeholder="e.g. B.Tech"
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
          />

          <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Section
          </Text>
          <TextInput
            value={sectionStr}
            onChangeText={setSectionStr}
            placeholder="e.g. 1"
            keyboardType="numeric"
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
          />

          <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Semester
          </Text>
          {semesters.map((sem) => (
            <Pressable
              key={sem}
              onPress={() => setSemester(sem)}
              className={`flex-row items-center justify-between p-4 rounded-xl border mb-2 ${semester === sem ? "bg-indigo-50 border-indigo-300" : "bg-white border-gray-200"}`}
            >
              <Text
                className={`font-semibold ${semester === sem ? "text-indigo-700" : "text-gray-700"}`}
              >
                {SEMESTER_MAP[sem] || sem.replace("_", " ")}
              </Text>
              {semester === sem && (
                <Ionicons name="checkmark-circle" size={20} color="#4f46e5" />
              )}
            </Pressable>
          ))}
          <View className="h-10" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Classes Tab ──────────────────────────────────────────────────────────────

function ClassesTab() {
  const { orgs, deleteOrg, updateOrg } = useOrgsStore();
  const [editingClass, setEditingClass] = useState<any>(null);

  const handleEditSave = async (classData: any) => {
    try {
      await updateOrg(editingClass.id, classData);

      await emitAdminNotification(
        editingClass.id,
        "Class Details Updated",
        `Details for ${classData.courseName} (Sec: ${classData.section}) have been changed.`,
        "/schedule",
      );

      setEditingClass(null);
      Alert.alert("Success", "Class updated successfully!");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update class");
    }
  };

  const handleDelete = (org: any) => {
    Alert.alert(
      "Delete Class",
      `Delete ${org.courseName} (${org.departmentName})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteOrg(org.id);
              Alert.alert("Success", "Class deleted successfully!");
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to delete class");
            }
          },
        },
      ],
    );
  };

  return (
    <>
      <FlatList
        data={orgs}
        keyExtractor={(c) => c.id}
        scrollEnabled={false}
        renderItem={({ item: org }) => (
          <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-base font-bold text-gray-900">
                  {org.courseName} –{" "}
                  {SEMESTER_MAP[org.semester] ||
                    org.semester.replace("_SEMESTER", "")}{" "}
                  ({org.departmentName})
                </Text>
                <View className="flex-row gap-x-3 mt-1.5">
                  <View className="flex-row items-center gap-x-1">
                    <Ionicons name="people-outline" size={13} color="#6b7280" />
                    <Text className="text-xs text-gray-500">
                      Sect: {org.section}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-x-1">
                    <Ionicons
                      name="pie-chart-outline"
                      size={13}
                      color="#6b7280"
                    />
                    <Text className="text-xs text-gray-500">Active</Text>
                  </View>
                </View>
              </View>
              <RowActions
                onEdit={() => setEditingClass(org)}
                onDelete={() => handleDelete(org)}
              />
            </View>
          </View>
        )}
      />
      {/* Edit Class Modal */}
      <AddClassModal
        visible={!!editingClass}
        onClose={() => setEditingClass(null)}
        onAdd={handleEditSave}
        initialData={editingClass}
      />
    </>
  );
}

// ─── Professors Tab ───────────────────────────────────────────────────────────

function ProfessorsTab() {
  const { users, removeUser } = useUsersStore();
  const profs = users.filter((u) => u.role === "PROFESSOR");

  const handleDelete = (p: any) => {
    Alert.alert("Remove Professor", `Remove ${p.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeUser(p.id),
      },
    ]);
  };

  return (
    <FlatList
      data={profs}
      keyExtractor={(p) => p.id}
      scrollEnabled={false}
      renderItem={({ item: prof }) => (
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-x-3 flex-1">
              <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center">
                <Text className="text-indigo-600 font-bold text-base">
                  {prof.name.charAt(0)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-gray-900">
                  {prof.name}
                </Text>
                <Text className="text-xs text-indigo-500 mt-0.5">
                  {prof.email}
                </Text>
              </View>
            </View>
            <RowActions
              onEdit={() =>
                Alert.alert("Edit Professor", `Editing ${prof.name}`)
              }
              onDelete={() => handleDelete(prof)}
            />
          </View>
        </View>
      )}
    />
  );
}

// ─── Courses Tab ──────────────────────────────────────────────────────────────

function CoursesTab() {
  const { courses, deleteCourse, updateCourse } = useCoursesStore();
  const { users } = useUsersStore();
  const { orgs } = useOrgsStore();
  const [editingCourse, setEditingCourse] = useState<any>(null);

  const handleEditSave = async (courseData: any) => {
    try {
      await updateCourse(editingCourse.id, courseData);

      await emitAdminNotification(
        courseData.organizationId,
        "Course Updated",
        `${courseData.name} details have been updated.`,
        "/my-courses",
      );

      setEditingCourse(null);
      Alert.alert("Success", "Course updated successfully!");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update course");
    }
  };

  const handleDelete = (c: any) => {
    Alert.alert("Delete Course", `Delete ${c.code} – ${c.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCourse(c.id);

            await emitAdminNotification(
              c.organizationId,
              "Course Removed",
              `${c.name} has been removed from the class curriculum.`,
              "/my-courses",
            );

            Alert.alert("Success", "Course deleted successfully!");
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to delete course");
          }
        },
      },
    ]);
  };

  return (
    <>
      <FlatList
        data={courses}
        keyExtractor={(c) => c.id}
        scrollEnabled={false}
        renderItem={({ item: course }) => {
          const prof = users.find((u) => u.id === course.professorId);
          const profName = prof ? prof.name : "Unknown Faculty";
          const org = orgs.find((o) => o.id === course.organizationId);
          const orgName = org
            ? `${org.courseName} - ${SEMESTER_MAP[org.semester] || org.semester.replace("_SEMESTER", "")} (${org.departmentName}) Sect: ${org.section}`
            : "Unknown Class";

          return (
            <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <View className="flex-row items-center gap-x-2">
                    <View className="flex-row items-center gap-x-1.5">
                      <View className="bg-indigo-600 px-2 py-0.5 rounded-md">
                        <Text className="text-white text-xs font-bold">
                          {course.code}
                        </Text>
                      </View>
                      <View className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md">
                        <Text className="text-gray-600 text-[10px] font-bold uppercase tracking-wider">
                          {course.classType}
                        </Text>
                      </View>
                    </View>
                    <Text
                      className="text-base font-bold text-gray-900 flex-1"
                      numberOfLines={1}
                    >
                      {course.name}
                    </Text>
                  </View>

                  <View className="mt-2 gap-y-1.5">
                    <View className="flex-row items-center gap-x-3">
                      <View className="flex-row items-center gap-x-1 shrink">
                        <Ionicons
                          name="person-outline"
                          size={13}
                          color="#6b7280"
                        />
                        <Text
                          className="text-xs text-gray-500"
                          numberOfLines={1}
                        >
                          {profName}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-x-1 shrink">
                        <Ionicons
                          name="star-outline"
                          size={13}
                          color="#6b7280"
                        />
                        <Text className="text-xs text-gray-500">
                          {course.credit || "N/A"} credits
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-x-1">
                      <Ionicons
                        name="school-outline"
                        size={13}
                        color="#6b7280"
                      />
                      <Text className="text-xs text-gray-500" numberOfLines={1}>
                        {orgName}
                      </Text>
                    </View>
                  </View>
                </View>
                <RowActions
                  onEdit={() => setEditingCourse(course)}
                  onDelete={() => handleDelete(course)}
                />
              </View>
            </View>
          );
        }}
      />
      {/* Edit Course Modal */}
      <AddCourseModal
        visible={!!editingCourse}
        onClose={() => setEditingCourse(null)}
        onAdd={handleEditSave}
        initialData={editingCourse}
      />
    </>
  );
}

// ─── Attendance Tab ───────────────────────────────────────────────────────────

function AttendanceTab() {
  return (
    <FlatList
      data={ATTENDANCES}
      keyExtractor={(a) => a.id}
      scrollEnabled={false}
      renderItem={({ item: att }) => {
        const pct = Math.round((att.present / att.total) * 100);
        const isLow = pct < 75;
        return (
          <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text
                  className="text-base font-bold text-gray-900"
                  numberOfLines={1}
                >
                  {att.course}
                </Text>
                <View className="flex-row gap-x-3 mt-1">
                  <View className="flex-row items-center gap-x-1">
                    <Ionicons name="school-outline" size={13} color="#6b7280" />
                    <Text className="text-xs text-gray-500">
                      {att.className}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-x-1">
                    <Ionicons
                      name="calendar-outline"
                      size={13}
                      color="#6b7280"
                    />
                    <Text className="text-xs text-gray-500">{att.date}</Text>
                  </View>
                </View>
              </View>
              <View
                className={`px-2.5 py-1 rounded-full ml-2 ${isLow ? "bg-red-100" : "bg-green-100"}`}
              >
                <Text
                  className={`text-xs font-bold ${isLow ? "text-red-700" : "text-green-700"}`}
                >
                  {pct}%
                </Text>
              </View>
            </View>
            <View className="mt-3">
              <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <View
                  className={`h-1.5 rounded-full ${isLow ? "bg-red-400" : "bg-green-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </View>
              <View className="flex-row justify-between mt-1">
                <Text className="text-xs text-gray-400">
                  {att.present} present
                </Text>
                <Text className="text-xs text-gray-400">
                  {att.total - att.present} absent
                </Text>
              </View>
            </View>
          </View>
        );
      }}
    />
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const { users, toggleBan } = useUsersStore();

  const bannedUsers = React.useMemo(() => {
    return users.filter((u) => u.banned);
  }, [users]);

  const handleUnban = (user: any) => {
    Alert.alert("Unban User", `Are you sure you want to unban ${user.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unban",
        style: "default",
        onPress: async () => {
          try {
            await toggleBan(user.id, false);
            Alert.alert("Success", "User unbanned successfully.");
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to unban user");
          }
        },
      },
    ]);
  };

  return (
    <FlatList
      data={bannedUsers}
      keyExtractor={(u) => u.id}
      scrollEnabled={false}
      ListEmptyComponent={
        <View className="items-center py-10">
          <Ionicons name="shield-checkmark-outline" size={40} color="#d1d5db" />
          <Text className="text-gray-400 mt-2 text-sm">
            No banned users found.
          </Text>
        </View>
      }
      renderItem={({ item: user }) => (
        <Pressable className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm active:opacity-70">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">
                {user.name}
              </Text>
              <Text className="text-sm text-gray-500 mt-0.5">{user.email}</Text>
              <View className="self-start mt-2 px-2.5 py-0.5 rounded-full bg-red-100">
                <Text className="text-xs font-bold text-red-700">BANNED</Text>
              </View>
              {user.banReason && (
                <Text className="text-xs text-gray-500 italic mt-2">
                  Reason: {user.banReason}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => handleUnban(user)}
              className="p-2 bg-gray-100 rounded-lg"
            >
              <Ionicons name="refresh-outline" size={16} color="#4b5563" />
            </TouchableOpacity>
          </View>
        </Pressable>
      )}
    />
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const TAB_ADD_LABELS: Record<TabKey, string> = {
  users: "Moderate User",
  roles: "Add User",
  classes: "Add Class",
  professors: "Add Professor",
  courses: "Add Course",
  attendance: "New Session",
  feedbacks: "",
  tickets: "",
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("roles");
  const [addUserVisible, setAddUserVisible] = useState(false);
  const [addClassVisible, setAddClassVisible] = useState(false);
  const [addCourseVisible, setAddCourseVisible] = useState(false);
  const [moderateUserVisible, setModerateUserVisible] = useState(false);
  const { loggedInUser } = useAuth();
  const { createCourse, courses } = useCoursesStore();
  const { createOrg, orgs } = useOrgsStore();

  const handleAddCourse = async (courseData: any) => {
    try {
      await createCourse({
        ...courseData,
        userId: loggedInUser?.id || "",
      });

      await emitAdminNotification(
        courseData.organizationId,
        "New Course Added",
        `You have been enrolled in ${courseData.name} (${courseData.code}).`,
        "/my-courses",
      );

      setAddCourseVisible(false);
      Alert.alert("Success", "Course added successfully!");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to add course");
    }
  };

  const handleAddClass = async (classData: any) => {
    try {
      await createOrg(classData);
      setAddClassVisible(false);
      Alert.alert("Success", "Class added successfully!");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to add class");
    }
  };

  const handleAdd = () => {
    if (activeTab === "roles") {
      setAddUserVisible(true);
    } else if (activeTab === "courses") {
      setAddCourseVisible(true);
    } else if (activeTab === "classes") {
      setAddClassVisible(true);
    } else if (activeTab === "users") {
      setModerateUserVisible(true);
    } else {
      Alert.alert("Add", TAB_ADD_LABELS[activeTab]);
    }
  };

  const { users: storeUsers, updateUser, toggleBan } = useUsersStore();
  const { refresh, refreshing } = useRefresh();

  const [stats, setStats] = useState<{
    users: number;
    studentProfiles: number;
    organizations: number;
    courses: number;
    labGroups: number;
    attendanceSessions: number;
    feedbacks: number;
    tickets: number;
    cacheMetrics?: { hits: number; misses: number };
    dbMetrics?: { activeConnections: number, idleConnections: number, size: string };
  } | null>(null);

  const fetchStats = async () => {
    try {
      const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      const token = getAuthToken();
      const res = await fetch(`${origin}/admin/stats`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.warn("Failed to fetch admin stats", error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleAddUser = async (user: User) => {
    try {
      const origin = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(
        `${origin}/admin/users/${user.id}/role`,
        withAuth({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: user.role }),
        }),
      );
      if (res.status === 401) {
        Alert.alert(
          "Not Authenticated",
          "Session expired. Please sign in again.",
        );
        return;
      }
      if (res.status === 403) {
        Alert.alert(
          "Insufficient permissions",
          "You do not have access to perform this action.",
        );
        return;
      }

      if (!res.ok) throw new Error("Failed to assign role");

      // Update local store to reflect new role immediately
      updateUser(user.id, { role: user.role });
      Alert.alert("Success", "Role assigned successfully!");
      setAddUserVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to assign role");
    }
  };

  const handleModerateUserBan = async (user: any, reason: string) => {
    try {
      await toggleBan(user.id, true, reason);
      Alert.alert("Success", "User banned successfully!");
      setModerateUserVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to ban user");
    }
  };

  const STAT_CARDS = [
    {
      label: "Users",
      value: stats?.users ?? storeUsers.length,
      icon: "people-outline",
      color: "#4f46e5",
    },
    {
      label: "Classes",
      value: stats?.organizations ?? orgs.length,
      icon: "school-outline",
      color: "#0891b2",
    },
    {
      label: "Professors",
      value: storeUsers.filter((u) => u.role === "PROFESSOR").length,
      icon: "person-outline",
      color: "#7c3aed",
    },
    {
      label: "Courses",
      value: stats?.courses ?? courses.length,
      icon: "book-outline",
      color: "#059669",
    },
    {
      label: "Lab Groups",
      value: stats?.labGroups ?? 0,
      icon: "flask-outline",
      color: "#8b5cf6",
    },
    {
      label: "Sessions",
      value: stats?.attendanceSessions ?? 0,
      icon: "qr-code-outline",
      color: "#ec4899",
    },
    {
      label: "Feedbacks",
      value: stats?.feedbacks ?? 0,
      icon: "chatbubble-ellipses-outline",
      color: "#10b981",
    },
    {
      label: "Tickets",
      value: stats?.tickets ?? 0,
      icon: "help-buoy-outline",
      color: "#f59e0b",
    },
    {
      label: "Cache Hits",
      value: stats?.cacheMetrics?.hits ?? 0,
      icon: "server-outline",
      color: "#4ade80",
    },
    {
      label: "Cache Misses",
      value: stats?.cacheMetrics?.misses ?? 0,
      icon: "warning-outline",
      color: "#f87171",
    },
    {
      label: "DB Size",
      value: stats?.dbMetrics?.size ?? "0 KB",
      icon: "server-outline",
      color: "#6b7280",
    },
    {
      label: "DB Active Conns",
      value: stats?.dbMetrics?.activeConnections ?? 0,
      icon: "pulse-outline",
      color: "#3b82f6",
    },
    // {
    //   label: "DB Idle Conns",
    //   value: stats?.dbMetrics?.idleConnections ?? 0,
    //   icon: "pause-circle-outline",
    //   color: "#9ca3af",
    // },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-zinc-900">
      <Stack.Screen
        options={{
          title: "Admin Panel",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#f9fafb" },
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              await refresh();
              await fetchStats();
            }}
          />
        }
      >
        {/* Header */}
        <View className="px-4 pt-4 mb-4">
          <Text className="text-2xl font-bold text-gray-900">Admin Panel</Text>
          <Text className="text-sm text-gray-500 mt-1">
            Manage platform entities and user permissions.
          </Text>
        </View>

        {/* Stats Overview */}
        <View className="px-4 mb-5">
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {STAT_CARDS.map((s) => (
              <View
                key={s.label}
                className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm"
                style={{ width: "48%" }}
              >
                <View className="flex-row items-center gap-x-2.5">
                  <View
                    className="w-9 h-9 rounded-xl items-center justify-center"
                    style={{ backgroundColor: s.color + "18" }}
                  >
                    <Ionicons name={s.icon as any} size={18} color={s.color} />
                  </View>
                  <View>
                    <Text className="text-2xl font-extrabold text-gray-900">
                      {s.value}
                    </Text>
                    <Text className="text-xs text-gray-500">{s.label}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Horizontal Tab Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          className="mb-4"
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`flex-row items-center gap-x-1.5 px-4 py-2 rounded-full border ${
                  active
                    ? "bg-indigo-600 border-indigo-600"
                    : "bg-white border-gray-200"
                }`}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={15}
                  color={active ? "#fff" : "#6b7280"}
                />
                <Text
                  className={`text-sm font-semibold ${
                    active ? "text-white" : "text-gray-600"
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Section header with Add button */}
        <View className="flex-row items-center justify-between px-4 mb-3">
          <Text className="text-base font-bold text-gray-800">
            {TABS.find((t) => t.key === activeTab)?.label}
          </Text>
          {(activeTab === "users" ||
            activeTab === "roles" ||
            activeTab === "classes" ||
            activeTab === "courses" ||
            activeTab === "attendance") && (
            <TouchableOpacity
              onPress={handleAdd}
              activeOpacity={0.8}
              className="flex-row items-center gap-x-1 bg-indigo-600 px-3.5 py-2 rounded-xl"
              style={{ minWidth: 0, maxWidth: "100%" }}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text
                className="text-white text-sm font-bold"
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ flexShrink: 1 }}
              >
                {TAB_ADD_LABELS[activeTab]}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Active Tab Content */}
        <View className="px-4">
          {activeTab === "users" && <UsersTab />}
          {activeTab === "roles" && (
            <RolesTab onAddUserPress={() => setAddUserVisible(true)} />
          )}
          {activeTab === "classes" && <ClassesTab />}
          {activeTab === "professors" && <ProfessorsTab />}
          {activeTab === "courses" && <CoursesTab />}
          {activeTab === "attendance" && <AttendanceTab />}
          {activeTab === "feedbacks" && <FeedbacksTab />}
          {activeTab === "tickets" && <TicketsTab />}
        </View>
      </ScrollView>

      {/* Moderate User Modal */}
      <ModerateUserModal
        visible={moderateUserVisible}
        onClose={() => setModerateUserVisible(false)}
        onBan={handleModerateUserBan}
      />

      {/* Add User Modal — active only for Roles tab */}
      <AddUserModal
        visible={addUserVisible}
        onClose={() => setAddUserVisible(false)}
        onAdd={handleAddUser}
      />

      {/* Add Course Modal */}
      <AddCourseModal
        visible={addCourseVisible}
        onClose={() => setAddCourseVisible(false)}
        onAdd={handleAddCourse}
      />
      {/* Add Class Modal */}
      <AddClassModal
        visible={addClassVisible}
        onClose={() => setAddClassVisible(false)}
        onAdd={handleAddClass}
      />
    </SafeAreaView>
  );
}
