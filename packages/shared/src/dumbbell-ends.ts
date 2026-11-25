import { fromKg, WeightUnit } from "./units";

// How bar-and-plates dumbbells' loads are worked out, and how much working out they take: the engine does it and the
// schema bounds it, so they can't disagree

type BarAndPlatesSizes = { barKg: number; plates: readonly { kg: number; count: number }[] };

// The furthest apart a dumbbell's two ends can be and still be lifted comfortably (#181)
const MAX_END_DIFFERENCE_KG = 1.5;
// The heaviest dumbbell worth listing, as the heaviest barbell is
const MAX_DUMBBELL_KG = 100;

// Sums are whole numbers of these, so that sizes typed to the thousandth add up exactly
export const DUMBBELL_PARTS = 1000;
const inParts = (kg: number, unit: WeightUnit) => Math.round(fromKg(kg, unit) * DUMBBELL_PARTS);
const isWholeParts = (kg: number, unit: WeightUnit) =>
  Math.abs(fromKg(kg, unit) * DUMBBELL_PARTS - inParts(kg, unit)) < 1e-6 * DUMBBELL_PARTS;

// Every pair of end weights is tried with every plate: about 150 ms and 20 MB at most on a Mac. Sizes to the nearest
// 0.25 of either unit are always within it, whatever their counts
const MAX_STEPS = 50_000_000;
const MAX_END_WEIGHTS = 1500;

export type DumbbellEnds = {
  unit: WeightUnit;
  barParts: number;
  maxDifference: number;
  // All the plates on both ends
  maxPlatesParts: number;
  // Biggest first, and no more of a size than one dumbbell can hold
  sizes: { parts: number; count: number }[];
  // Every weight the plates on one end can come to, lightest first
  weights: number[];
};

// The plates one dumbbell can use and what its ends can weigh, or null when there are too many ways to load it to work
// out. `taken` is how many dumbbells share the plates: each matches, so has that share of each count
export function dumbbellEnds({ barKg, plates }: BarAndPlatesSizes, taken: 1 | 2): DumbbellEnds | null {
  const sized = [barKg, ...plates.map(({ kg }) => kg)];
  // The unit the sizes are in, as for a barbell; a mix of units is summed in kg
  const unit = WeightUnit.options.find((unit) => sized.every((kg) => isWholeParts(kg, unit))) ?? "kg";
  const barParts = inParts(barKg, unit);
  const maxDifference = Math.floor(fromKg(MAX_END_DIFFERENCE_KG, unit) * DUMBBELL_PARTS);
  const maxPlatesParts = Math.max(0, inParts(MAX_DUMBBELL_KG, unit) - barParts);
  const maxEnd = Math.floor((maxPlatesParts + maxDifference) / 2);

  const counts = new Map<number, number>();
  for (const { kg, count } of plates) {
    const parts = inParts(kg, unit);
    counts.set(parts, (counts.get(parts) ?? 0) + count);
  }
  const sizes = [...counts]
    .map(([parts, count]) => ({
      parts,
      count: Math.min(Math.floor(count / taken), Math.floor(maxPlatesParts / parts)),
    }))
    .filter(({ parts, count }) => parts > 0 && parts <= maxEnd && count > 0)
    .sort((a, b) => b.parts - a.parts);

  const weights = new Set([0]);
  for (const { parts, count } of sizes) {
    for (const weight of [...weights]) {
      for (let sum = weight + parts, n = 1; n <= count && sum <= maxEnd; sum += parts, n++) weights.add(sum);
      // Few enough to stay quick while they're found, too
      if (weights.size > MAX_END_WEIGHTS) return null;
    }
  }
  const pairs = (weights.size * (weights.size + 1)) / 2;
  if (pairs * sizes.reduce((sum, { count }) => sum + count, 0) > MAX_STEPS) return null;
  return { unit, barParts, maxDifference, maxPlatesParts, sizes, weights: [...weights].sort((a, b) => a - b) };
}
