// Past this many reps Epley stops being a fair estimate of a one-rep maximum
export const MAX_E1RM_REPS = 12;

// Epley, uncapped: the maximum a load lifted this many reps to failure is worth. A bodyweight test and its Working
// Level use it both ways past 12 reps, so the round trip gives the tested Exercise back its reps
export const epley = (loadKg: number, reps: number) => loadKg * (1 + reps / 30);

// Epley inverted for the load: what this maximum lifts for this many reps to failure
export const epleyLoadKg = (maximumKg: number, reps: number) => maximumKg / (1 + reps / 30);

// Epley inverted for the reps: how many reps to failure this maximum gets at this load
export const epleyReps = (maximumKg: number, loadKg: number) => 30 * (maximumKg / loadKg - 1);

// Estimated one-rep maximum (Epley). For an RPE-rated Set pass reps + (10 − RPE), so reps in reserve count
export function e1rm(loadKg: number, reps: number): number {
  if (reps <= 0) throw new Error("reps must be positive");
  if (reps > MAX_E1RM_REPS) throw new Error(`e1rm needs ${MAX_E1RM_REPS} reps or fewer`);
  if (reps === 1) return loadKg;
  return epley(loadKg, reps);
}
