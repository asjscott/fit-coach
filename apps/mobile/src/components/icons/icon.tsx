import type { LucideIcon } from "lucide-react-native";
import { useTheme, type ColorToken } from "@/theme";
import { IconMap } from "./icon-config";

export type IconName = keyof typeof IconMap;
export type IconComponent = LucideIcon;

export type IconProps = {
  // Either a name from the curated IconMap, or any Lucide icon via `as`
  name?: IconName;
  as?: IconComponent;
  size?: number;
  color?: ColorToken;
  // Raw colour, used by compound components that resolve their own colour
  rawColor?: string;
  strokeWidth?: number;
};

export function Icon({ name, as, size = 24, color = "muted", rawColor, strokeWidth = 2 }: IconProps) {
  const { colors } = useTheme();
  const Component = as ?? (name ? IconMap[name] : undefined);

  if (!Component) {
    console.warn(`Icon "${name}" is not in the supported icon map.`);
    return null;
  }

  return <Component size={size} color={rawColor ?? colors[color]} strokeWidth={strokeWidth} />;
}
