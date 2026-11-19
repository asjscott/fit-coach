import type { Day } from "@fit/shared";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Pressable } from "@/components/pressable";
import { Text } from "@/components/text";
import { radii, spacing, useTheme } from "@/theme";
import { useWater } from "../hooks/use-water";
import { tapGlass, waterGlasses } from "../water-glasses";

// The day's 250 ml glasses under the rings (prototype variant J, spec #158 story 46). An empty glass adds 250 ml and a
// filled one takes 250 ml off. A tap fills or empties straight away; the writes go one after another, each the new
// total, and the day reloads once the last has landed. `onSaved` reloads the day
export function WaterGlasses({ day, onSaved }: { day: Day; onSaved: () => void }) {
  const { colors } = useTheme();
  const setWater = useWater();
  // What the taps have made the water, until the day reloads with it
  const [tapped, setTapped] = useState<{ waterMl: number; over: Day } | null>(null);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const waterMl = tapped?.over === day ? tapped.waterMl : day.waterMl;
  const { count, filled, caption } = waterGlasses(waterMl, day.targets.waterMl);

  const tap = (isFilled: boolean) => {
    const next = tapGlass(waterMl, { filled: isFilled });
    setTapped({ waterMl: next, over: day });
    pending.current += 1;
    writes.current = writes.current.then(async () => {
      const ok = await setWater(day.date, next);
      pending.current -= 1;
      // A failed write shows the day as the server has it
      if (!ok) setTapped(null);
      if (!pending.current) onSaved();
    });
  };

  return (
    <View style={styles.water}>
      <Text size="xs" color="muted" weight="semiBold">
        {caption}
      </Text>
      <View style={styles.glasses}>
        {Array.from({ length: count }, (_, i) => {
          const isFilled = i < filled;
          return (
            <Pressable
              key={i}
              onPress={() => tap(isFilled)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={isFilled ? "Take off a glass of water" : "Add a glass of water"}
              style={[
                styles.glass,
                { borderColor: colors.accent, backgroundColor: isFilled ? colors.accent : "transparent" },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  water: { gap: spacing[2] },
  glasses: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  glass: { width: 22, height: 30, borderWidth: 2, borderRadius: radii.xs },
});
