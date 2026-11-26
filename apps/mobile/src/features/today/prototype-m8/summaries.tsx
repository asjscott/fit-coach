// PROTOTYPE (M8, throwaway; branch prototype/m8-summaries). Three variants of the Day Summary and the Week Summary
// card on Today, switchable with ?variant=A|B|C, and ?sunday=1 to show the Week Summary card. The data is made up:
// only the rings come from the real day.
import { router, useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Icon } from "@/components/icons";
import { Pressable } from "@/components/pressable";
import { Ring } from "@/components/ring";
import { Text } from "@/components/text";
import { radii, spacing, useTheme, type ColorToken } from "@/theme";

export type ProtoVariant = "A" | "B" | "C";
export const VARIANT_NAMES: Record<ProtoVariant, string> = {
  A: "Coach card",
  B: "Day closed hero",
  C: "Tomorrow first",
};

export function useProto() {
  const params = useLocalSearchParams<{ variant?: string; sunday?: string }>();
  const variant = (["A", "B", "C"].includes(params.variant ?? "") ? params.variant : null) as ProtoVariant | null;
  return { variant, sunday: params.sunday === "1" };
}

// Made-up day and week, as M8 would work them out
const DAY = {
  workout: "Chest, back and quads",
  workoutLine: "14 Sets · 48 min",
  kcal: "2,900 / 2,980 kcal",
  protein: "184 / 160 g protein",
  tomorrow: "Rest Day",
  nextUp: "Back, shoulders and glutes · about 44 min",
  tomorrowTargets: "2,980 kcal · 160 g protein",
};
const WEEK = {
  dates: "Nov 23 – 29",
  workouts: { done: 3, planned: 3 },
  streak: 4,
  kcal: "2,870 avg · in range",
  protein: "171 g avg · in range",
  weighIn: "−0.4 kg",
};

const openWeek = (variant: ProtoVariant) =>
  router.push({ pathname: "/prototype-week-summary", params: { variant: variant === "B" ? "B" : "A" } });

function Dot({ color }: { color: ColorToken }) {
  const { colors } = useTheme();
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors[color], marginTop: 7 }} />;
}

// ---------------------------------------------------------------------------------------------------------------
// A: Coach card. The Day Summary is a card like the Coach's Nudge, in its place: three rows, Today, Food, Tomorrow.
// The Workout card below stays as it is.

function Row({
  icon,
  label,
  children,
}: {
  icon: "dumbbell" | "target" | "calendar";
  label: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
        <Icon name={icon} size={16} color="accent" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text size="xs" weight="semiBold" color="muted">
          {label.toUpperCase()}
        </Text>
        {children}
      </View>
    </View>
  );
}

export function DaySummaryA() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Row icon="dumbbell" label="Today">
        <Text weight="semiBold">{`${DAY.workout} done ✅`}</Text>
        <Text size="sm" color="muted">
          {DAY.workoutLine}
        </Text>
      </Row>
      <Row icon="target" label="Food">
        <Text weight="semiBold">
          <Text weight="semiBold" color="success">
            {DAY.kcal}
          </Text>
          {"  ·  "}
          <Text weight="semiBold" color="success">
            {DAY.protein}
          </Text>
        </Text>
      </Row>
      <Row icon="calendar" label="Tomorrow">
        <Text weight="semiBold">{DAY.tomorrow}</Text>
        <Text size="sm" color="muted">{`Next up: ${DAY.nextUp}`}</Text>
        <Text size="sm" color="muted">
          {DAY.tomorrowTargets}
        </Text>
      </Row>
    </View>
  );
}

export function WeekCardA() {
  const { colors } = useTheme();
  const tile = [styles.tile, { backgroundColor: colors.raised }];
  return (
    <Pressable
      onPress={() => openWeek("A")}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.accent }]}
    >
      <View style={styles.between}>
        <Text weight="bold" size="lg">{`Your week · ${WEEK.dates}`}</Text>
        <Icon name="x" size={18} color="muted" />
      </View>
      <View style={styles.grid}>
        <View style={tile}>
          <Text size="2xl" weight="bold">{`${WEEK.workouts.done}/${WEEK.workouts.planned}`}</Text>
          <Text size="xs" color="muted">
            Workouts
          </Text>
        </View>
        <View style={tile}>
          <Text size="2xl" weight="bold">{`🔥 ${WEEK.streak}`}</Text>
          <Text size="xs" color="muted">
            Week streak
          </Text>
        </View>
        <View style={tile}>
          <Text size="sm" weight="semiBold" color="success">
            {WEEK.kcal}
          </Text>
          <Text size="sm" weight="semiBold" color="success">
            {WEEK.protein}
          </Text>
          <Text size="xs" color="muted">
            Food
          </Text>
        </View>
        <View style={tile}>
          <Text size="2xl" weight="bold">
            {WEEK.weighIn}
          </Text>
          <Text size="xs" color="muted">
            Since last Weigh-in
          </Text>
        </View>
      </View>
      <Text weight="semiBold" color="accent">
        See your week ›
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// B: Day closed hero. In the evening the big Workout card becomes the Day Summary: one green card that closes the
// day, with tomorrow at its foot. No separate card under the rings.

export function DaySummaryB() {
  const { colors } = useTheme();
  return (
    <View style={[styles.hero, { backgroundColor: colors.successSoft }]}>
      <Text size="4xl" weight="extraBold">
        Day done.
      </Text>
      <View style={{ gap: spacing[2] }}>
        <View style={styles.line}>
          <Dot color="success" />
          <Text style={{ flex: 1 }}>
            <Text weight="semiBold">{DAY.workout}</Text>
            {` · ${DAY.workoutLine}`}
          </Text>
        </View>
        <View style={styles.line}>
          <Dot color="success" />
          <Text style={{ flex: 1 }}>{`${DAY.kcal} · ${DAY.protein}`}</Text>
        </View>
      </View>
      <View style={[styles.tomorrow, { borderTopColor: colors.line }]}>
        <Text size="xs" weight="semiBold" color="muted">
          TOMORROW
        </Text>
        <Text size="xl" weight="bold">
          {DAY.tomorrow}
        </Text>
        <Text size="sm" color="muted">{`Next up: ${DAY.nextUp}`}</Text>
        <Text size="sm" color="muted">
          {DAY.tomorrowTargets}
        </Text>
      </View>
      <Text weight="semiBold" color="accent">
        Train again ›
      </Text>
    </View>
  );
}

export function WeekCardB() {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => openWeek("B")} style={[styles.hero, { backgroundColor: colors.accent }]}>
      <View style={styles.between}>
        <Text size="xs" weight="semiBold" color="onAccent">
          {`YOUR WEEK · ${WEEK.dates.toUpperCase()}`}
        </Text>
        <Icon name="x" size={18} color="onAccent" />
      </View>
      <Text size="4xl" weight="extraBold" color="onAccent">
        {`${WEEK.workouts.done} of ${WEEK.workouts.planned}. 🔥 ${WEEK.streak} weeks.`}
      </Text>
      <Text color="onAccent">{`Calories and protein in range on average · ${WEEK.weighIn} since last week`}</Text>
      <Text weight="bold" color="onAccent">
        See your week ›
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// C: Tomorrow first. In the evening the screen turns to tomorrow: the big card says what tomorrow is, and today
// shrinks to a ticked receipt under it. The Coach's Nudge and the Workout card both give way.

export function DaySummaryC() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing[3] }}>
      <View style={[styles.hero, { backgroundColor: colors.raised }]}>
        <Text size="xs" weight="semiBold" color="muted">
          TOMORROW · FRIDAY
        </Text>
        <Text size="4xl" weight="extraBold">
          Rest.
        </Text>
        <Text>{`You've trained today, and this week's Workouts still fit. Next up: ${DAY.nextUp}.`}</Text>
        <Text size="sm" color="muted">{`Eat ${DAY.tomorrowTargets}`}</Text>
        <Text weight="semiBold" color="text">
          See the next Workout ›
        </Text>
      </View>
      <View style={[styles.receipt, { borderColor: colors.line }]}>
        <Text size="xs" weight="semiBold" color="muted">
          TODAY
        </Text>
        <View style={styles.between}>
          <Text weight="semiBold">{`✅ ${DAY.workout}`}</Text>
          <Text size="sm" color="muted">
            {DAY.workoutLine}
          </Text>
        </View>
        <View style={styles.between}>
          <Text weight="semiBold">✅ Calories</Text>
          <Text size="sm" color="success">
            {DAY.kcal}
          </Text>
        </View>
        <View style={styles.between}>
          <Text weight="semiBold">✅ Protein</Text>
          <Text size="sm" color="success">
            {DAY.protein}
          </Text>
        </View>
      </View>
    </View>
  );
}

function Bar({ label, value, fill, color }: { label: string; value: string; fill: number; color: ColorToken }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.between}>
        <Text size="sm" weight="semiBold">
          {label}
        </Text>
        <Text size="sm" color="muted">
          {value}
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.raised }}>
        <View style={{ width: `${fill * 100}%`, height: 6, borderRadius: 3, backgroundColor: colors[color] }} />
      </View>
    </View>
  );
}

export function WeekCardC() {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => openWeek("A")}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}
    >
      <View style={styles.between}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
          <Ring done={WEEK.workouts.done} target={WEEK.workouts.planned} size={44} color="success" />
          <View>
            <Text weight="bold">Last week</Text>
            <Text size="sm" color="muted">{`${WEEK.dates} · 🔥 ${WEEK.streak}-week streak`}</Text>
          </View>
        </View>
        <Icon name="x" size={18} color="muted" />
      </View>
      <Bar label="Workouts" value="3 of 3" fill={1} color="success" />
      <Bar label="Calories" value={WEEK.kcal} fill={0.96} color="success" />
      <Bar label="Protein" value={WEEK.protein} fill={1} color="success" />
      <Bar label="Weekly Budget" value="9 of 11 Muscles met" fill={0.82} color="accent" />
      <Text weight="semiBold" color="accent">
        See your week ›
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// This week, in every variant: the streak and a way back to last week's summary

export function StreakRow() {
  const { colors } = useTheme();
  return (
    <View style={[styles.streak, { backgroundColor: colors.raised }]}>
      <Text weight="semiBold">{`🔥 ${WEEK.streak}-week streak`}</Text>
      <Pressable onPress={() => openWeek("A")}>
        <Text size="sm" weight="semiBold" color="accent">
          Last week ›
        </Text>
      </Pressable>
    </View>
  );
}

// The prototype's switcher: plainly not part of the design
export function ProtoSwitcher({
  current,
  keys,
  names,
}: {
  current: string;
  keys: string[];
  names: Record<string, string>;
}) {
  const i = keys.indexOf(current);
  const go = (d: number) => router.setParams({ variant: keys[(i + d + keys.length) % keys.length] });
  return (
    <View testID="proto-switcher" style={styles.switcher} pointerEvents="box-none">
      <View style={styles.pill}>
        <Pressable onPress={() => go(-1)}>
          <Text style={{ color: "#000" }}>◀</Text>
        </Pressable>
        <Text weight="bold" style={{ color: "#000" }}>{`PROTOTYPE ${current} · ${names[current]}`}</Text>
        <Pressable onPress={() => go(1)}>
          <Text style={{ color: "#000" }}>▶</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing[4], gap: spacing[4], borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3] },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  tile: { width: "48.5%", padding: spacing[3], borderRadius: radii.md, gap: 2, minHeight: 76 },
  hero: { gap: spacing[3], padding: spacing[5], borderRadius: radii.lg },
  line: { flexDirection: "row", gap: spacing[2] },
  tomorrow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing[3], gap: 2 },
  receipt: { gap: spacing[2], padding: spacing[4], borderRadius: radii.lg, borderWidth: 1 },
  streak: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[3],
    borderRadius: radii.md,
  },
  switcher: { position: "absolute", bottom: 96, left: 0, right: 0, alignItems: "center" },
  pill: {
    flexDirection: "row",
    gap: spacing[3],
    alignItems: "center",
    backgroundColor: "#FDE047",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
});
