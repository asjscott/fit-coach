import { router, type Href } from "expo-router";
import type { StyleProp, ViewStyle } from "react-native";
import {
  Button,
  ButtonIcon,
  ButtonSpinner,
  ButtonText,
  type ButtonAction,
  type ButtonSize,
  type ButtonVariant,
} from "../button";
import type { IconName } from "../icons";

export type LoadingButtonProps = {
  onPress?: () => void;
  href?: Href;
  loading?: boolean;
  label?: string;
  size?: ButtonSize;
  action?: ButtonAction;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: IconName;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

// One-line button for the common case: label, optional icon, spinner while loading
export function LoadingButton({
  onPress,
  href,
  loading = false,
  label = "Save",
  size = "lg",
  action = "primary",
  variant = "solid",
  disabled = false,
  icon,
  fullWidth,
  style,
}: LoadingButtonProps) {
  const handlePress = href ? () => router.push(href) : onPress;

  return (
    <Button
      onPress={handlePress}
      action={action}
      variant={variant}
      size={size}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      accessibilityState={{ busy: loading, disabled: disabled || loading }}
      style={style}
    >
      {loading ? (
        <ButtonSpinner />
      ) : (
        <>
          {icon && <ButtonIcon name={icon} />}
          <ButtonText>{label}</ButtonText>
        </>
      )}
    </Button>
  );
}
