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
  StyleSheet: { create: <T>(styles: T) => styles },
}));
vi.mock("@/theme", () => ({
  radii: { pill: 999 },
  spacing: [0, 4, 8, 12, 16],
  useTheme: () => ({ scheme: "light" }),
  useThemedStyles: () => ({}),
}));
vi.mock("expo-glass-effect", () => ({
  GlassView: "GlassView",
  isGlassEffectAPIAvailable: () => true,
  isLiquidGlassAvailable: () => true,
}));
vi.mock("../icons", () => ({ Icon: "Icon" }));

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

  it("is a button screen readers call Done", () => {
    const path = elementPath<{ accessibilityRole?: string; accessibilityLabel?: string }>(
      KeyboardDoneBar({ nativeID: "field" }),
      (element) => element.props.accessibilityRole === "button",
    );
    expect(path?.at(-1)?.props.accessibilityLabel).toBe("Done");
  });
});
