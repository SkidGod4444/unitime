import { z } from "zod";

export const createQRSessionSchema = z.object({
  courseId: z.string().uuid(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  manualPresentIds: z.array(z.string()).optional(),
  manualAbsentIds: z.array(z.string()).optional(),
  labGroupId: z.string().uuid().optional(),
  geofenceRadius: z.number().int().min(10).max(500).optional(),
  coordinates: z.string().optional(),
  generateWebLink: z.boolean().optional(),
});

export const checkinSchema = z
  .object({
    sessionId: z.string().uuid(),
    coordinates: z.object({ lat: z.number(), lng: z.number() }),
  })
  .strict();

export const userUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    image: z.string().url().optional(),
  })
  .strict();

// Lab Groups
export const createLabGroupSchema = z
  .object({
    name: z.string().min(1),
  })
  .strict();

export const joinLabGroupSchema = z
  .object({
    courseId: z.string().uuid(),
  })
  .strict();

export type CreateQRSessionInput = z.infer<typeof createQRSessionSchema>;
export type CheckinInput = z.infer<typeof checkinSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type CreateLabGroupInput = z.infer<typeof createLabGroupSchema>;
export type JoinLabGroupInput = z.infer<typeof joinLabGroupSchema>;
