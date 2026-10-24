import { View, type ViewProps } from "react-native";
import { spacing, useTheme } from "@/theme";

export type ContainerProps = ViewProps & {
  disableGutters?: boolean;
  fullHeight?: boolean;
};

// Full-width page section with the standard horizontal gutter
export function Container({ disableGutters = false, fullHeight = true, style, ...props }: ContainerProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          width: "100%",
          backgroundColor: colors.bg,
          paddingHorizontal: disableGutters ? 0 : spacing[4],
          flex: fullHeight ? 1 : undefined,
        },
        style,
      ]}
      {...props}
    />
  );
}
