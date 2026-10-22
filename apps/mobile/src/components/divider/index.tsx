import { StyleSheet, View, type ViewProps } from "react-native";
import { spacing, useTheme, type SpaceToken } from "@/theme";

export type DividerProps = ViewProps & {
  orientation?: "horizontal" | "vertical";
  spacing?: SpaceToken;
};

export function Divider({ orientation = "horizontal", spacing: space = 0, style, ...props }: DividerProps) {
  const { colors } = useTheme();
  const horizontal = orientation === "horizontal";
  return (
    <View
      aria-orientation={orientation}
      style={[
        { backgroundColor: colors.border },
        horizontal
          ? { height: StyleSheet.hairlineWidth, alignSelf: "stretch", marginVertical: spacing[space] }
          : { width: StyleSheet.hairlineWidth, alignSelf: "stretch", marginHorizontal: spacing[space] },
        style,
      ]}
      {...props}
    />
  );
}
