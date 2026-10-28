import { useState } from "react";

// Which Workout Exercise is current: the one expanded for logging on the In-progress Workout

type Selection = {
  // The Workout Exercises' ids, in order
  ids: readonly string[];
  // The ids the last time it was worked out, so a newly added one can be spotted
  seenIds: readonly string[];
  // The current one last time, or null before there was one
  chosenId: string | null;
  // An Assessment Workout's next test (Logbook.testProgress), which it opens on; none in a Manual Workout
  nextTestId?: string;
};

// A newly added Workout Exercise becomes current; otherwise the chosen one stays, even a test that has just been done.
// With none chosen, or the chosen one gone, it's the next test, else the last Workout Exercise
export function currentWorkoutExercise({ ids, seenIds, chosenId, nextTestId }: Selection): string | null {
  const added = ids.filter((id) => !seenIds.includes(id));
  if (added.length) return added[added.length - 1] ?? null;
  if (chosenId !== null && ids.includes(chosenId)) return chosenId;
  return nextTestId ?? ids[ids.length - 1] ?? null;
}

const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

// The current Workout Exercise's id, and a way to choose another. Kept in step with the ids during render,
// so a newly added Workout Exercise opens straight away
export function useCurrentWorkoutExercise(ids: readonly string[], nextTestId?: string) {
  const [selection, setSelection] = useState<Pick<Selection, "seenIds" | "chosenId">>({ seenIds: ids, chosenId: null });
  const currentId = currentWorkoutExercise({ ids, nextTestId, ...selection });
  if (currentId !== selection.chosenId || !sameIds(ids, selection.seenIds)) {
    setSelection({ seenIds: ids, chosenId: currentId });
  }
  const choose = (id: string) => setSelection({ seenIds: ids, chosenId: id });
  return [currentId, choose] as const;
}
