import { use, type ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { HeaderHeightContext } from "expo-router/react-navigation";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { spacing, useThemedStyles, type Colors } from "@/theme";

export type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  // Lift content above the keyboard on non-scrolling screens with inputs
  keyboardAvoiding?: boolean;
  padded?: boolean;
  // Drop "top" on screens that show a navigation header
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  scroll = false,
  keyboardAvoiding = false,
  padded = true,
  edges = ["top", "bottom"],
  contentStyle,
}: ScreenProps) {
  const styles = useThemedStyles(createStyles);
  const headerHeight = use(HeaderHeightContext) ?? 0;
  const content = [padded && styles.padded, contentStyle];

  // Android resizes the window for the keyboard itself; iOS needs help.
  // Scroll screens use native keyboard insets, which also scroll the focused input into view.
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, content]}
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    // Tapping empty space dismisses the keyboard
    <Pressable style={[styles.fill, content]} onPress={Keyboard.dismiss} accessible={false}>
      {children}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {keyboardAvoiding && !scroll && Platform.OS === "ios" ? (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior="padding"
          keyboardVerticalOffset={headerHeight}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    fill: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    padded: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  });
