import { cache } from "@unitime/cache";
import { InferRealtimeEvents, Realtime } from "@upstash/realtime";
import { z } from "zod";

const schema = {
  class_events: {
    type: z.enum(["SESSION_STARTED", "SESSION_ENDED", "COURSE_UPDATE"]),
    sessionId: z.string(),
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const realtime = new Realtime({ schema, redis: cache as any });

export type RealtimeEvents = InferRealtimeEvents<typeof realtime>;
