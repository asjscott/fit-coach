// Small radii: md (10) is the default for buttons, inputs, steppers and boxed content. Pills and day circles are round
export const radii = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radii;
