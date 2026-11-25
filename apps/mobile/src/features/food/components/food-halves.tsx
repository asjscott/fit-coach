import { Segmented } from "@/components/segmented";

export type FoodHalf = "today" | "ideas";

const HALVES: { value: FoodHalf; label: string }[] = [
  { value: "today", label: "Today so far" },
  { value: "ideas", label: "Ideas and recent" },
];

// The Food tab's two-part control at the top (prototype variant J): Today so far, and Ideas and recent
export function FoodHalves({ half, onChange }: { half: FoodHalf; onChange: (half: FoodHalf) => void }) {
  return <Segmented options={HALVES} value={half} onChange={onChange} />;
}
