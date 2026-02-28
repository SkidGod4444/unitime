import { InferRealtimeEvents, Realtime } from "@upstash/realtime";
import { z } from "zod";

const schema = {
  class_events: {
    type: z.enum(["SESSION_STARTED", "SESSION_ENDED", "COURSE_UPDATE", "PING"]),
    sessionId: z.string(),
  },
};

// We don't actually instantiate it with redis on the client, we just need types.
export const realtime = new Realtime({ schema } as any);
export type RealtimeEvents = InferRealtimeEvents<typeof realtime>;
