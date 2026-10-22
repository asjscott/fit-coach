import { LinearGradient } from "expo-linear-gradient";
import { createContext, use, type ReactNode } from "react";
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { accentGradient, fonts, spacing, useTheme, type SpaceToken } from "@/theme";
import { Icon, type IconComponent, type IconName } from "../icons";
import { Spinner } from "../spinner";
import { Text, type TextProps } from "../text";
import {
  buttonBackground,
  buttonBorder,
  buttonForeground,
  buttonSizes,
  styles,
  type ButtonAction,
  type ButtonSize,
  type ButtonVariant,
} from "./styles";

type ButtonContextValue = { size: ButtonSize; foreground: string };

const ButtonContext = createContext<ButtonContextValue | null>(null);

function useButtonContext() {
  const context = use(ButtonContext);
  if (!context) throw new Error("Button parts must be used inside <Button>");
  return context;
}

export type ButtonProps = Omit<PressableProps, "style"> & {
  action?: ButtonAction;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  action = "primary",
  variant = "solid",
  size = "md",
  fullWidth = false,
  disabled,
  style,
  children,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();
  const dims = buttonSizes[size];
  const foreground = buttonForeground(colors, action, variant);
  const showGradient = action === "primary" && variant === "solid";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { height: dims.height, paddingHorizontal: dims.paddingX },
        variant === "solid" && { backgroundColor: buttonBackground(colors, action) },
        variant === "outline" && { borderWidth: 1, borderColor: buttonBorder(colors, action) },
        variant === "link" && styles.link,
        fullWidth && { alignSelf: "stretch" },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {(state) => (
        <ButtonContext value={{ size, foreground }}>
          {showGradient && (
            <LinearGradient
              colors={accentGradient(colors)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          {typeof children === "function" ? children(state) : children}
        </ButtonContext>
      )}
    </Pressable>
  );
}

export function ButtonText({ style, ...props }: TextProps) {
  const { size, foreground } = useButtonContext();
  return (
    <Text
      size={buttonSizes[size].text}
      style={[{ color: foreground, fontFamily: fonts.semiBold }, style]}
      {...props}
    />
  );
}

export function ButtonIcon({ name, as, size }: { name?: IconName; as?: IconComponent; size?: number }) {
  const context = useButtonContext();
  return (
    <Icon name={name} as={as} size={size ?? buttonSizes[context.size].icon} rawColor={context.foreground} />
  );
}

export function ButtonSpinner() {
  const { foreground } = useButtonContext();
  return <Spinner size="sm" rawColor={foreground} />;
}

export type ButtonGroupProps = {
  space?: SpaceToken;
  isAttached?: boolean;
  flexDirection?: "row" | "column";
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function ButtonGroup({
  space = 4,
  isAttached = false,
  flexDirection = "column",
  style,
  children,
}: ButtonGroupProps) {
  return (
    <View style={[{ flexDirection, gap: isAttached ? 0 : spacing[space] }, style]}>{children}</View>
  );
}
