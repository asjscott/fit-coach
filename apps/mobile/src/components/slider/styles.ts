export type SliderSize = "sm" | "md" | "lg";

export const sliderSizes: Record<SliderSize, { track: number; thumb: number }> = {
  sm: { track: 4, thumb: 20 },
  md: { track: 6, thumb: 24 },
  lg: { track: 8, thumb: 28 },
};
