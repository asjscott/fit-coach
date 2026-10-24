import type { Set } from "@fit/shared";
import { HStack } from "@/components/stack";
import { Text } from "@/components/text";
import { describeSet } from "../format";

// A Set's number and values, e.g. "2  20 kg × 10 per side"; highlighted while being edited
export function SetRow({
  set,
  index,
  unilateral = false,
  highlighted = false,
}: {
  set: Set;
  index: number;
  unilateral?: boolean;
  highlighted?: boolean;
}) {
  return (
    <HStack spacing={3}>
      <Text weight="semiBold" color={highlighted ? "orange" : "textSubtle"}>
        {index + 1}
      </Text>
      <Text>
        {describeSet(set)}
        {unilateral ? " per side" : ""}
      </Text>
    </HStack>
  );
}
