import type { TextStyle } from "react-native";

export const decorationStyles = {
  underline: { textDecorationLine: "underline" },
  strikeThrough: { textDecorationLine: "line-through" },
  italic: { fontStyle: "italic" },
} satisfies Record<string, TextStyle>;
