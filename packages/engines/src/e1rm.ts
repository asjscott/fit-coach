export function e1rm(loadKg: number, reps: number): number {
  if (reps <= 0) throw new Error("reps must be positive");
  return loadKg * (1 + reps / 30);
}