import { createContext, use, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { radii, spacing, statusColors, useTheme, type StatusAction } from "@/theme";
import { Icon, type IconComponent, type IconName } from "../icons";
import { Text, type TextProps } from "../text";

const defaultIcons: Record<StatusAction, IconName> = {
  success: "circleCheck",
  warning: "triangleAlert",
  error: "circleX",
  info: "info",
  muted: "info",
};

const AlertContext = createContext<{ fg: string; action: StatusAction } | null>(null);

function useAlertContext() {
  const context = use(AlertContext);
  if (!context) throw new Error("Alert parts must be used inside <Alert>");
  return context;
}

export type AlertProps = {
  action?: StatusAction;
  variant?: "solid" | "outline";
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Alert({ action = "info", variant = "solid", style, children }: AlertProps) {
  const { colors } = useTheme();
  const { fg, bg } = statusColors(colors, action);
  return (
    <AlertContext value={{ fg, action }}>
      <View
        accessibilityRole="alert"
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[3],
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            borderRadius: radii.md,
            backgroundColor: variant === "solid" ? bg : "transparent",
            borderWidth: 1,
            borderColor: variant === "solid" ? "transparent" : fg,
          },
          style,
        ]}
      >
        {children}
      </View>
    </AlertContext>
  );
}

export function AlertText({ style, ...props }: TextProps) {
  return <Text size="sm" style={[{ flex: 1 }, style]} {...props} />;
}

// Defaults to the icon for the alert's action
export function AlertIcon({ name, as, size = 20 }: { name?: IconName; as?: IconComponent; size?: number }) {
  const { fg, action } = useAlertContext();
  return <Icon name={as ? undefined : (name ?? defaultIcons[action])} as={as} size={size} rawColor={fg} />;
}
