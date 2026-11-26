import { StyleSheet, useWindowDimensions, View } from "react-native";
import { TABULAR, Text } from "@/components/text";
import { columnMaxWidth, fonts, spacing } from "@/theme";

// A digit's width as a share of the font size, with the colon counted as one
const CHARACTER_WIDTH = 0.6;

// The rest's or the hold's clock, as big as the screen takes, under what it counts. `announce` has screen readers read
// the heading out as it changes, on Android and the web
export function BigClock({
  heading,
  clock,
  label,
  announce = false,
}: {
  heading: string;
  clock: string;
  label: string;
  announce?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const fontSize = Math.min(
    (Math.min(width, columnMaxWidth) - 2 * spacing[5]) / (clock.length * CHARACTER_WIDTH),
    height * 0.35,
  );

  return (
    <View>
      <Text centered color="muted" size="xl" accessibilityLiveRegion={announce ? "polite" : undefined}>
        {heading}
      </Text>
      <Text
        centered
        numberOfLines={1}
        allowFontScaling={false}
        accessibilityRole="timer"
        accessibilityLabel={label}
        style={[styles.clock, { fontSize, lineHeight: fontSize * 1.15 }]}
      >
        {clock}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  clock: { fontFamily: fonts.bold, fontVariant: TABULAR },
});
