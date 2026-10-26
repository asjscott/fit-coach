import type { AssessmentPart } from "@fit/shared";
import { router } from "expo-router";
import type { useToast } from "@/contexts/toast-context";

type ShowToast = ReturnType<typeof useToast>["showToast"];

// Once a just-finished Workout's upload settles, says whether it reached History or is
// waiting on the phone. Doesn't wait: the user has already moved on. Assessment B reaching the server completes the
// Assessment, so its toast leads to the Results
export function toastWhenUploaded(showToast: ShowToast, uploaded: Promise<boolean>, assessment?: AssessmentPart) {
  uploaded
    .catch(() => false)
    .then((ok) => {
      if (ok && assessment === "B") {
        showToast("Assessment saved", {
          type: "success",
          duration: 6000,
          action: { label: "See results", onPress: () => router.push("/assessment-results") },
        });
      } else if (ok) showToast("Workout saved", { type: "success" });
      else showToast("Saved on your phone; it will upload when you have signal", { type: "info" });
    });
}
