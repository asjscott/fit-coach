import { dumbbellBuild, loadsByKindKg, SAME_LOAD_TOLERANCE } from "@fit/engines";
import { toKg, type EquipmentProfile, type WeightUnit } from "@fit/shared";
import { sizeInUnit } from "../equipment/loads";
import { libraryExercise } from "./library";
import { parseField } from "./set-entry";

// The load field's text, and its exact kg unless it was typed → how to build it with bar-and-plates dumbbells (#182), or
// undefined when they don't make it
export type BuildLabel = (load: string, kg?: number) => string | undefined;

// A load that two kinds of equipment have is on the kind the stepper steps it on (#149). Finds the loads once for all
// those typed
export function dumbbellBuildLabel(slug: string, profile: EquipmentProfile | undefined, unit: WeightUnit): BuildLabel {
  const exercise = libraryExercise(slug);
  if (!exercise || profile?.loads.dumbbells?.kind !== "bar_and_plates") return () => undefined;
  const loadsByKind = [...loadsByKindKg(exercise, profile)];

  return (text, kg = toKg(parseField(text), unit)) => {
    const isLoad = (each: number) => Math.abs(each - kg) <= SAME_LOAD_TOLERANCE;
    const [kind] = loadsByKind.find(([, loadsKg]) => loadsKg.some(isLoad)) ?? [];
    if (kind !== "dumbbells") return undefined;
    const endsKg = dumbbellBuild(exercise, profile, kg);
    return endsKg && `${exercise.dumbbells === 2 ? "Each" : "One"} dumbbell: ${endsLabel(endsKg, unit)}`;
  };
}

// "5 + 3 lb each end", "5 + 3 lb one end, 5 lb the other". The heavier end is first, so only the other can be empty
function endsLabel(endsKg: readonly [number[], number[]], unit: WeightUnit): string {
  const [heavier, lighter] = endsKg.map((platesKg) => platesKg.map((kg) => sizeInUnit(kg, unit)).join(" + "));
  if (!heavier) return "just the bar";
  if (heavier === lighter) return `${heavier} ${unit} each end`;
  return `${heavier} ${unit} one end, ${lighter ? `${lighter} ${unit} the other` : "nothing on the other"}`;
}
