import { chooseTests } from "@fit/engines";
import { useMemo } from "react";
import { useCurrentUser, usePrimaryEquipmentProfile } from "@/features/user/current-user-provider";

// The Assessment tests the user's primary Equipment Profile and injuries allow; no profile counts as no equipment
export function useChosenTests() {
  const injuries = useCurrentUser().user?.profile.injuries;
  const equipmentProfile = usePrimaryEquipmentProfile();
  return useMemo(() => chooseTests(equipmentProfile ?? { tags: [] }, injuries ?? []), [equipmentProfile, injuries]);
}
