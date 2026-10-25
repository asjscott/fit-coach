import { Tabs } from "expo-router";
import { Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Column } from "@/components/column";
import { Icon, type IconName } from "@/components/icons";
import { fonts, fontSizes, lineHeight, sideRailMinWidth, useTheme } from "@/theme";

const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: "index", title: "Today", icon: "home" },
  { name: "history", title: "History", icon: "calendar" },
  { name: "exercises", title: "Exercises", icon: "dumbbell" },
  { name: "profile", title: "Profile", icon: "user" },
];

// The default bar is 49 tall, which clips Inter's descenders in the labels
const bottomBarHeight = 56;

export default function TabsLayout() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sideRail = Platform.OS === "web" && width > sideRailMinWidth;
  const labelSize = sideRail ? fontSizes.sm : fontSizes["2xs"];

  return (
    <Tabs
      // Each tab's Stack, header included, sits in the centred column
      screenLayout={({ children }) => <Column>{children}</Column>}
      screenOptions={{
        // Each tab has its own Stack with its own header
        headerShown: false,
        tabBarPosition: sideRail ? "left" : "bottom",
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        // The rail's default fill for the current tab is the solid accent, which hides its label
        tabBarActiveBackgroundColor: sideRail ? colors.accentSoft : undefined,
        tabBarStyle: [
          { backgroundColor: colors.bg, borderColor: colors.line },
          sideRail ? { width: 240, minWidth: 240 } : { height: bottomBarHeight + insets.bottom },
        ],
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: labelSize, lineHeight: lineHeight(labelSize) },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {tabs.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size }) => <Icon name={icon} rawColor={String(color)} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
