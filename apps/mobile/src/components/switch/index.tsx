import { Platform, Switch as RNSwitch, type SwitchProps as RNSwitchProps } from "react-native";
import { useTheme } from "@/theme";
import { useFormControlContext } from "../form-control";

const scale = { sm: 0.75, md: 1, lg: 1.25 } as const;

// React Native Web draws the "on" thumb in its own teal unless given activeThumbColor, a web-only prop
const webThumb = (color: string) => (Platform.OS === "web" ? ({ activeThumbColor: color } as object) : {});

export type SwitchProps = RNSwitchProps & { size?: keyof typeof scale };

export function Switch({ size = "md", disabled, style, ...props }: SwitchProps) {
  const { colors } = useTheme();
  const formControl = useFormControlContext();
  const isDisabled = disabled ?? (formControl.isDisabled || formControl.isReadOnly);

  return (
    <RNSwitch
      disabled={isDisabled}
      trackColor={{ false: colors.inputBorder, true: colors.accent }}
      // Android and web tint the thumb; iOS keeps its native white thumb
      thumbColor={Platform.OS === "ios" ? undefined : colors.onAccent}
      {...webThumb(colors.onAccent)}
      ios_backgroundColor={colors.inputBorder}
      style={[{ transform: [{ scale: scale[size] }] }, isDisabled && { opacity: 0.4 }, style]}
      {...props}
    />
  );
}
