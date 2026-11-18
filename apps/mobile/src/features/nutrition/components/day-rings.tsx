import type { Day } from "@fit/shared";
import { StyleSheet, View } from "react-native";
import { Ring } from "@/components/ring";
import { Text } from "@/components/text";
import { spacing } from "@/theme";
import { dayRings } from "../day-rings";

const RING_SIZE = 64;

// Four equal rings for the day (prototype variant J): kcal left, protein left, fibre and water. Water is shown, never
// logged, here. Tapping them will open the Food tab once it exists
export function DayRings({ day }: { day: Day }) {
  return (
    <View style={styles.row}>
      {dayRings(day).map((ring) => (
        <View key={ring.key} style={styles.ring} accessible accessibilityLabel={ring.label}>
          <Ring done={ring.progress} target={1} centre={ring.centre} size={RING_SIZE} />
          <Text size="xs" color="muted" centered>
            {ring.caption}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing[2] },
  ring: { flex: 1, alignItems: "center", gap: 2 },
});
