import type { useToast } from "@/contexts/toast-context";

type ShowToast = ReturnType<typeof useToast>["showToast"];

// Once a just-finished Workout's upload settles, says whether it reached History or is
// waiting on the phone. Doesn't wait: the user has already moved on
export function toastWhenUploaded(showToast: ShowToast, uploaded: Promise<boolean>) {
  uploaded
    .catch(() => false)
    .then((ok) =>
      ok
        ? showToast("Workout saved", { type: "success" })
        : showToast("Saved on your phone; it will upload when you have signal", { type: "info" }),
    );
}
