import { createContext, use, type ReactNode } from "react";
import { View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { spacing, type FontSize } from "@/theme";
import { Icon, type IconComponent, type IconName } from "../icons";
import { Text, type TextProps } from "../text";

export type FormControlSize = "sm" | "md" | "lg";

type FormControlState = {
  isInvalid?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  size?: FormControlSize;
};

const FormControlContext = createContext<FormControlState>({});

// Inputs read invalid/disabled/read-only state from the nearest FormControl
export const useFormControlContext = () => use(FormControlContext);

const textSize: Record<FormControlSize, FontSize> = { sm: "xs", md: "sm", lg: "md" };

export type FormControlProps = FormControlState & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function FormControl({ style, children, size = "md", ...state }: FormControlProps) {
  return (
    <FormControlContext value={{ size, ...state }}>
      <View style={[{ gap: spacing[1] }, style]}>{children}</View>
    </FormControlContext>
  );
}

export function FormControlLabel({ style, ...props }: ViewProps) {
  return <View style={[{ flexDirection: "row", alignItems: "center" }, style]} {...props} />;
}

export function FormControlLabelText({ children, size, ...props }: TextProps) {
  const { size: parentSize = "md", isRequired } = useFormControlContext();
  return (
    <Text size={size ?? textSize[parentSize]} weight="semiBold" color="muted" {...props}>
      {children}
      {isRequired && <FormControlLabelAstrick />}
    </Text>
  );
}

export function FormControlLabelAstrick(props: TextProps) {
  return (
    <Text color="danger" {...props}>
      {" *"}
    </Text>
  );
}

export function FormControlHelper({ style, ...props }: ViewProps) {
  return <View style={[{ flexDirection: "row" }, style]} {...props} />;
}

export function FormControlHelperText({ size, ...props }: TextProps) {
  const { size: parentSize = "md" } = useFormControlContext();
  return <Text size={size ?? textSize[parentSize]} color="subtle" {...props} />;
}

// Only rendered while the FormControl is invalid
export function FormControlError({ style, ...props }: ViewProps) {
  const { isInvalid } = useFormControlContext();
  if (!isInvalid) return null;
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: spacing[1] }, style]} {...props} />;
}

export function FormControlErrorText({ size, ...props }: TextProps) {
  const { size: parentSize = "md" } = useFormControlContext();
  return <Text size={size ?? textSize[parentSize]} color="danger" {...props} />;
}

export function FormControlErrorIcon({
  name = "circleAlert",
  as,
  size = 14,
}: {
  name?: IconName;
  as?: IconComponent;
  size?: number;
}) {
  return <Icon name={name} as={as} size={size} color="danger" />;
}
