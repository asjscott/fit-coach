import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, View } from "react-native";
import { radii, spacing, useTheme, useThemedStyles, type Colors } from "@/theme";
import { Icon } from "../icons";

export { InputAccessoryView };

// Some iOS 26 betas lack the glass API and crash without the first check
const canUseGlass = Platform.OS === "ios" && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

// iOS number pads have no return key; this bar gives every field a way to close the keyboard.
// Attach to an input with inputAccessoryViewID={nativeID}.
// A round Liquid Glass tick floating over the page, like the header's back button, rather than a strip across it
// (#56); a plain round button before iOS 26.
// The accessory leaves a screen-sized placeholder where it's rendered, which would take the touches on what comes
// before it in the row, such as a Set stepper's − (#47); the wrapper keeps it out of layout and touch handling.
export function KeyboardDoneBar({ nativeID }: { nativeID: string }) {
  const { scheme } = useTheme();
  const styles = useThemedStyles(createStyles);
  if (Platform.OS !== "ios") return null;

  const tick = <Icon name="check" size={22} color="text" />;

  return (
    <View pointerEvents="none" style={styles.anchor}>
      <InputAccessoryView nativeID={nativeID} backgroundColor="transparent">
        <View style={styles.bar}>
          {/* Glass gives its own press feedback, and dimming it would stop it rendering */}
          <Pressable
            onPress={Keyboard.dismiss}
            accessibilityRole="button"
            accessibilityLabel="Done"
            style={({ pressed }) => pressed && !canUseGlass && styles.pressed}
          >
            {canUseGlass ? (
              <GlassView isInteractive colorScheme={scheme} style={styles.button}>
                {tick}
              </GlassView>
            ) : (
              <View style={[styles.button, styles.solid]}>{tick}</View>
            )}
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
    button: { width: 44, height: 44, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
    solid: {
      backgroundColor: colors.surface,
      shadowColor: colors.shadow,
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    pressed: { opacity: 0.8 },
  });
