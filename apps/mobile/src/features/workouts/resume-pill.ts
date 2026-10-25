import type { InProgressWorkout } from "@fit/shared";

// The Resume pill follows the user across the tabs while a Workout is in progress, and steps aside
// while the Workout's own screens are open
export const showsResumePill = (workout: InProgressWorkout | null, pathname: string) =>
  workout !== null && pathname !== "/workout" && !pathname.startsWith("/workout/");
