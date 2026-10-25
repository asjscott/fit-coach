import { useState } from "react";

// Which Workout Exercise is current: the one expanded for logging on the In-progress Workout

type Selection = {
  // The Workout Exercises' ids, in order
  ids: readonly string[];
  // The ids the last time it was worked out, so a newly added one can be spotted
  seenIds: readonly string[];
  // The current one last time, or null before there was one
  chosenId: string | null;
};

// A newly added Workout Exercise becomes current; otherwise the chosen one stays, or the last one when it's gone
export function currentWorkoutExercise({ ids, seenIds, chosenId }: Selection): string | null {
  const added = ids.filter((id) => !seenIds.includes(id));
  if (added.length) return added[added.length - 1] ?? null;
  if (chosenId !== null && ids.includes(chosenId)) return chosenId;
  return ids[ids.length - 1] ?? null;
}

const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

// The current Workout Exercise's id, and a way to choose another. Kept in step with the ids during render,
// so a newly added Workout Exercise opens straight away
export function useCurrentWorkoutExercise(ids: readonly string[]) {
  const [selection, setSelection] = useState<Omit<Selection, "ids">>({ seenIds: ids, chosenId: null });
  const currentId = currentWorkoutExercise({ ids, ...selection });
  if (currentId !== selection.chosenId || !sameIds(ids, selection.seenIds)) {
    setSelection({ seenIds: ids, chosenId: currentId });
  }
  const choose = (id: string) => setSelection({ seenIds: ids, chosenId: id });
  return [currentId, choose] as const;
}
