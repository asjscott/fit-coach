import { useState } from "react";

// Which Workout Exercise is current: the one expanded for logging on the In-progress Workout

type Selection = {
  // The Workout Exercises' ids, in order
  ids: readonly string[];
  // The ids the last time it was worked out, so a newly added one can be spotted
  seenIds: readonly string[];
  // The current one last time, or null before there was one
  chosenId: string | null;
  // An Assessment Workout is followed in order: the ids of its tests that are done. Null for a Manual Workout
  doneIds: readonly string[] | null;
};

// Where the Workout opens when nothing is chosen: an Assessment Workout's first test that isn't done, otherwise the
// last Workout Exercise
function opening({ ids, doneIds }: Pick<Selection, "ids" | "doneIds">): string | null {
  const notDone = doneIds && ids.find((id) => !doneIds.includes(id));
  return notDone ?? ids[ids.length - 1] ?? null;
}

// A newly added Workout Exercise becomes current; otherwise the chosen one stays, or the opening one when it's gone
export function currentWorkoutExercise({ ids, seenIds, chosenId, doneIds }: Selection): string | null {
  const added = ids.filter((id) => !seenIds.includes(id));
  if (added.length) return added[added.length - 1] ?? null;
  if (chosenId !== null && ids.includes(chosenId)) return chosenId;
  return opening({ ids, doneIds });
}

const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

// The current Workout Exercise's id, and a way to choose another. Kept in step with the ids during render,
// so a newly added Workout Exercise opens straight away
export function useCurrentWorkoutExercise(ids: readonly string[], doneIds: readonly string[] | null) {
  const [selection, setSelection] = useState<Pick<Selection, "seenIds" | "chosenId">>({ seenIds: ids, chosenId: null });
  const currentId = currentWorkoutExercise({ ids, doneIds, ...selection });
  if (currentId !== selection.chosenId || !sameIds(ids, selection.seenIds)) {
    setSelection({ seenIds: ids, chosenId: currentId });
  }
  const choose = (id: string) => setSelection({ seenIds: ids, chosenId: id });
  return [currentId, choose] as const;
}
