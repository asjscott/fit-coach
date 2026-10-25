import { Tabs } from "expo-router";
import { BottomTabBar } from "expo-router/tabs";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Column } from "@/components/column";
import { Icon, type IconName } from "@/components/icons";
import { ResumePill } from "@/features/workouts/components/resume-pill";
import { fonts, fontSizes, lineHeight, sideRailMinWidth, useTheme } from "@/theme";

const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: "index", title: "Today", icon: "home" },
  { name: "history", title: "History", icon: "calendar" },
  { name: "exercises", title: "Exercises", icon: "dumbbell" },
  { name: "profile", title: "Profile", icon: "user" },
];

// The default bar is 49 tall, which clips Inter's descenders in the labels
const bottomBarHeight = 56;
const sideRailWidth = 240;

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
      // The Resume pill sits above the bottom bar, or at the foot of the side rail, which then draws the rail's edge
      tabBar={(props) =>
        sideRail ? (
          <View
            style={{
              width: sideRailWidth,
              backgroundColor: colors.bg,
              borderColor: colors.line,
              borderRightWidth: StyleSheet.hairlineWidth,
            }}
          >
            <BottomTabBar {...props} />
            <ResumePill stacked />
          </View>
        ) : (
          <View style={{ backgroundColor: colors.bg }}>
            <ResumePill />
            <BottomTabBar {...props} />
          </View>
        )
      }
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
          sideRail ? { flex: 1, minWidth: 0, borderRightWidth: 0 } : { height: bottomBarHeight + insets.bottom },
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
