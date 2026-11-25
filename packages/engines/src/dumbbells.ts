import { fromKg, toKg, WeightUnit, type BarAndPlates, type Exercise } from "@fit/shared";

// How to load one dumbbell: the plates on each end, the heavier end first, each end's heaviest plate first
export type DumbbellBuild = { kg: number; endsKg: [number[], number[]] };

// The furthest apart a dumbbell's two ends can be and still be lifted comfortably (#181)
const MAX_END_DIFFERENCE_KG = 1.5;
// The heaviest dumbbell worth listing, as the heaviest barbell is
const MAX_DUMBBELL_KG = 100;

// Sums are whole numbers of these, so that sizes typed to the hundredth add up exactly
const PARTS = 1000;
const inParts = (kg: number, unit: WeightUnit) => Math.round(fromKg(kg, unit) * PARTS);
const isWholeParts = (kg: number, unit: WeightUnit) =>
  Math.abs(fromKg(kg, unit) * PARTS - inParts(kg, unit)) < 1e-6 * PARTS;

// One size of plate, in parts
type Size = { parts: number; count: number };

// A way to load the two ends with the sizes so far, as a chain of what each size adds
type Split = { plates: number; added?: { before: Split; parts: number; heavy: number; light: number } };

// The load's parts and how far apart its ends are → the fewest plates that do it
type Splits = Map<number, Map<number, Split>>;

// Every split of the plates, biggest size first. The heavier end is always first, as swapping the ends is the same
// split. A split left further apart than the remaining plates could even out is dropped
function splitsOf(sizes: readonly Size[], maxDifference: number, maxParts: number): Splits {
  let splits: Splits = new Map([[0, new Map([[0, { plates: 0 }]])]]);
  let remaining = sizes.reduce((sum, { parts, count }) => sum + parts * count, 0);
  for (const { parts, count } of sizes) {
    remaining -= parts * count;
    const next: Splits = new Map();
    for (const [sum, byDifference] of splits) {
      for (const [difference, before] of byDifference) {
        for (let plates = 0; plates <= count && sum + plates * parts <= maxParts; plates++) {
          for (let heavy = 0; heavy <= plates; heavy++) {
            const light = plates - heavy;
            const apart = Math.abs(difference + (heavy - light) * parts);
            if (apart > remaining + maxDifference) continue;
            const total = sum + plates * parts;
            const onTotal = next.get(total) ?? next.set(total, new Map()).get(total)!;
            const fewest = onTotal.get(apart)?.plates ?? Infinity;
            if (before.plates + plates >= fewest) continue;
            const added = plates ? { before, parts, heavy, light } : before.added;
            onTotal.set(apart, { plates: before.plates + plates, added });
          }
        }
      }
    }
    splits = next;
  }
  return splits;
}

// The plates on each end of a split, replaying what each size added in the order it was added
function endsOf(split: Split): [number[], number[]] {
  const steps: NonNullable<Split["added"]>[] = [];
  for (let step = split.added; step; step = step.before.added) steps.unshift(step);
  let ends: [number[], number[]] = [[], []];
  for (const { parts, heavy, light } of steps) {
    ends[0].push(...Array<number>(heavy).fill(parts));
    ends[1].push(...Array<number>(light).fill(parts));
    ends = heavierFirst(ends);
  }
  return ends;
}

const sumOf = (plates: readonly number[]) => plates.reduce((sum, plate) => sum + plate, 0);

// Ends of the same weight keep their order
const heavierFirst = ([a, b]: [number[], number[]]): [number[], number[]] => (sumOf(b) > sumOf(a) ? [b, a] : [a, b]);

// Sizes entered more than once counted together, in parts, biggest first. For an Exercise that takes two dumbbells,
// half of each count, as both dumbbells match
function sizesFor({ plates }: BarAndPlates, taken: 1 | 2, unit: WeightUnit): Size[] {
  const counts = new Map<number, number>();
  for (const { kg, count } of plates) {
    const parts = inParts(kg, unit);
    counts.set(parts, (counts.get(parts) ?? 0) + count);
  }
  return [...counts]
    .map(([parts, count]) => ({ parts, count: Math.floor(count / taken) }))
    .filter(({ parts, count }) => parts > 0 && count > 0)
    .sort((a, b) => b.parts - a.parts);
}

function buildsOf(dumbbells: BarAndPlates, taken: 1 | 2): DumbbellBuild[] {
  const { barKg, plates } = dumbbells;
  const sized = [barKg, ...plates.map(({ kg }) => kg)];
  // The unit the sizes are in, as for a barbell; a mix of units is summed in kg
  const unit = WeightUnit.options.find((unit) => sized.every((kg) => isWholeParts(kg, unit))) ?? "kg";
  const bar = inParts(barKg, unit);
  const maxDifference = Math.floor(fromKg(MAX_END_DIFFERENCE_KG, unit) * PARTS);
  const maxParts = Math.max(0, inParts(MAX_DUMBBELL_KG, unit) - bar);
  const inKg = (parts: number) => toKg(parts / PARTS, unit);

  return [...splitsOf(sizesFor(dumbbells, taken, unit), maxDifference, maxParts)]
    .sort(([a], [b]) => a - b)
    .flatMap(([sum, byDifference]) => {
      const mostEven = Math.min(...byDifference.keys());
      const split = byDifference.get(mostEven);
      if (!split || mostEven > maxDifference) return [];
      const [heavyEnd, lightEnd] = endsOf(split);
      return [{ kg: inKg(bar + sum), endsKg: [heavyEnd.map(inKg), lightEnd.map(inKg)] }];
    });
}

// Worked out once for each set of dumbbells, as planning asks for every dumbbell Exercise's loads
const known = new WeakMap<BarAndPlates, Map<1 | 2, DumbbellBuild[]>>();

// Every load of one dumbbell that bar and plates make for an Exercise taking this many dumbbells, lightest first: those
// whose plates split over two ends close enough. Each has its most even split, then the fewest plates
export function dumbbellBuilds(dumbbells: BarAndPlates, taken: Exercise["dumbbells"] = 1): DumbbellBuild[] {
  const byTaken = known.get(dumbbells) ?? known.set(dumbbells, new Map()).get(dumbbells)!;
  const builds = byTaken.get(taken) ?? buildsOf(dumbbells, taken);
  byTaken.set(taken, builds);
  return builds;
}
