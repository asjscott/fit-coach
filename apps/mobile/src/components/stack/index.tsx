import { View, type ViewProps } from "react-native";
import { spacing, type SpaceToken } from "@/theme";
import { alignMap, justifyMap } from "./styles";

export type StackProps = ViewProps & {
  direction?: "row" | "row-reverse" | "column" | "column-reverse";
  spacing?: SpaceToken;
  align?: keyof typeof alignMap;
  justify?: keyof typeof justifyMap;
  wrap?: "wrap" | "nowrap";
  flex?: boolean;
  centered?: boolean;
};

export function Stack({
  direction = "column",
  spacing: space = 0,
  align,
  justify,
  wrap = "nowrap",
  flex = false,
  centered = false,
  style,
  ...props
}: StackProps) {
  return (
    <View
      style={[
        {
          flexDirection: direction,
          gap: spacing[space],
          alignItems: centered ? "center" : align && alignMap[align],
          justifyContent: centered ? "center" : justify && justifyMap[justify],
          flexWrap: wrap,
          flex: flex ? 1 : undefined,
        },
        style,
      ]}
      {...props}
    />
  );
}

export function HStack(props: Omit<StackProps, "direction">) {
  return <Stack direction="row" align="center" {...props} />;
}

export function VStack(props: Omit<StackProps, "direction">) {
  return <Stack direction="column" {...props} />;
}
