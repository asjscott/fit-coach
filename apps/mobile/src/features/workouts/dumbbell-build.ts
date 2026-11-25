import { dumbbellBuild, loadsByKindKg } from "@fit/engines";
import { fromKg, loadInUnit, type EquipmentProfile, type WeightUnit } from "@fit/shared";
import { sizeInUnit } from "../equipment/loads";
import { libraryExercise } from "./library";
import { parseField } from "./set-entry";

// The typed load → how to build it with bar-and-plates dumbbells (#182), or undefined when they don't make it
export type BuildLabel = (load: string) => string | undefined;

// A typed load is the same load despite the rounding error of its kg
const SAME_LOAD_TOLERANCE = 1e-6;

// A load is the one typed when it's shown as it, so the stepper's 5.5 is a 5.25 lb dumbbell, or is exactly it. One that
// two kinds of equipment have is on the kind the stepper steps it on (#149). Finds the loads once for all those typed
export function dumbbellBuildLabel(slug: string, profile: EquipmentProfile | undefined, unit: WeightUnit): BuildLabel {
  const exercise = libraryExercise(slug);
  if (!exercise || profile?.loads.dumbbells?.kind !== "bar_and_plates") return () => undefined;
  const loadsByKind = [...loadsByKindKg(exercise, profile)];

  return (text) => {
    const load = parseField(text);
    const apart = (kg: number) => Math.abs(fromKg(kg, unit) - load);
    const isTyped = (kg: number) => loadInUnit(kg, unit) === load || apart(kg) < SAME_LOAD_TOLERANCE;
    const [kind, loadsKg] = loadsByKind.find(([, loadsKg]) => loadsKg.some(isTyped)) ?? [];
    if (kind !== "dumbbells" || !loadsKg) return undefined;
    const kg = loadsKg.filter(isTyped).reduce((best, each) => (apart(each) < apart(best) ? each : best));
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
