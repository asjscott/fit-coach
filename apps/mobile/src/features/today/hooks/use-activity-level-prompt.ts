import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/features/user/current-user-provider";
import { deviceStorage } from "@/features/workouts/device-storage";
import { asksActivityLevel } from "../today-status";

const KEY = "today.activityLevelSkipped";

// Today's one-time question for a user onboarded before the Activity Level (spec #158 story 4). Answering saves it to
// the profile; skipping is kept on the phone, and the targets count the user as lightly active either way
export function useActivityLevelPrompt() {
  const { user } = useCurrentUser();
  const [skipped, setSkipped] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    deviceStorage.getItem(KEY).then(
      (value) => setSkipped(value === "true"),
      () => setSkipped(false),
    );
  }, []);

  const skip = useCallback(() => {
    setSkipped(true);
    deviceStorage.setItem(KEY, "true").catch(() => {});
  }, []);

  return { asks: asksActivityLevel({ activityLevel: user?.profile.activityLevel, skipped }), skip };
}
