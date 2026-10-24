import { z } from "zod";

export const HealthResponse = z.object({
  status: z.literal("ok"),
  db: z.enum(["up", "down"]),
});
export type HealthResponse = z.infer<typeof HealthResponse>;