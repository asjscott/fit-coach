import type { InProgressWorkoutExercise } from "@fit/shared";
import { useState } from "react";

// Which Workout Exercise is current: the one expanded for logging on the In-progress Workout

type Selection = {
  // The Workout Exercises' ids, in order
  ids: readonly string[];
  // The ids the last time it was worked out, so a newly added one can be spotted
  seenIds: readonly string[];
  // The current one last time, or null before there was one
  chosenId: string | null;
  // What a Workout with a set order opens on: an Assessment Workout's next test (Logbook.testProgress) or the next
  // planned Exercise; none in a Manual Workout
  nextId?: string;
};

// A newly added Workout Exercise becomes current; otherwise the chosen one stays, even a test that has just been done.
// With none chosen, or the chosen one gone, it's the next in order, else the last Workout Exercise
export function currentWorkoutExercise({ ids, seenIds, chosenId, nextId }: Selection): string | null {
  const added = ids.filter((id) => !seenIds.includes(id));
  if (added.length) return added[added.length - 1] ?? null;
  if (chosenId !== null && ids.includes(chosenId)) return chosenId;
  return nextId ?? ids[ids.length - 1] ?? null;
}

// The first Exercise of a Workout started from a plan still short of its target Sets
export function nextPlannedExercise(
  workoutExercises: readonly (Pick<InProgressWorkoutExercise, "id" | "planned"> & { sets: readonly unknown[] })[],
) {
  return workoutExercises.find(({ sets, planned }) => planned && sets.length < planned.sets)?.id;
}

const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

// The current Workout Exercise's id, and a way to choose another. Kept in step with the ids during render,
// so a newly added Workout Exercise opens straight away
export function useCurrentWorkoutExercise(ids: readonly string[], nextId?: string) {
  const [selection, setSelection] = useState<Pick<Selection, "seenIds" | "chosenId">>({ seenIds: ids, chosenId: null });
  const currentId = currentWorkoutExercise({ ids, nextId, ...selection });
  if (currentId !== selection.chosenId || !sameIds(ids, selection.seenIds)) {
    setSelection({ seenIds: ids, chosenId: currentId });
  }
  const choose = (id: string) => setSelection({ seenIds: ids, chosenId: id });
  return [currentId, choose] as const;
}
