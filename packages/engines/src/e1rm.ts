// Past this many reps Epley stops being a fair estimate of a one-rep maximum
export const MAX_E1RM_REPS = 12;

// Estimated one-rep maximum (Epley). For an RPE-rated Set pass reps + (10 − RPE), so reps in reserve count
export function e1rm(loadKg: number, reps: number): number {
  if (reps <= 0) throw new Error("reps must be positive");
  if (reps > MAX_E1RM_REPS) throw new Error(`e1rm needs ${MAX_E1RM_REPS} reps or fewer`);
  if (reps === 1) return loadKg;
  return loadKg * (1 + reps / 30);
}
