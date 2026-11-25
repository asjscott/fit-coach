import { dumbbellEnds, DUMBBELL_PARTS, toKg, type BarAndPlates, type DumbbellEnds, type Exercise } from "@fit/shared";

// How to load one dumbbell: the plates on each end, the heavier end first, each end's heaviest plate first
export type DumbbellBuild = { kg: number; endsKg: [number[], number[]] };

// No way to load the ends so
const NONE = 0xffff;

// Two ends by their places among `weights`, the heavier first, as swapping them is the same load
const pairIndex = (heavy: number, light: number) => (heavy * (heavy + 1)) / 2 + light;
const indexOf = (a: number, b: number) => (a >= b ? pairIndex(a, b) : pairIndex(b, a));

// The place of each weight with one plate fewer, or −1
function placesWithout(parts: number, weights: readonly number[]): Int32Array {
  const places = new Map(weights.map((weight, place) => [weight, place]));
  return Int32Array.from(weights, (weight) => places.get(weight - parts) ?? -1);
}

// A layer before any size, then one after each, and each size's placesWithout
type Fewest = { layers: Uint16Array[]; withouts: Int32Array[] };

// The fewest plates that make each pair of ends: before any size, then with each size too, biggest first. One plate at
// a time, heaviest pair first, so that a pass adds each plate once. Pairs further apart than the plates left could even
// out are skipped, so never end up in a build
function fewestPlates({ sizes, weights, maxDifference, maxPlatesParts }: DumbbellEnds): Fewest {
  let fewest = new Uint16Array(pairIndex(weights.length, 0)).fill(NONE);
  fewest[0] = 0;
  const layers = [fewest];
  let left = sizes.reduce((sum, { parts, count }) => sum + parts * count, 0);
  let added = 0;
  const withouts = sizes.map(({ parts }) => placesWithout(parts, weights));
  for (const [size, { parts, count }] of sizes.entries()) {
    const without = withouts[size]!;
    fewest = fewest.slice();
    for (let plate = 0; plate < count; plate++) {
      left -= parts;
      added += parts;
      const most = Math.min(added, maxPlatesParts);
      for (let heavy = weights.length - 1; heavy >= 0; heavy--) {
        const heavyParts = weights[heavy]!;
        const heavyWithout = without[heavy]!;
        const base = pairIndex(heavy, 0);
        for (let light = heavy; light >= 0; light--) {
          const lightParts = weights[light]!;
          if (heavyParts + lightParts > most) continue;
          if (heavyParts - lightParts > left + maxDifference) break;
          let best = fewest[base + light]!;
          if (heavyWithout >= 0) {
            const from = fewest[indexOf(heavyWithout, light)]! + 1;
            if (from < best) best = from;
          }
          const lightWithout = without[light]!;
          if (lightWithout >= 0) {
            const from = fewest[base + lightWithout]! + 1;
            if (from < best) best = from;
          }
          fewest[base + light] = best;
        }
      }
    }
    layers.push(fewest);
  }
  return { layers, withouts };
}

// The plates on each end of a pair made with its fewest plates, found by taking each size off again, smallest first.
// Of ways with as many plates, the one with the fewest of the smallest
function endsOf(heavy: number, light: number, { sizes }: DumbbellEnds, { layers, withouts }: Fewest) {
  const ends: [number[], number[]] = [[], []];
  let first = heavy;
  let second = light;
  for (let size = sizes.length - 1; size >= 0; size--) {
    const { parts, count } = sizes[size]!;
    const without = withouts[size]!;
    const before = layers[size]!;
    const plates = layers[size + 1]![indexOf(first, second)]!;
    let taken: { plates: number; first: number; second: number; onFirst: number } | undefined;
    for (let onFirst = 0, a = first; onFirst <= (taken?.plates ?? count) && a >= 0; onFirst++, a = without[a]!) {
      const most = Math.min(count, taken ? taken.plates - 1 : count);
      for (let onSecond = 0, b = second; onFirst + onSecond <= most && b >= 0; onSecond++, b = without[b]!) {
        const off = onFirst + onSecond;
        if (before[indexOf(a, b)] !== plates - off) continue;
        taken = { plates: off, first: a, second: b, onFirst };
        break;
      }
    }
    if (!taken) throw new Error("No plates give this load");
    ends[0].unshift(...Array<number>(taken.onFirst).fill(parts));
    ends[1].unshift(...Array<number>(taken.plates - taken.onFirst).fill(parts));
    first = taken.first;
    second = taken.second;
  }
  // Of two ends that weigh the same, the one with the heavier plate first
  const differs = ends[0].findIndex((plate, i) => plate !== ends[1][i]);
  const swap = heavy === light && differs >= 0 && ends[1][differs]! > ends[0][differs]!;
  return swap ? ([ends[1], ends[0]] as const) : ends;
}

function buildsOf(dumbbells: BarAndPlates, taken: 1 | 2): DumbbellBuild[] {
  const ends = dumbbellEnds(dumbbells, taken);
  // Dumbbells the schema refuses
  if (!ends) return [];
  const { unit, barParts, weights, maxDifference, maxPlatesParts } = ends;
  const fewest = fewestPlates(ends);
  const made = fewest.layers.at(-1)!;
  // The most even pair of ends for each load: the first found, as for one load a lighter heavy end is more even
  const mostEven = new Map<number, [number, number]>();
  weights.forEach((heavyParts, heavy) => {
    for (let light = heavy; light >= 0; light--) {
      const lightParts = weights[light]!;
      const total = heavyParts + lightParts;
      if (heavyParts - lightParts > maxDifference) break;
      if (total > maxPlatesParts || made[pairIndex(heavy, light)] === NONE || mostEven.has(total)) continue;
      mostEven.set(total, [heavy, light]);
    }
  });
  const inKg = (parts: number) => toKg(parts / DUMBBELL_PARTS, unit);
  return [...mostEven]
    .sort(([a], [b]) => a - b)
    .map(([total, [heavy, light]]) => {
      const [heavyEnd, lightEnd] = endsOf(heavy, light, ends, fewest);
      return { kg: inKg(barParts + total), endsKg: [heavyEnd.map(inKg), lightEnd.map(inKg)] };
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
