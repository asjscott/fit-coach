import { describe, expect, it } from "vitest";
import { palettes, type ColorToken } from "./colors";
import { contrastRatio } from "./contrast";

// WCAG 2.1 AA: 4.5:1 for text (1.4.3), 3:1 for input borders and other UI the user must see (1.4.11)
const TEXT = 4.5;
const UI = 3;

// Every pairing the shared components draw: [foreground, background, minimum]
const pairings: [ColorToken, ColorToken, number][] = [
  // Copy on the page, on sheets and toasts, and on secondary buttons and filled rows
  ...(["text", "muted", "subtle"] as const).flatMap((fg) => [
    [fg, "bg", TEXT] as [ColorToken, ColorToken, number],
    [fg, "surface", TEXT] as [ColorToken, ColorToken, number],
  ]),
  ["text", "raised", TEXT],
  ["muted", "raised", TEXT],
  // Link buttons, values and selected labels in the accent; destructive labels in danger
  ["accent", "bg", TEXT],
  ["accent", "surface", TEXT],
  ["danger", "bg", TEXT],
  ["danger", "surface", TEXT],
  // Solid primary and negative buttons
  ["onAccent", "accent", TEXT],
  ["onAccent", "danger", TEXT],
  // Selected chips and cards, success and warning badges; error alerts
  ["text", "accentSoft", TEXT],
  ["accent", "accentSoft", TEXT],
  ["danger", "dangerSoft", TEXT],
  // Input, checkbox and radio outlines, and the focused or checked state
  ["inputBorder", "bg", UI],
  ["inputBorder", "surface", UI],
  ["accent", "bg", UI],
  ["accent", "surface", UI],
];

describe.each(["dark", "light"] as const)("the %s palette", (scheme) => {
  const colors = palettes[scheme];

  it.each(pairings)("draws %s on %s at %s:1 or more", (fg, bg, minimum) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(minimum);
  });
});

describe("the spec's tokens", () => {
  it("are the Performance-led colours, in dark and light", () => {
    expect(palettes.dark).toMatchObject({
      bg: "#0D0E10",
      surface: "#17181B",
      raised: "#202227",
      line: "#2A2C31",
      text: "#F4F5F7",
      muted: "#A9ACB3",
      subtle: "#8E929A",
      inputBorder: "#6E727B",
      accent: "#FC5200",
      onAccent: "#0D0E10",
      danger: "#FF6B57",
    });
    expect(palettes.light).toMatchObject({
      bg: "#F7F7F8",
      surface: "#FFFFFF",
      raised: "#EDEEF0",
      line: "#E2E3E6",
      text: "#121316",
      muted: "#4A4D55",
      subtle: "#6B6E76",
      inputBorder: "#8A8D95",
      accent: "#C2410C",
      onAccent: "#FFFFFF",
      danger: "#B91C1C",
    });
  });
});
