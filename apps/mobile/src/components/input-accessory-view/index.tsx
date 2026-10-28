import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, View } from "react-native";
import { spacing, useThemedStyles, type Colors } from "@/theme";
import { Text } from "../text";

export { InputAccessoryView };

// iOS number pads have no return key; this bar gives every field a way to close the keyboard.
// Attach to an input with inputAccessoryViewID={nativeID}.
// The accessory moves its bar onto the keyboard but leaves a screen-sized placeholder where it's rendered, which on
// iOS would take every touch on what comes before it in the input's row (the − of a Set stepper, #47). The
// wrapper keeps that placeholder out of the layout and out of touch handling.
export function KeyboardDoneBar({ nativeID }: { nativeID: string }) {
  const styles = useThemedStyles(createStyles);
  if (Platform.OS !== "ios") return null;

  return (
    <View pointerEvents="none" style={styles.anchor}>
      <InputAccessoryView nativeID={nativeID}>
        <View style={styles.bar}>
          <Pressable onPress={Keyboard.dismiss} hitSlop={spacing[2]} accessibilityRole="button">
            <Text size="sm" weight="semiBold" color="accent">
              Done
            </Text>
          </Pressable>
        </View>
      </InputAccessoryView>
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    anchor: { position: "absolute", width: 0, height: 0 },
    bar: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
  });
