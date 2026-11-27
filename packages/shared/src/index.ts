import { z } from "zod";

export * from "./assessments";
export * from "./check-in";
export * from "./exercises";
export * from "./food";
export * from "./food-entry";
export * from "./dumbbell-ends";
export * from "./equipment";
export * from "./error-reporting";
export * from "./health";
export * from "./nutrition";
export * from "./planned-workouts";
export * from "./progression";
export * from "./tell-the-coach";
export * from "./units";
export * from "./user";
export * from "./week-summaries";
export * from "./workouts";

export const ErrorResponse = z.object({
  error: z.string(),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;
