import { View, type ViewProps } from "react-native";
import { useThemedStyles } from "@/theme";
import { createCardStyles } from "./styles";

export type CardProps = ViewProps & {
  size?: "sm" | "md" | "lg";
  // section: a hairline above, no box (the default). filled: a raised box, for content that needs grouping
  variant?: "section" | "filled";
  // Makes the card a choice in a picker: boxed, with the chosen one in the accent
  selected?: boolean;
};

// A block of grouped content. Sections are separated by hairlines rather than drawn as bordered cards
export function Card({ size = "md", variant = "section", selected, style, ...props }: CardProps) {
  const styles = useThemedStyles(createCardStyles);
  const choice = selected !== undefined;
  return (
    <View
      style={[
        styles[size],
        choice
          ? [styles.choice, styles[`${size}Box`]]
          : [styles[variant], variant === "filled" && styles[`${size}Box`]],
        selected && styles.selected,
        style,
      ]}
      {...props}
    />
  );
}
