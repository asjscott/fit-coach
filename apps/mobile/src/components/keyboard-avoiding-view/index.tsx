import { use, type ReactNode } from "react";
import { KeyboardAvoidingView as RNKeyboardAvoidingView, Platform, type ViewStyle } from "react-native";
import { HeaderHeightContext } from "expo-router/react-navigation";

export type KeyboardAvoidingViewProps = {
  children: ReactNode;
  // Defaults to the navigation header height, which KeyboardAvoidingView can't see itself
  iosOffset?: number;
  iosBehavior?: "height" | "position" | "padding";
  style?: ViewStyle;
};

// iOS only: Android resizes the window for the keyboard itself
export function KeyboardAvoidingView({
  children,
  iosOffset,
  iosBehavior = "padding",
  style,
}: KeyboardAvoidingViewProps) {
  const headerHeight = use(HeaderHeightContext) ?? 0;

  return (
    <RNKeyboardAvoidingView
      behavior={Platform.OS === "ios" ? iosBehavior : undefined}
      keyboardVerticalOffset={iosOffset ?? headerHeight}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </RNKeyboardAvoidingView>
  );
}
