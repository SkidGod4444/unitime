import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/auth.cntxt";
import { useRefresh } from "../hooks/use-refresh";
import { useCoursesStore, useOrgsStore, useProfilesStore, useUsersStore } from "../lib/store";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "ADMIN" | "PROFESSOR" | "REPRESENTATIVE" | "STUDENT";

type User = { id: string; name: string; email: string; role: Role; admissionNumber?: string | null };
type ClassItem = {
  id: string;
  name: string;
  section: string;
  strength: number;
  year: number;
};
type Professor = { id: string; name: string; subject: string; email: string };
type Course = {
  id: string;
  code: string;
  name: string;
  credits: number;
  professor: string;
};
type Attendance = {
  id: string;
  course: string;
  className: string;
  date: string;
  present: number;
  total: number;
};

// ─── Dummy Data ───────────────────────────────────────────────────────────────

const CLASSES: ClassItem[] = [
  { id: "c1", name: "B.Tech CSE", section: "A", strength: 62, year: 2 },
  { id: "c2", name: "B.Tech CSE", section: "B", strength: 58, year: 2 },
  { id: "c3", name: "B.Tech IT", section: "A", strength: 55, year: 3 },
  { id: "c4", name: "B.Tech ECE", section: "A", strength: 60, year: 1 },
];

const PROFESSORS: Professor[] = [
  {
    id: "p1",
    name: "Dr. Bob Johnson",
    subject: "Data Structures",
    email: "bob@uni.edu",
  },
  {
    id: "p2",
    name: "Dr. Fiona Gallagher",
    subject: "Computer Networks",
    email: "fiona@uni.edu",
  },
  {
    id: "p3",
    name: "Dr. Mark Spencer",
    subject: "Operating Systems",
    email: "mark@uni.edu",
  },
  {
    id: "p4",
    name: "Dr. Sarah Connor",
    subject: "DBMS",
    email: "sarah@uni.edu",
  },
];

const COURSES: Course[] = [
  {
    id: "cr1",
    code: "CS201",
    name: "Data Structures",
    credits: 4,
    professor: "Dr. Bob Johnson",
  },
  {
    id: "cr2",
    code: "CS301",
    name: "Operating Systems",
    credits: 3,
    professor: "Dr. Mark Spencer",
  },
  {
    id: "cr3",
    code: "CS401",
    name: "Computer Networks",
    credits: 3,
    professor: "Dr. Fiona Gallagher",
  },
  {
    id: "cr4",
    code: "CS501",
    name: "DBMS",
    credits: 4,
    professor: "Dr. Sarah Connor",
  },
];

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

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabKey = "roles" | "classes" | "professors" | "courses" | "attendance";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "roles", label: "Roles", icon: "shield-outline" },
  { key: "classes", label: "Classes", icon: "school-outline" },
  { key: "professors", label: "Professors", icon: "person-circle-outline" },
  { key: "courses", label: "Courses", icon: "book-outline" },
  { key: "attendance", label: "Attendance", icon: "checkmark-done-outline" },
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
  const { users: storeUsers, removeUser } = useUsersStore();
  const { profiles } = useProfilesStore();
  const [roleModal, setRoleModal] = useState<User | null>(null);

  // Only show non-STUDENT users in the Roles tab, joined with their profile
  const nonStudentUsers = useMemo(
    () =>
      storeUsers
        .filter((u) => u.role !== "STUDENT")
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
      const res = await fetch(`${origin}/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
      });
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
    Alert.alert("Remove User", `Remove ${user.name} from the system?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeUser(user.id),
      },
    ]);
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
      <SafeAreaView className="flex-1 bg-gray-50">
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
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: any) => void;
}) {
  const { users } = useUsersStore();
  const professors = users.filter((u) => u.role === "PROFESSOR");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [creditStr, setCreditStr] = useState("");
  const [classType, setClassType] = useState("LECTURE");
  const [professorId, setProfessorId] = useState("");

  const handleSave = () => {
    const cred = parseFloat(creditStr);
    if (!name || !code || isNaN(cred) || !professorId) {
      Alert.alert("Error", "Please fill all required fields correctly.");
      return;
    }
    onAdd({ name, code, description, credit: cred, classType, professorId });
    setName(""); setCode(""); setDescription(""); setCreditStr(""); setClassType("LECTURE"); setProfessorId("");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={onClose} className="p-1">
            <Ionicons name="close" size={22} color="#6b7280" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-gray-900">Add Course</Text>
          <TouchableOpacity onPress={handleSave} className="px-4 py-1.5 rounded-lg bg-indigo-600">
            <Text className="font-bold text-sm text-white">Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">Course Code</Text>
          <TextInput value={code} onChangeText={setCode} placeholder="e.g. CS101" className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800" />

          <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">Course Name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="e.g. Data Structures" className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800" />

          <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">Description</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder="Optional description" className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800" />

          <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">Credits</Text>
          <TextInput value={creditStr} onChangeText={setCreditStr} placeholder="e.g. 3.0" keyboardType="numeric" className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800" />

          <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">Class Type</Text>
          <View className="flex-row gap-x-2 mb-4">
            {["LECTURE", "LAB", "TUTORIAL"].map((type) => (
              <Pressable key={type} onPress={() => setClassType(type)} className={`flex-1 items-center justify-center py-2.5 rounded-lg border ${classType === type ? "bg-indigo-50 border-indigo-300" : "bg-white border-gray-200"}`}>
                <Text className={`text-sm font-semibold ${classType === type ? "text-indigo-700" : "text-gray-600"}`}>{type}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">Professor</Text>
          {professors.length === 0 ? (
            <Text className="text-sm text-gray-500 mb-4">No professors available. Please add a professor first.</Text>
          ) : (
            professors.map((prof) => (
              <Pressable key={prof.id} onPress={() => setProfessorId(prof.id)} className={`flex-row items-center justify-between p-4 rounded-xl border mb-2 ${professorId === prof.id ? "bg-indigo-50 border-indigo-300" : "bg-white border-gray-200"}`}>
                <Text className={`font-semibold ${professorId === prof.id ? "text-indigo-700" : "text-gray-700"}`}>{prof.name}</Text>
                {professorId === prof.id && <Ionicons name="checkmark-circle" size={20} color="#4f46e5" />}
              </Pressable>
            ))
          )}
          <View className="h-10" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Classes Tab ──────────────────────────────────────────────────────────────

function ClassesTab() {
  const { orgs, removeOrg } = useOrgsStore();

  const handleDelete = (org: any) => {
    Alert.alert("Delete Class", `Delete ${org.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => removeOrg(org.id),
      },
    ]);
  };

  return (
    <FlatList
      data={orgs}
      keyExtractor={(c) => c.id}
      scrollEnabled={false}
      renderItem={({ item: org }) => (
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">
                {(org as any).alias || (org as any).name || "Unnamed Org"}
              </Text>
              <View className="flex-row gap-x-3 mt-1.5">
                <View className="flex-row items-center gap-x-1">
                  <Ionicons name="people-outline" size={13} color="#6b7280" />
                  <Text className="text-xs text-gray-500">
                    ID: {org.id.split('-')[0]}...
                  </Text>
                </View>
                <View className="flex-row items-center gap-x-1">
                  <Ionicons name="pie-chart-outline" size={13} color="#6b7280" />
                  <Text className="text-xs text-gray-500">Active</Text>
                </View>
              </View>
            </View>
              <RowActions
                onEdit={() =>
                  Alert.alert(
                    "Edit Class",
                    `Editing ${(org as any).alias || (org as any).name || "Unnamed Org"}`,
                  )
                }
                onDelete={() => handleDelete(org)}
              />
          </View>
        </View>
      )}
    />
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
                  {prof.name.charAt(prof.name.indexOf(" ") + 1)}
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
  const { courses } = useCoursesStore();

  const handleDelete = (c: any) => {
    Alert.alert("Delete Course", `Delete ${c.code} – ${c.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        // Needs API integration to actually delete it
        onPress: () => {
           Alert.alert("Notice", "Feature not implemented for admin dashboard yet");
        },
      },
    ]);
  };

  return (
    <FlatList
      data={courses}
      keyExtractor={(c) => c.id}
      scrollEnabled={false}
      renderItem={({ item: course }) => (
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center gap-x-2">
                <View className="bg-indigo-600 px-2 py-0.5 rounded-md">
                  <Text className="text-white text-xs font-bold">
                    {course.code}
                  </Text>
                </View>
                <Text
                  className="text-base font-bold text-gray-900 flex-1"
                  numberOfLines={1}
                >
                  {course.name}
                </Text>
              </View>
              <View className="flex-row gap-x-3 mt-1.5">
                <View className="flex-row items-center gap-x-1">
                  <Ionicons name="star-outline" size={13} color="#6b7280" />
                  <Text className="text-xs text-gray-500">
                    {course.credit || "N/A"} credits
                  </Text>
                </View>
                <View className="flex-row items-center gap-x-1">
                  <Ionicons name="person-outline" size={13} color="#6b7280" />
                  <Text className="text-xs text-gray-500">
                    Faculty ID: {course.professorId}
                  </Text>
                </View>
              </View>
            </View>
            <RowActions
              onEdit={() =>
                Alert.alert(
                  "Edit Course",
                  `Editing ${course.code} – ${course.name}`,
                )
              }
              onDelete={() => handleDelete(course)}
            />
          </View>
        </View>
      )}
    />
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

const TAB_ADD_LABELS: Record<TabKey, string> = {
  roles: "Add User",
  classes: "Add Class",
  professors: "Add Professor",
  courses: "Add Course",
  attendance: "New Session",
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("roles");
  const [addUserVisible, setAddUserVisible] = useState(false);
  const [addCourseVisible, setAddCourseVisible] = useState(false);
  const { loggedInUser } = useAuth();
  const { createCourse } = useCoursesStore();

  const handleAddCourse = async (courseData: any) => {
    try {
      await createCourse({
        ...courseData,
        userId: loggedInUser?.id || "",
      });
      setAddCourseVisible(false);
      Alert.alert("Success", "Course added successfully!");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to add course");
    }
  };

  const handleAdd = () => {
    if (activeTab === "roles") {
      setAddUserVisible(true);
    } else if (activeTab === "courses") {
      setAddCourseVisible(true);
    } else {
      Alert.alert("Add", TAB_ADD_LABELS[activeTab]);
    }
  };

  const { users: storeUsers } = useUsersStore();
  const { refresh, refreshing } = useRefresh();

  const handleAddUser = (user: User) => {
    // In a real app: call API to promote the student, then update store
    setAddUserVisible(false);
  };

  const STAT_CARDS = [
    {
      label: "Users",
      value: storeUsers.length,
      icon: "people-outline",
      color: "#4f46e5",
    },
    {
      label: "Classes",
      value: CLASSES.length,
      icon: "school-outline",
      color: "#0891b2",
    },
    {
      label: "Professors",
      value: PROFESSORS.length,
      icon: "person-outline",
      color: "#7c3aed",
    },
    {
      label: "Courses",
      value: COURSES.length,
      icon: "book-outline",
      color: "#059669",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
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
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
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
        </View>

        {/* Active Tab Content */}
        <View className="px-4">
          {activeTab === "roles" && (
            <RolesTab onAddUserPress={() => setAddUserVisible(true)} />
          )}
          {activeTab === "classes" && <ClassesTab />}
          {activeTab === "professors" && <ProfessorsTab />}
          {activeTab === "courses" && <CoursesTab />}
          {activeTab === "attendance" && <AttendanceTab />}
        </View>
      </ScrollView>

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
    </SafeAreaView>
  );
}
