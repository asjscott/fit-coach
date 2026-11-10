import { EQUIPMENT_LABELS, type EquipmentTag, type Muscle, type Pattern } from "@fit/shared";

export const patternLabels: Record<Pattern, string> = {
  squat: "Squat",
  hinge: "Hinge",
  push: "Push",
  pull: "Pull",
  carry: "Carry",
  core: "Core",
};

// What a Recovery Exercise is listed under, in place of a Pattern
export const RECOVERY_LABEL = "Recovery";

// "front_delts" -> "Front delts"
export const muscleLabel = (muscle: Muscle) => {
  const words = muscle.replace(/_/g, " ");
  return words[0].toUpperCase() + words.slice(1);
};

// Lower-cases a label mid-sentence, but leaves acronyms like "EZ curl bar" alone
const midSentence = (label: string) => (/^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label);

// [["dumbbells"], ["kettlebells"]] -> "Dumbbells, or kettlebells"; [[]] -> "No equipment"
export function equipmentInWords(options: EquipmentTag[][]): string {
  if (options.some((option) => option.length === 0)) return "No equipment";
  const sentence = options
    .map((option) => option.map((tag) => midSentence(EQUIPMENT_LABELS[tag])).join(" + "))
    .join(", or ");
  return sentence[0].toUpperCase() + sentence.slice(1);
}
