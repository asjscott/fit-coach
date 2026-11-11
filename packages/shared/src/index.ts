import { z } from "zod";

export * from "./assessments";
export * from "./check-in";
export * from "./exercises";
export * from "./equipment";
export * from "./health";
export * from "./planned-workouts";
export * from "./units";
export * from "./user";
export * from "./workouts";

export const ErrorResponse = z.object({
  error: z.string(),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;
