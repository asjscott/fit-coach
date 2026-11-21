import { LOGGABLE_DAYS } from "@fit/engines";
import { StyleSheet, View } from "react-native";
import { Icon } from "@/components/icons";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { spacing } from "@/theme";
import { dayStepLabel } from "../today-so-far";

// Steps between today and the 6 days before it, the days Food Entries can be logged into (spec #158 story 44)
export function DayStepper({ daysBefore, onChange }: { daysBefore: number; onChange: (daysBefore: number) => void }) {
  const oldest = daysBefore >= LOGGABLE_DAYS - 1;
  const newest = daysBefore <= 0;
  return (
    <View style={styles.row}>
      <Pressable
        disabled={oldest}
        onPress={() => onChange(daysBefore + 1)}
        style={styles.step}
        accessibilityRole="button"
        accessibilityLabel="The day before"
        hitSlop={8}
      >
        <Icon name="chevronLeft" color={oldest ? "subtle" : "accent"} size={22} />
      </Pressable>
      <Text weight="semiBold" accessibilityLiveRegion="polite">
        {dayStepLabel(daysBefore)}
      </Text>
      <Pressable
        disabled={newest}
        onPress={() => onChange(daysBefore - 1)}
        style={styles.step}
        accessibilityRole="button"
        accessibilityLabel="The day after"
        hitSlop={8}
      >
        <Icon name="chevronRight" color={newest ? "subtle" : "accent"} size={22} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  step: { padding: spacing[1] },
});
