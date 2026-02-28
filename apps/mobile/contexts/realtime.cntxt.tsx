import type { RealtimeEvents } from "@/lib/realtime";
import { RealtimeProvider as UpstashRealtimeProvider, createRealtime, useRealtimeContext } from "@upstash/realtime/client";
import React from "react";

export const { useRealtime } = createRealtime<RealtimeEvents>();

export const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  // In React Native, hitting a nextjs backend usually requires the full URL.
  // Set default full URL so it doesn't fail on Expo router attempting to proxy /api/realtime.
  const realtimeUrl = `${process.env.EXPO_PUBLIC_API_URL}/api/realtime`;

  return (
    <UpstashRealtimeProvider api={{ url: realtimeUrl }}>
      {children}
    </UpstashRealtimeProvider>
  );
};

export const useRealtimeConnection = () => {
  const context = useRealtimeContext();
  return { isConnected: context.status === "connected" };
};
