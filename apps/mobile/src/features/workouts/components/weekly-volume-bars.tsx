import type { WeekVolume } from "@fit/engines";
import { View } from "react-native";
import { SectionLabel } from "@/components/section-label";
import { Text } from "@/components/text";
import { radii, spacing, useTheme } from "@/theme";
import { volumeLabel } from "../format";
import { useWeightUnit } from "@/features/user/current-user-provider";

const BARS_HEIGHT = 88;
// An empty week still shows a sliver, so the 8 weeks read as a row
const EMPTY_BAR_HEIGHT = 4;

// One bar per week, oldest first, scaled to the biggest week; this week (the last) in the accent
export function WeeklyVolumeBars({ weeks }: { weeks: WeekVolume[] }) {
  const unit = useWeightUnit();
  const { colors } = useTheme();
  const max = Math.max(...weeks.map((week) => week.volumeKg));
  const thisWeek = weeks.at(-1)?.volumeKg ?? 0;

  return (
    <View>
      <SectionLabel right={`${weeks.length} weeks`} style={{ marginBottom: spacing[3] }}>
        Weekly Volume
      </SectionLabel>
      <View
        accessible
        accessibilityLabel={`Weekly Volume, oldest first: ${weeks.map((week) => `${volumeLabel(week.volumeKg, unit)} ${unit}`).join(", ")}`}
        style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing[2], height: BARS_HEIGHT }}
      >
        {weeks.map((week, i) => (
          <View
            key={week.start.getTime()}
            style={{
              flex: 1,
              height: max > 0 ? Math.max((week.volumeKg / max) * BARS_HEIGHT, EMPTY_BAR_HEIGHT) : EMPTY_BAR_HEIGHT,
              borderRadius: radii.sm,
              backgroundColor: i === weeks.length - 1 ? colors.accent : colors.raised,
            }}
          />
        ))}
      </View>
      <Text size="sm" color="muted" style={{ marginTop: spacing[2] }}>
        {volumeLabel(thisWeek, unit)} {unit} this week so far
      </Text>
    </View>
  );
}
