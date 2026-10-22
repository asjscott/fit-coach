import { View, type ViewProps } from "react-native";
import { radii, spacing, useTheme, type ColorToken, type RadiusToken, type SpaceToken } from "@/theme";

export type BoxProps = ViewProps & {
  p?: SpaceToken;
  px?: SpaceToken;
  py?: SpaceToken;
  bg?: ColorToken;
  rounded?: RadiusToken;
  flex?: boolean;
};

// Plain View with token-based shorthands for the most common one-off styles
export function Box({ p, px, py, bg, rounded, flex, style, ...props }: BoxProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          padding: p === undefined ? undefined : spacing[p],
          paddingHorizontal: px === undefined ? undefined : spacing[px],
          paddingVertical: py === undefined ? undefined : spacing[py],
          backgroundColor: bg && colors[bg],
          borderRadius: rounded && radii[rounded],
          flex: flex ? 1 : undefined,
        },
        style,
      ]}
      {...props}
    />
  );
}
