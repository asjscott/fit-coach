import { Pressable as RNPressable, type PressableProps } from "react-native";

export type { PressableProps };

// Dims while pressed and when disabled, consistent with Button
export function Pressable({ style, disabled, ...props }: PressableProps) {
  return (
    <RNPressable
      disabled={disabled}
      style={(state) => [
        state.pressed && { opacity: 0.8 },
        disabled && { opacity: 0.4 },
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    />
  );
}
