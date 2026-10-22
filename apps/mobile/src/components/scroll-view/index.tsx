import type { Ref } from "react";
import { ScrollView as RNScrollView, type ScrollViewProps as RNScrollViewProps } from "react-native";

export type ScrollViewProps = RNScrollViewProps & { ref?: Ref<RNScrollView> };

// Sets some default values for ScrollView used throughout the app
export function ScrollView({ bounces = false, ...props }: ScrollViewProps) {
  return (
    <RNScrollView
      bounces={bounces}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...props}
    />
  );
}
