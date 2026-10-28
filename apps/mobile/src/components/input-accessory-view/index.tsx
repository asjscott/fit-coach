import { InputAccessoryView, Keyboard, Platform, StyleSheet, View } from "react-native";
import { radii, spacing, useThemedStyles, type Colors } from "@/theme";
import { Icon } from "../icons";
import { Pressable } from "../pressable";

export { InputAccessoryView };

// iOS number pads have no return key; this bar gives every field a way to close the keyboard.
// Attach to an input with inputAccessoryViewID={nativeID}.
// A round tick floating over the page, as on iOS 26's own keyboard toolbar, rather than a strip across it (#56).
// The accessory leaves a screen-sized placeholder where it's rendered, which would take the touches on what comes
// before it in the row, such as a Set stepper's − (#47); the wrapper keeps it out of layout and touch handling.
export function KeyboardDoneBar({ nativeID }: { nativeID: string }) {
  const styles = useThemedStyles(createStyles);
  if (Platform.OS !== "ios") return null;

  return (
    <View pointerEvents="none" style={styles.anchor}>
      <InputAccessoryView nativeID={nativeID} backgroundColor="transparent">
        <View style={styles.bar}>
          <Pressable
            onPress={Keyboard.dismiss}
            accessibilityRole="button"
            accessibilityLabel="Done"
            style={styles.button}
          >
            <Icon name="check" size={22} color="text" />
          </Pressable>
        </View>
      </InputAccessoryView>
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    anchor: { position: "absolute", width: 0, height: 0 },
    bar: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: spacing[3], paddingBottom: spacing[2] },
    button: {
      width: 44,
      height: 44,
      borderRadius: radii.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      shadowColor: colors.shadow,
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
  });
