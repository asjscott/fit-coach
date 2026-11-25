import { hasAssessmentResult } from "@fit/engines";
import type { InProgressWorkout } from "@fit/shared";
import { router } from "expo-router";
import type { useToast } from "@/contexts/toast-context";
import { prsHeadline } from "./format";
import type { FinishOutcome } from "./logbook-provider";

type ShowToast = ReturnType<typeof useToast>["showToast"];
type Uploading = Extract<FinishOutcome, { status: "pending" }>;

// Once a just-finished Workout's upload settles, says whether it reached History or is
// waiting on the phone. Doesn't wait: the user has already moved on. An Assessment Workout reaching the server
// completes the Assessment (an old A waits for its B, and a single one that measured nothing makes none), so its toast leads to the Results. PRs the upload found are
// celebrated here (#130), leading to the Workout
export function toastWhenUploaded(
  showToast: ShowToast,
  { workoutId, uploaded, prs }: Uploading,
  workout?: Pick<InProgressWorkout, "assessment" | "workoutExercises">,
) {
  const completesAssessment =
    workout?.assessment === "B" || (workout?.assessment === "single" && hasAssessmentResult([workout]));
  Promise.all([uploaded, prs])
    .catch((): [boolean, []] => [false, []])
    .then(([ok, found]) => {
      const celebration = found.length ? ` ${prsHeadline(found)}` : "";
      if (ok && completesAssessment) {
        showToast(`Assessment saved.${celebration}`, {
          type: "success",
          action: { label: "See results", onPress: () => router.push("/assessment-results") },
        });
      } else if (ok && found.length) {
        showToast(`Workout saved.${celebration}`, {
          type: "success",
          action: {
            label: "See workout",
            onPress: () => router.push({ pathname: "/history/[id]", params: { id: workoutId } }),
          },
        });
      } else if (ok) showToast("Workout saved", { type: "success" });
      else showToast("Saved on your phone; it will upload when you have signal", { type: "info" });
    });
}
