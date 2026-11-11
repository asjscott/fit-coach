import type { AssessmentPart } from "@fit/shared";
import { router } from "expo-router";
import type { useToast } from "@/contexts/toast-context";
import { prsHeadline } from "./format";
import type { FinishOutcome } from "./logbook-provider";

type ShowToast = ReturnType<typeof useToast>["showToast"];
type Uploading = Extract<FinishOutcome, { status: "pending" }>;

// Once a just-finished Workout's upload settles, says whether it reached History or is
// waiting on the phone. Doesn't wait: the user has already moved on. Assessment B reaching the server completes the
// Assessment, so its toast leads to the Results. PRs the upload found are celebrated here (#130), leading to the Workout
export function toastWhenUploaded(
  showToast: ShowToast,
  { workoutId, uploaded, prs }: Uploading,
  assessment?: AssessmentPart,
) {
  Promise.all([uploaded, prs])
    .catch((): [boolean, []] => [false, []])
    .then(([ok, found]) => {
      const celebration = found.length ? ` ${prsHeadline(found)}` : "";
      if (ok && assessment === "B") {
        showToast(`Assessment saved.${celebration}`, {
          type: "success",
          duration: 6000,
          action: { label: "See results", onPress: () => router.push("/assessment-results") },
        });
      } else if (ok && found.length) {
        showToast(`Workout saved.${celebration}`, {
          type: "success",
          duration: 6000,
          action: {
            label: "See workout",
            onPress: () => router.push({ pathname: "/history/[id]", params: { id: workoutId } }),
          },
        });
      } else if (ok) showToast("Workout saved", { type: "success" });
      else showToast("Saved on your phone; it will upload when you have signal", { type: "info" });
    });
}
