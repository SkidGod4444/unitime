import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { SupportTicketT } from "@unitime/types";
import { useRefresh } from "@/hooks/use-refresh";
import { useTicketsStore } from "@/lib/store";

const STATUS_COLORS: Record<SupportTicketT["status"], { bg: string; text: string }> = {
  OPEN: { bg: "bg-amber-100", text: "text-amber-700" },
  IN_PROGRESS: { bg: "bg-indigo-100", text: "text-indigo-700" },
  RESOLVED: { bg: "bg-green-100", text: "text-green-700" },
  CLOSED: { bg: "bg-gray-200", text: "text-gray-700" },
};

export default function SupportScreen() {
  // no router usage on this screen
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { myTickets, fetchMyTickets, createTicket } = useTicketsStore();
  const { refreshing, refresh } = useRefresh();

  const canSubmit = useMemo(() => title.trim().length > 0 && description.trim().length > 0 && !submitting, [title, description, submitting]);

  useEffect(() => {
    fetchMyTickets();
  }, [fetchMyTickets]);

  const submitTicket = async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      const ticket = await createTicket(title.trim(), description.trim());
      if (!ticket) {
        Alert.alert("Failed", "Could not open a support ticket.");
        return;
      }
      setTitle("");
      setDescription("");
      Alert.alert("Submitted", "Your support ticket has been created.");
    } catch {
      Alert.alert("Failed", "Network error while creating ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-zinc-900">
      <Stack.Screen
        options={{
          title: "Raise a Ticket",
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Open a Ticket */}
        <View className="px-4 pt-4">
          <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4">
            <Text className="text-base font-bold text-gray-900 dark:text-zinc-100 mb-1">Raise a Ticket</Text>
            <Text className="text-xs text-gray-500 dark:text-zinc-400 mb-3">Describe your issue and we’ll get back to you.</Text>

            <Text className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-2">Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Short summary"
              className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 mb-3 text-gray-800 dark:text-zinc-100"
            />

            <Text className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-2">Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the problem"
              multiline
              textAlignVertical="top"
              className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 mb-3 min-h-[100px] text-gray-800 dark:text-zinc-100"
            />

            <TouchableOpacity
              disabled={!canSubmit}
              onPress={submitTicket}
              className={`px-4 py-3 rounded-xl items-center ${canSubmit ? "bg-indigo-600" : "bg-gray-300"}`}
            >
              <Text className={`font-bold ${canSubmit ? "text-white" : "text-gray-500"}`}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* My Tickets */}
        <View className="px-4 mt-6">
          <Text className="text-base font-bold text-gray-800 dark:text-zinc-100 mb-3">My Tickets</Text>
          {myTickets.length === 0 ? (
            <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 p-6 items-center">
              <Ionicons name="help-buoy-outline" size={28} color="#9ca3af" />
              <Text className="text-gray-500 dark:text-zinc-400 mt-2 text-sm">No tickets yet</Text>
            </View>
          ) : (
            <FlatList
              data={myTickets}
              keyExtractor={(t) => t.id}
              scrollEnabled={false}
              renderItem={({ item: t }) => {
                const colors = STATUS_COLORS[t.status];
                return (
                  <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 mb-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="font-bold text-gray-900 dark:text-zinc-100 pr-2" numberOfLines={1}>{t.title}</Text>
                      <View className={`px-2.5 py-0.5 rounded-full ${colors.bg}`}>
                        <Text className={`text-xs font-bold ${colors.text}`}>{t.status.replace("_", " ")}</Text>
                      </View>
                    </View>
                    <Text className="text-sm text-gray-600 dark:text-zinc-300 mt-1" numberOfLines={3}>{t.description}</Text>
                    {t.resolutionNote ? (
                      <View className="mt-2 bg-green-50 dark:bg-green-900/20 p-2 rounded-xl border border-green-100 dark:border-green-900/30">
                        <Text className="text-xs font-semibold text-green-700 dark:text-green-300">Resolution</Text>
                        <Text className="text-sm text-green-700 dark:text-green-200 mt-0.5">{t.resolutionNote}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              }}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
