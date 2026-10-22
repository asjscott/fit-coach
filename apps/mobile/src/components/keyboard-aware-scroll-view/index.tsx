import { Platform } from "react-native";
import { ScrollView, type ScrollViewProps } from "../scroll-view";

// Keeps the focused input visible above the keyboard and lets a drag dismiss it.
// iOS uses native keyboard insets (which also scroll to the focused field);
// Android resizes the window for the keyboard itself.
export function KeyboardAwareScrollView(props: ScrollViewProps) {
  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      {...props}
    />
  );
}
