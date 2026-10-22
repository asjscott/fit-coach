import { Goal, InjuryTag, type UserProfile } from "@fit/shared";
import type { Option } from "@/components/hook-form";
import type { IconName } from "@/components/icons";

export const sexOptions: Option<UserProfile["sex"]>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const goalDetails: Record<Goal, { label: string; description: string; icon: IconName }> = {
  lose_fat: { label: "Lose fat", description: "Drop body fat while holding on to strength.", icon: "flame" },
  build_muscle: { label: "Build muscle", description: "Add size with higher-volume training.", icon: "dumbbell" },
  recomp: { label: "Recomp", description: "Lose fat and gain muscle at the same time.", icon: "weight" },
  athletic: { label: "Athletic", description: "Get faster, more powerful and better conditioned.", icon: "target" },
};

export const goalOptions = Goal.options.map((value) => ({ value, ...goalDetails[value] }));

export const goalLabel = (goal: Goal) => goalDetails[goal].label;

const injuryLabels: Record<InjuryTag, string> = {
  neck: "Neck",
  shoulder: "Shoulder",
  elbow: "Elbow",
  wrist: "Wrist",
  lower_back: "Lower back",
  hip: "Hip",
  knee: "Knee",
  ankle: "Ankle",
};

export const injuryOptions: Option<InjuryTag>[] = InjuryTag.options.map((value) => ({
  value,
  label: injuryLabels[value],
}));

export const injuryLabel = (injury: InjuryTag) => injuryLabels[injury];

export const daysPerWeekOptions = [2, 3, 4, 5, 6] as const;
