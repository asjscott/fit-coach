import type { ViewStyle } from "react-native";

export const alignMap = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline",
} satisfies Record<string, ViewStyle["alignItems"]>;

export const justifyMap = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
  evenly: "space-evenly",
} satisfies Record<string, ViewStyle["justifyContent"]>;
