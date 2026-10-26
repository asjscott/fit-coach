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
  // Selected chips and cards; success, warning and error badges, alerts and toasts
  ["text", "accentSoft", TEXT],
  ["accent", "accentSoft", TEXT],
  ["danger", "dangerSoft", TEXT],
  ["success", "successSoft", TEXT],
  ["warning", "warningSoft", TEXT],
  // Solid positive buttons
  ["onAccent", "success", TEXT],
  // Switch knob against its off and on tracks
  ["knob", "inputBorder", UI],
  ["knob", "accent", UI],
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

// Degrees apart on the colour wheel, so status colours read as different colours, not shades of the accent
const hue = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  const sector = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (sector * 60 + 360) % 360;
};
const hueDistance = (a: string, b: string) => {
  const d = Math.abs(hue(a) - hue(b));
  return Math.min(d, 360 - d);
};

describe.each(["dark", "light"] as const)("the %s status colours", (scheme) => {
  const colors = palettes[scheme];
  const distinct = ["accent", "danger", "success", "warning"] as const;
  const pairs = distinct.flatMap((a, i) => distinct.slice(i + 1).map((b) => [a, b] as const));

  it.each(pairs)("keep %s and %s at least 25° apart in hue", (a, b) => {
    expect(hueDistance(colors[a], colors[b])).toBeGreaterThanOrEqual(25);
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
      danger: "#FF5C7A",
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
      danger: "#BE123C",
    });
  });
});
