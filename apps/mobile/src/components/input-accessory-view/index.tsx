import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, View } from "react-native";
import { spacing, useThemedStyles, type Colors } from "@/theme";
import { Text } from "../text";

export { InputAccessoryView };

// iOS number pads have no return key; this bar gives every field a way to close the keyboard.
// Attach to an input with inputAccessoryViewID={nativeID}.
export function KeyboardDoneBar({ nativeID }: { nativeID: string }) {
  const styles = useThemedStyles(createStyles);
  if (Platform.OS !== "ios") return null;

  return (
    <InputAccessoryView nativeID={nativeID}>
      <View style={styles.bar}>
        <Pressable onPress={Keyboard.dismiss} hitSlop={spacing[2]} accessibilityRole="button">
          <Text size="sm" weight="semiBold" color="orange">
            Done
          </Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    bar: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      backgroundColor: colors.surfaceRaised,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
  });
