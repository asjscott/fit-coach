import { ScrollView as RNScrollView, type ScrollViewProps } from "react-native";

export type { ScrollViewProps };

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
