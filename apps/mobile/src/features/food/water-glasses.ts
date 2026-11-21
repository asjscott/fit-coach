import { WATER_GLASS_ML } from "@fit/shared";
import { litres } from "../nutrition/day-rings";

// The Food tab's row of 250 ml glasses (spec #158 story 46): a glass per 250 ml of the target, or of what was drunk
// when that's more, filled for each 250 ml drunk
export function waterGlasses(waterMl: number, targetMl: number) {
  const filled = Math.floor(waterMl / WATER_GLASS_ML);
  return {
    count: Math.max(Math.ceil(targetMl / WATER_GLASS_ML), filled),
    filled,
    caption: `Water · ${litres(waterMl)} of ${litres(targetMl)} L · tap a glass`,
  };
}

// The day's new water total when a glass is tapped: an empty one adds a glass, a filled one takes one off. The phone
// sends the total, not the change, so a repeated request is harmless
export const tapGlass = (waterMl: number, { filled }: { filled: boolean }) =>
  Math.max(0, waterMl + (filled ? -WATER_GLASS_ML : WATER_GLASS_ML));
