import { Children, isValidElement, type ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Card } from "../card";
import { HStack } from "../stack";

type SlotProps = { children?: ReactNode };

// Each slot takes an equal share of the row so the centre group stays centred
export function LeftButtons({ children }: SlotProps) {
  return (
    <HStack spacing={2} justify="start" style={{ flex: 1 }}>
      {children}
    </HStack>
  );
}

export function CenterButtons({ children }: SlotProps) {
  return (
    <HStack spacing={2} justify="center" style={{ flex: 1 }}>
      {children}
    </HStack>
  );
}

export function RightButtons({ children }: SlotProps) {
  return (
    <HStack spacing={2} justify="end" style={{ flex: 1 }}>
      {children}
    </HStack>
  );
}

export type ButtonBannerProps = {
  // Wrap the row in a Card
  card?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

// Row of Left/Center/Right button groups, e.g. Back ... Next
export function ButtonBanner({ card = false, style, children }: ButtonBannerProps) {
  const types = Children.toArray(children).map((child) => (isValidElement(child) ? child.type : null));
  const hasCenter = types.includes(CenterButtons);
  // With a centre group, pad the missing side so the centre stays centred
  const addLeft = hasCenter && !types.includes(LeftButtons) && types.includes(RightButtons);
  const addRight = hasCenter && !types.includes(RightButtons) && types.includes(LeftButtons);

  const row = (
    <HStack spacing={2} justify="between" style={[{ width: "100%" }, !card && style]}>
      {addLeft && <LeftButtons />}
      {children}
      {addRight && <RightButtons />}
    </HStack>
  );

  if (!card) return row;
  return (
    <Card size="sm" style={style}>
      {row}
    </Card>
  );
}
