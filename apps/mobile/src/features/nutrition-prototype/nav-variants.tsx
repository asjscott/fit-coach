// PROTOTYPE (M7), throwaway: the tab bar options and what each moves elsewhere.
// 0: five tabs as now. 1: Exercises moves into Profile. 2: Profile moves to an avatar on Today. 3: three tabs, Train,
// Eat and Me, with History and Exercises reached from Today and Me
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon, type IconName } from "@/components/icons";
import { Text } from "@/components/text";
import { radii, spacing, useTheme } from "@/theme";
import { useProto } from "./prototype-data";

export type TabSpec = { name: string; title: string; icon: IconName };

const ALL: TabSpec[] = [
  { name: "index", title: "Today", icon: "home" },
  { name: "food", title: "Food", icon: "flame" },
  { name: "history", title: "History", icon: "calendar" },
  { name: "exercises", title: "Exercises", icon: "dumbbell" },
  { name: "profile", title: "Profile", icon: "user" },
];

// Every route stays mounted, so links still reach a hidden one; only its button goes
export function useTabs(): (TabSpec & { hidden: boolean })[] {
  const { nav } = useProto();
  const hidden: Record<string, string[]> = {
    "0": [],
    "1": ["exercises"],
    "2": ["profile"],
    "3": ["history", "exercises"],
  };
  const renamed: Record<string, string> = nav === "3" ? { index: "Train", food: "Eat", profile: "Me" } : {};
  return ALL.map((t) => ({ ...t, title: renamed[t.name] ?? t.title, hidden: (hidden[nav] ?? []).includes(t.name) }));
}

// On Today: the avatar for option 2, and links to History and Exercises for option 3
export function TodayNavExtras({ slot }: { slot: "top" | "afterWeek" }) {
  const { nav } = useProto();
  const { colors } = useTheme();
  if (nav === "2" && slot === "top")
    return (
      <Pressable
        onPress={() => router.navigate("/profile")}
        accessibilityLabel="Profile"
        style={[styles.avatar, { backgroundColor: colors.raised, borderColor: colors.line }]}
      >
        <Text weight="semiBold">AS</Text>
      </Pressable>
    );
  if (nav === "3" && slot === "afterWeek")
    return (
      <View style={{ flexDirection: "row", gap: spacing[2], marginTop: spacing[3] }}>
        <LinkTile icon="calendar" label="History" onPress={() => router.navigate("/history")} />
        <LinkTile icon="dumbbell" label="Exercises" onPress={() => router.navigate("/exercises")} />
      </View>
    );
  return null;
}

function LinkTile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.tile, { backgroundColor: colors.raised }]}>
      <Icon name={icon} size={18} />
      <Text size="sm" weight="semiBold" style={{ flex: 1 }}>
        {label}
      </Text>
      <Text color="muted">›</Text>
    </Pressable>
  );
}

// At the top of Profile: what moved there
export function ProfileNavLinks() {
  const { nav } = useProto();
  const { colors } = useTheme();
  const rows: { icon: IconName; label: string; to: "/history" | "/exercises" }[] =
    nav === "1"
      ? [{ icon: "dumbbell", label: "Exercise library", to: "/exercises" }]
      : nav === "3"
        ? [
            { icon: "calendar", label: "History", to: "/history" },
            { icon: "dumbbell", label: "Exercise library", to: "/exercises" },
          ]
        : [];
  if (!rows.length) return null;
  return (
    <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      {rows.map((r, i) => (
        <Pressable
          key={r.label}
          onPress={() => router.navigate(r.to)}
          style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line }]}
        >
          <Icon name={r.icon} size={18} />
          <Text style={{ flex: 1 }}>{r.label}</Text>
          <Text color="muted">›</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  tile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radii.md,
  },
  group: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[4] },
});
