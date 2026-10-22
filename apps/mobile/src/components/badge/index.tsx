import { createContext, use, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { radii, spacing, statusColors, useTheme, type FontSize, type StatusAction } from "@/theme";
import { Icon, type IconComponent, type IconName } from "../icons";
import { Text, type TextProps } from "../text";

type BadgeSize = "sm" | "md" | "lg";

const sizes: Record<BadgeSize, { text: FontSize; icon: number; paddingX: number }> = {
  sm: { text: "2xs", icon: 10, paddingX: spacing[2] },
  md: { text: "xs", icon: 12, paddingX: spacing[2] },
  lg: { text: "sm", icon: 14, paddingX: spacing[3] },
};

const BadgeContext = createContext<{ fg: string; size: BadgeSize } | null>(null);

function useBadgeContext() {
  const context = use(BadgeContext);
  if (!context) throw new Error("Badge parts must be used inside <Badge>");
  return context;
}

export type BadgeProps = {
  action?: StatusAction;
  variant?: "solid" | "outline";
  size?: BadgeSize;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Badge({ action = "muted", variant = "solid", size = "md", style, children }: BadgeProps) {
  const { colors } = useTheme();
  const { fg, bg } = statusColors(colors, action);
  return (
    <BadgeContext value={{ fg, size }}>
      <View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            gap: spacing[1],
            paddingHorizontal: sizes[size].paddingX,
            paddingVertical: 2,
            borderRadius: radii.xs,
            backgroundColor: bg,
          },
          variant === "outline" && { borderWidth: 1, borderColor: fg },
          style,
        ]}
      >
        {children}
      </View>
    </BadgeContext>
  );
}

export function BadgeText({ style, children, ...props }: TextProps) {
  const { fg, size } = useBadgeContext();
  return (
    <Text size={sizes[size].text} weight="semiBold" style={[{ color: fg, letterSpacing: 0.4 }, style]} {...props}>
      {typeof children === "string" ? children.toUpperCase() : children}
    </Text>
  );
}

export function BadgeIcon({ name, as }: { name?: IconName; as?: IconComponent }) {
  const { fg, size } = useBadgeContext();
  return <Icon name={name} as={as} size={sizes[size].icon} rawColor={fg} />;
}
