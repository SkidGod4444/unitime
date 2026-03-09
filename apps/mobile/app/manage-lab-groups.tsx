import { useAuth } from "@/contexts/auth.cntxt";
import { useLabGroupsStore } from "@/lib/store/lab-groups";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ManageLabGroupsScreen() {
  const router = useRouter();
  const { organizationId } = useLocalSearchParams<{
    organizationId?: string;
  }>();
  const { loggedInUser } = useAuth();
  const canManage = useMemo(
    () =>
      loggedInUser?.role === "ADMIN" || loggedInUser?.role === "REPRESENTATIVE",
    [loggedInUser],
  );

  const {
    byOrg,
    fetchOrgLabGroups,
    createLabGroup,
    deleteLabGroup,
    fetchLabGroupMembers,
    membersByGroup,
  } = useLabGroupsStore();
  const groups = (organizationId && byOrg[organizationId]) || [];
  const [newName, setNewName] = useState("");
  const [membersModal, setMembersModal] = useState<{
    groupId: string | null;
    visible: boolean;
  }>({ groupId: null, visible: false });

  useEffect(() => {
    if (organizationId) fetchOrgLabGroups(organizationId);
  }, [organizationId, fetchOrgLabGroups]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-zinc-900">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-6 pt-2 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full active:opacity-70 mr-4"
        >
          <Ionicons name="arrow-back-outline" size={24} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Manage
          </Text>
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">
            Lab Groups
          </Text>
        </View>
      </View>

      {/* Create group */}
      {canManage && (
        <View className="mx-4 mb-3 bg-white rounded-2xl p-4 border border-gray-100">
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Create Group
          </Text>
          <View className="flex-row items-center gap-2">
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Group name (e.g., Group A)"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2"
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity
              onPress={async () => {
                if (!organizationId || !newName.trim()) return;
                const created = await createLabGroup(
                  organizationId,
                  newName.trim(),
                );
                if (!created)
                  Alert.alert("Error", "Failed to create lab group.");
                setNewName("");
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600"
            >
              <Text className="text-white font-bold">Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
        ListEmptyComponent={
          <View className="items-center py-20 px-4">
            <Ionicons name="people-outline" size={42} color="#d1d5db" />
            <Text className="text-gray-500 mt-2">No lab groups yet.</Text>
          </View>
        }
        renderItem={({ item: g }) => (
          <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-gray-900">
                {g.name}
              </Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={async () => {
                    await fetchLabGroupMembers(g.id);
                    setMembersModal({ groupId: g.id, visible: true });
                  }}
                  className="p-2 rounded-lg bg-gray-100"
                >
                  <Ionicons name="eye-outline" size={18} color="#374151" />
                </TouchableOpacity>
                {canManage && (
                  <TouchableOpacity
                    onPress={async () => {
                      if (!organizationId) return;
                      const ok = await deleteLabGroup(g.id, organizationId);
                      if (!ok)
                        Alert.alert(
                          "Cannot Delete",
                          "Group has members or request failed.",
                        );
                    }}
                    className="p-2 rounded-lg bg-red-50"
                  >
                    <Ionicons name="trash-outline" size={18} color="#dc2626" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
      />

      <Modal
        visible={membersModal.visible}
        animationType="slide"
        onRequestClose={() =>
          setMembersModal({ groupId: null, visible: false })
        }
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity
              onPress={() => setMembersModal({ groupId: null, visible: false })}
              className="p-2 mr-2"
            >
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
            <Text className="text-base font-bold text-gray-900">
              Group Members
            </Text>
          </View>
          <FlatList
            data={
              membersModal.groupId
                ? membersByGroup[membersModal.groupId] || []
                : []
            }
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
                <Text className="text-base font-semibold text-gray-900">
                  {item.name}
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {item.studentProfile?.admissionNumber || item.email}
                </Text>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
