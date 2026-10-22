import { View, type ViewProps } from "react-native";
import { useThemedStyles } from "@/theme";
import { createCardStyles } from "./styles";

export type CardProps = ViewProps & {
  size?: "sm" | "md" | "lg";
  variant?: "elevated" | "outlined" | "filled";
  // Highlights the card, e.g. the chosen option when cards act as a picker
  selected?: boolean;
};

export function Card({ size = "md", variant = "elevated", selected = false, style, ...props }: CardProps) {
  const styles = useThemedStyles(createCardStyles);
  return (
    <View
      style={[styles[size], styles[variant], selected && styles.selected, style]}
      {...props}
    />
  );
}
