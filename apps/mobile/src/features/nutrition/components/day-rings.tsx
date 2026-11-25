import type { Day } from "@fit/shared";
import { StyleSheet, View } from "react-native";
import { Pressable } from "@/components/pressable";
import { Ring } from "@/components/ring";
import { Text } from "@/components/text";
import { spacing } from "@/theme";
import { dayRings, type DayRing } from "../day-rings";

// Equal rings for the day (prototype variant J): all four on Today, and kcal, protein and fibre on the Food tab, which
// has its own water. Water is shown, never logged, here. With onPress, each ring is a button (Today's open Food)
export function DayRings({
  day,
  only,
  size = 64,
  onPress,
  pressHint,
}: {
  day: Day;
  only?: DayRing["key"][];
  size?: number;
  onPress?: () => void;
  // What pressing does, for screen readers
  pressHint?: string;
}) {
  const rings = dayRings(day).filter((ring) => !only || only.includes(ring.key));
  return (
    <View style={[styles.row, only ? styles.around : styles.between]}>
      {rings.map((ring) => {
        const content = (
          <>
            <Ring
              done={ring.progress}
              target={1}
              centre={ring.centre}
              color={ring.color}
              lap={ring.lap}
              size={size}
              stroke={size >= 72 ? 7 : 6}
            />
            <Text size="xs" color="muted" centered>
              {ring.caption}
            </Text>
          </>
        );
        return onPress ? (
          <Pressable
            key={ring.key}
            style={styles.ring}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={ring.label}
            accessibilityHint={pressHint}
          >
            {content}
          </Pressable>
        ) : (
          <View key={ring.key} style={styles.ring} accessible accessibilityLabel={ring.label}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing[2] },
  between: { justifyContent: "space-between" },
  around: { justifyContent: "space-around" },
  ring: { flex: 1, alignItems: "center", gap: 2 },
});
