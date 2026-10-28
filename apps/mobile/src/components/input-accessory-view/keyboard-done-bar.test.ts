import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// React Native can't load under Vitest, so its components stand in as named placeholders and the bar's element
// tree is read directly
vi.mock("react-native", () => ({
  InputAccessoryView: "InputAccessoryView",
  View: "View",
  Pressable: "Pressable",
  Keyboard: { dismiss: () => {} },
  Platform: { OS: "ios" },
  StyleSheet: { create: <T>(styles: T) => styles, hairlineWidth: 1 },
}));
vi.mock("@/theme", () => ({ spacing: [0, 4, 8, 12, 16], useThemedStyles: () => ({}) }));
vi.mock("../text", () => ({ Text: "Text" }));

const { KeyboardDoneBar } = await import("./index");

type Props = { pointerEvents?: string; children?: ReactNode };

// The chain of elements from the root down to the first of `type`, or null
function pathTo(node: ReactNode, type: string): ReactElement<Props>[] | null {
  if (!isValidElement<Props>(node)) return null;
  if (node.type === type) return [node];
  const children = ([] as ReactNode[]).concat(node.props.children ?? []);
  for (const child of children) {
    const path = pathTo(child, type);
    if (path) return [node, ...path];
  }
  return null;
}

describe("KeyboardDoneBar on iOS", () => {
  // The accessory's placeholder stays in the input's row at the size of the screen, on top of whatever comes
  // before it there, such as a Set stepper's − (issue #47)
  it("doesn't take touches meant for the input it sits beside", () => {
    const path = pathTo(KeyboardDoneBar({ nativeID: "field" }), "InputAccessoryView");
    expect(path).not.toBeNull();
    expect(path!.slice(0, -1).some((element) => element.props.pointerEvents === "none")).toBe(true);
  });
});
