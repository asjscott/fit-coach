import { createElement, isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// React Native can't load under Vitest, so its components stand in as named placeholders and the screen's element
// tree is read directly
vi.mock("react-native", () => ({
  View: "View",
  Pressable: "Pressable",
  Keyboard: { dismiss: () => {} },
  Platform: { OS: "ios" },
  StyleSheet: { create: <T>(styles: T) => styles },
}));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
vi.mock("@/theme", () => ({ spacing: [0, 4, 8, 12, 16, 20, 24], useTheme: () => ({ colors: { bg: "#fff" } }) }));
vi.mock("../keyboard-avoiding-view", () => ({ KeyboardAvoidingView: "KeyboardAvoidingView" }));
vi.mock("../keyboard-aware-scroll-view", () => ({ KeyboardAwareScrollView: "KeyboardAwareScrollView" }));

const { Screen } = await import("./index");

type Props = { children?: ReactNode };

// Every element type from the root down to the element marked by the "content" key
function typesAbove(node: ReactNode): string[] | null {
  if (!isValidElement<Props>(node)) return null;
  if (node.key === "content") return [];
  const children = ([] as ReactNode[]).concat(node.props.children ?? []);
  for (const child of children) {
    const path = typesAbove(child);
    if (path) return [String(node.type), ...path];
  }
  return null;
}

// Stands in for what a screen shows
const content = createElement("Content", { key: "content" });

describe("Screen", () => {
  it("dismisses the keyboard on a tap around its content", () => {
    expect(typesAbove(Screen({ children: content }))).toContain("Pressable");
  });

  // A tap-to-dismiss Pressable around a scroll view takes the drags that start on anything not pressable, so the
  // scroll view never moves (#63)
  it("leaves content that scrolls itself free to scroll", () => {
    expect(typesAbove(Screen({ children: content, scrollsItself: true }))).not.toContain("Pressable");
  });
});
