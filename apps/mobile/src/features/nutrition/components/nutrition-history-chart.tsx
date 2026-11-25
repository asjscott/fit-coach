import { StyleSheet, View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { radii, spacing, useTheme } from "@/theme";
import type { nutritionHistoryChart } from "../nutrition-history";
import { onPhone } from "../weigh-in";

const HEIGHT = 200;
// The axis's numbers, right of the bars
const GUTTER = 48;
const BAR = 24;
// A day logged with next to nothing still shows
const MIN_BAR = 2;

const percent = (share: number) => `${share * 100}%` as const;
const narrowDay = (date: string) => onPhone(date).toLocaleDateString([], { weekday: "narrow" });

// Seven bars, Monday to Sunday, over the target range's band, with the daily average as a dotted line (spec #188
// stories 20 to 24). Each bar's whole slot is its button, and says the day in words
export function NutritionHistoryChart({
  chart: { bars, band, ticks, average },
  selected,
  onSelect,
}: {
  chart: ReturnType<typeof nutritionHistoryChart>;
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        aria-hidden
        style={styles.plot}
      >
        {band.map((step) => (
          <View
            key={step.left}
            style={[
              styles.band,
              {
                left: percent(step.left),
                width: percent(step.width),
                bottom: percent(step.bottom),
                height: percent(step.height),
                backgroundColor: colors.line,
                borderColor: colors.inputBorder,
              },
            ]}
          />
        ))}
        {ticks.map(({ at, label }) => (
          <View key={at} style={[styles.level, { bottom: percent(at) }]}>
            <View style={[styles.grid, { backgroundColor: colors.line }]} />
            <Text size="xs" color="subtle" style={styles.number}>
              {label}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.bars}>
        {bars.map((bar) => (
          <Pressable
            key={bar.date}
            onPress={() => onSelect(bar.date)}
            accessibilityRole="button"
            accessibilityLabel={bar.label}
            accessibilityState={{ selected: selected === bar.date }}
            style={styles.slot}
          >
            <View style={styles.column}>
              {bar.color ? (
                <View
                  style={[
                    styles.bar,
                    { height: Math.max(bar.height * HEIGHT, MIN_BAR), backgroundColor: colors[bar.color] },
                  ]}
                />
              ) : null}
            </View>
            <View style={[styles.day, selected === bar.date ? { backgroundColor: colors.accentSoft } : null]}>
              <Text
                size="xs"
                weight={bar.isToday || selected === bar.date ? "bold" : "medium"}
                color={selected === bar.date ? "accent" : bar.isToday ? "text" : "muted"}
              >
                {narrowDay(bar.date)}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
      {average ? (
        <View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          aria-hidden
          style={styles.plot}
        >
          <View style={[styles.level, { bottom: percent(average.at) }]}>
            <Svg width="100%" height={2}>
              <Line x1={0} y1={1} x2="100%" y2={1} stroke={colors.text} strokeWidth={2} strokeDasharray="2 4" />
            </Svg>
            <Text size="xs" weight="bold" style={styles.number}>
              {average.number}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { position: "absolute", top: spacing[2], left: 0, right: GUTTER, height: HEIGHT },
  // Its edges are what each bar is read against, so they stand out more than its fill
  band: { position: "absolute", borderTopWidth: 1, borderBottomWidth: 1 },
  // Its line's middle on the level, whose number hangs in the gutter
  level: { position: "absolute", left: 0, right: 0, height: 2, marginBottom: -1, justifyContent: "center" },
  grid: { height: StyleSheet.hairlineWidth },
  number: { position: "absolute", left: "100%", width: GUTTER, paddingLeft: spacing[2] },
  bars: { flexDirection: "row", marginRight: GUTTER },
  slot: {
    flex: 1,
    alignItems: "center",
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
    gap: spacing[1],
    borderRadius: radii.sm,
  },
  day: { paddingHorizontal: spacing[2], borderRadius: radii.pill },
  column: { height: HEIGHT, width: "64%", maxWidth: BAR, justifyContent: "flex-end" },
  bar: { borderTopLeftRadius: radii.xs, borderTopRightRadius: radii.xs },
});
