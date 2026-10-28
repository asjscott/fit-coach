import type { ReactNode } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { spacing, useTheme } from "@/theme";
import { KeyboardAvoidingView } from "../keyboard-avoiding-view";
import { KeyboardAwareScrollView } from "../keyboard-aware-scroll-view";

export type ScreenProps = {
  children: ReactNode;
  // "screen" scrolls the children; "content" means they bring their own scroll view or list, which dismisses the
  // keyboard itself and mustn't sit in tap-to-dismiss's Pressable, as that takes its drags (#63)
  scroll?: "screen" | "content";
  // Lift content above the keyboard on non-scrolling screens with inputs
  keyboardAvoiding?: boolean;
  padded?: boolean;
  // Drop "top" on screens that show a navigation header
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
};

// Page wrapper: theme background, safe areas, standard padding and keyboard handling
export function Screen({
  children,
  scroll,
  keyboardAvoiding = false,
  padded = true,
  edges = ["top", "bottom"],
  contentStyle,
}: ScreenProps) {
  const { colors } = useTheme();
  const content = [padded && styles.padded, contentStyle];

  const body =
    scroll === "screen" ? (
      <KeyboardAwareScrollView contentContainerStyle={[styles.scrollContent, content]}>
        {children}
      </KeyboardAwareScrollView>
    ) : scroll === "content" || Platform.OS === "web" ? (
      // On web there's no on-screen keyboard to dismiss, and a click on an input would bubble up here and blur it
      <View style={[styles.fill, content]}>{children}</View>
    ) : (
      // Tapping empty space dismisses the keyboard
      <Pressable style={[styles.fill, content]} onPress={Keyboard.dismiss} accessible={false}>
        {children}
      </Pressable>
    );

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]} edges={edges}>
      {keyboardAvoiding && !scroll ? <KeyboardAvoidingView>{body}</KeyboardAvoidingView> : body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  padded: { paddingHorizontal: spacing[6], paddingVertical: spacing[4] },
});
