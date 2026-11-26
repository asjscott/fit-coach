import { hasAssessmentResult, unmeasuredTests } from "@fit/engines";
import type { InProgressWorkout } from "@fit/shared";
import { inWords } from "../../utils/in-words";
import { exerciseName } from "./library";

export type UnfinishedTestsNote = { title: string; message: string };

// What finishing an Assessment Workout now gives up, or null when every test is measured: the tests that will be
// estimated, or that nothing measured means no result. An old A or B finishes as it did, so it has none
export function unfinishedTestsNote(
  workout: Pick<InProgressWorkout, "assessment" | "workoutExercises">,
): UnfinishedTestsNote | null {
  if (workout.assessment !== "single") return null;
  if (!hasAssessmentResult([workout])) {
    return {
      title: "Finish without a result?",
      message:
        "No test has been measured, so there won't be a result. The Workout is kept in your History, and you can start the Assessment again from Today.",
    };
  }
  const tests = unmeasuredTests(workout);
  if (!tests.length) return null;
  return {
    title: "Finish with tests undone?",
    message: `${inWords(tests.map(({ slug }) => exerciseName(slug)))} ${tests.length > 1 ? "aren't done, so they'll" : "isn't done, so it'll"} be estimated.`,
  };
}
