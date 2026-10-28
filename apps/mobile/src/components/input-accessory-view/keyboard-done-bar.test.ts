import { describe, expect, it, vi } from "vitest";
import { elementPath } from "../../utils/element-path";

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

describe("KeyboardDoneBar on iOS", () => {
  // The accessory's placeholder stays in the input's row at the size of the screen, on top of whatever comes
  // before it there, such as a Set stepper's − (issue #47)
  it("doesn't take touches meant for the input it sits beside", () => {
    const path = elementPath<{ pointerEvents?: string }>(
      KeyboardDoneBar({ nativeID: "field" }),
      (element) => element.type === "InputAccessoryView",
    );
    expect(path).not.toBeNull();
    expect(path!.slice(0, -1).some((element) => element.props.pointerEvents === "none")).toBe(true);
  });
});
