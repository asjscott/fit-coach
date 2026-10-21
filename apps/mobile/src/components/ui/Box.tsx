import { View, type ViewProps, type ViewStyle } from "react-native";
import { spacing, type SpaceToken } from "@/theme";

export type BoxProps = ViewProps & {
  direction?: "row" | "column";
  gap?: SpaceToken;
  padding?: SpaceToken;
  paddingX?: SpaceToken;
  paddingY?: SpaceToken;
  align?: ViewStyle["alignItems"];
  justify?: ViewStyle["justifyContent"];
  wrap?: boolean;
  flex?: number;
};

export function Box({
  direction = "column",
  gap,
  padding,
  paddingX,
  paddingY,
  align,
  justify,
  wrap,
  flex,
  style,
  ...rest
}: BoxProps) {
  return (
    <View
      style={[
        {
          flexDirection: direction,
          gap: gap && spacing[gap],
          padding: padding && spacing[padding],
          paddingHorizontal: paddingX && spacing[paddingX],
          paddingVertical: paddingY && spacing[paddingY],
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? "wrap" : undefined,
          flex,
        },
        style,
      ]}
      {...rest}
    />
  );
}

// Vertical stack with a default gap, the most common layout
export function Stack({ gap = "md", ...rest }: BoxProps) {
  return <Box gap={gap} {...rest} />;
}
