// PROTOTYPE (M7), throwaway: three ways Today could show the day's food against the Daily Targets, and the Weigh-in.
// Each variant renders in its own slot of TodayView, so they disagree about where the food goes as well as how it looks
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon } from "@/components/icons";
import { Progress, ProgressFilledTrack } from "@/components/progress";
import { Ring } from "@/components/ring";
import { Text } from "@/components/text";
import { useWeightUnit } from "@/features/user/current-user-provider";
import { radii, spacing, useTheme } from "@/theme";
import { eatenBase, fmt, nudge, setProto, targets, useProto } from "./prototype-data";
import { TodayD, TodayE, TodayF } from "./variants-def";
import { TodayG, TodayH, TodayI } from "./variants-ghi";

export type TodaySlot = "top" | "afterCard" | "afterWeek";

const openFood = () => router.navigate("/food");

function useEaten() {
  const { water } = useProto();
  return { ...eatenBase, water };
}

function useWeighInLabel() {
  const unit = useWeightUnit();
  return unit === "lb" ? "181.6 lb" : "82.4 kg";
}

const rows = (e: ReturnType<typeof useEaten>) => [
  { label: "Calories", value: `${fmt(e.kcal)} / ${fmt(targets.kcal)} kcal`, pct: (e.kcal / targets.kcal) * 100 },
  { label: "Protein", value: `${fmt(e.protein)} / ${targets.protein} g`, pct: (e.protein / targets.protein) * 100 },
  { label: "Fibre", value: `${fmt(e.fibre)} / ${targets.fibre} g`, pct: (e.fibre / targets.fibre) * 100 },
  {
    label: "Water",
    value: `${(e.water / 1000).toFixed(2)} / ${(targets.water / 1000).toFixed(2)} L`,
    pct: (e.water / targets.water) * 100,
  },
];

export function TodayNutrition({ slot }: { slot: TodaySlot }) {
  const { variant } = useProto();
  if (variant === "A" && slot === "afterCard") return <BarsCard />;
  if (variant === "B" && slot === "top") return <WeighInCard />;
  if (variant === "B" && slot === "afterWeek") return <RingTiles />;
  if (variant === "C" && slot === "top") return <CoachLine />;
  if (variant === "D" && slot === "afterCard") return <TodayD />;
  if (variant === "E" && slot === "afterCard") return <TodayE />;
  if (variant === "F" && slot === "afterCard") return <TodayF />;
  if ((variant === "G" || variant === "J") && slot === "top") return <TodayG />;
  if (variant === "H" && slot === "top") return <TodayH />;
  if (variant === "I" && slot === "top") return <TodayI />;
  return null;
}

// A: one card under the Day's Workout, four labelled bars, the nudge, and a Weigh-in row on the Weigh-in Day
function BarsCard() {
  const { colors } = useTheme();
  const eaten = useEaten();
  const { weighedIn } = useProto();
  const weight = useWeighInLabel();
  return (
    <View style={{ marginTop: spacing[3], gap: spacing[3] }}>
      <Pressable
        onPress={openFood}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}
      >
        <View style={styles.rowBetween}>
          <Text weight="semiBold">Eaten today</Text>
          <Text size="sm" color="accent" weight="semiBold">
            {nudge(eaten)}
          </Text>
        </View>
        {rows(eaten).map((r) => (
          <View key={r.label} style={{ gap: 4 }}>
            <View style={styles.rowBetween}>
              <Text size="sm" color="muted">
                {r.label}
              </Text>
              <Text size="sm">{r.value}</Text>
            </View>
            <Progress value={r.pct} size="md">
              <ProgressFilledTrack />
            </Progress>
          </View>
        ))}
        <Text size="sm" color="accent">
          Log food →
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setProto({ weighedIn: !weighedIn })}
        style={[styles.inlineRow, { backgroundColor: colors.raised }]}
      >
        <Icon name="weight" size={18} />
        <Text size="sm" weight="semiBold" style={{ flex: 1 }}>
          {weighedIn ? `This week: ${weight}` : "Monday: log this week's weight"}
        </Text>
        <Text size="sm" color={weighedIn ? "success" : "accent"}>
          {weighedIn ? "Logged" : "Log"}
        </Text>
      </Pressable>
    </View>
  );
}

// B: the Weigh-in as a prompt above everything on Monday, gone once logged
function WeighInCard() {
  const { colors } = useTheme();
  const { weighedIn } = useProto();
  if (weighedIn) return null;
  return (
    <View
      style={[styles.card, { backgroundColor: colors.accentSoft, borderColor: colors.line, marginBottom: spacing[3] }]}
    >
      <Text weight="semiBold">It's Monday: time to weigh in.</Text>
      <Text size="sm" color="muted">
        Before breakfast, once a week. Your Daily Targets follow it.
      </Text>
      <Pressable onPress={() => setProto({ weighedIn: true })}>
        <Text size="sm" color="accent" weight="semiBold">
          Log weight
        </Text>
      </Pressable>
    </View>
  );
}

// B: food as a second row of tiles under This week, four rings, the nudge as the heading
function RingTiles() {
  const { colors } = useTheme();
  const eaten = useEaten();
  const tiles = [
    { label: "kcal", done: eaten.kcal, target: targets.kcal, text: fmt(targets.kcal - eaten.kcal), sub: "left" },
    {
      label: "protein",
      done: eaten.protein,
      target: targets.protein,
      text: `${eaten.protein} g`,
      sub: `of ${targets.protein}`,
    },
    { label: "fibre", done: eaten.fibre, target: targets.fibre, text: `${eaten.fibre} g`, sub: `of ${targets.fibre}` },
    {
      label: "water",
      done: eaten.water,
      target: targets.water,
      text: `${(eaten.water / 1000).toFixed(1)} L`,
      sub: `of ${(targets.water / 1000).toFixed(1)}`,
    },
  ];
  return (
    <Pressable onPress={openFood} style={{ marginTop: spacing[4], gap: spacing[2] }}>
      <View style={styles.rowBetween}>
        <Text size="xs" color="muted" weight="semiBold">
          FOOD TODAY
        </Text>
        <Text size="sm" weight="semiBold">
          {nudge(eaten)}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: spacing[2] }}>
        {tiles.map((t) => (
          <View key={t.label} style={[styles.ringTile, { backgroundColor: colors.raised }]}>
            <RingNoCount done={t.done} target={t.target} />
            <Text size="sm" weight="semiBold">
              {t.text}
            </Text>
            <Text size="2xs" color="muted">
              {`${t.label} · ${t.sub}`}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

// Ring draws its count in the middle, which is noise for 1,240 kcal: wrap it so the number sits below instead
function RingNoCount({ done, target }: { done: number; target: number }) {
  const pct = Math.round((Math.min(done, target) / target) * 100);
  return <Ring done={pct} target={100} size={44} stroke={5} />;
}

// C: no card at all, one coaching sentence above the Day's Workout with a thin split bar, the Weigh-in as a chip in it
function CoachLine() {
  const { colors } = useTheme();
  const eaten = useEaten();
  const { weighedIn } = useProto();
  const weight = useWeighInLabel();
  const thin = rows(eaten);
  return (
    <View style={{ marginBottom: spacing[4], gap: spacing[2] }}>
      <Pressable onPress={openFood} style={{ gap: spacing[2] }}>
        <Text size="xl" weight="bold">
          {nudge(eaten)}.
        </Text>
        <Text size="sm" color="muted">
          {`${fmt(eaten.kcal)} of ${fmt(targets.kcal)} kcal · protein ${eaten.protein} of ${targets.protein} g · fibre ${eaten.fibre} of ${targets.fibre} g · water ${(eaten.water / 1000).toFixed(1)} of ${(targets.water / 1000).toFixed(1)} L`}
        </Text>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {thin.map((r) => (
            <Progress key={r.label} value={r.pct} size="sm" style={{ flex: 1 }}>
              <ProgressFilledTrack />
            </Progress>
          ))}
        </View>
      </Pressable>
      <View style={{ flexDirection: "row", gap: spacing[2] }}>
        <Pressable onPress={openFood} style={[styles.chip, { borderColor: colors.line }]}>
          <Icon name="plus" size={14} />
          <Text size="sm">Food</Text>
        </Pressable>
        <Pressable
          onPress={() => setProto({ water: eaten.water + 250 })}
          style={[styles.chip, { borderColor: colors.line }]}
        >
          <Icon name="plus" size={14} />
          <Text size="sm">250 ml water</Text>
        </Pressable>
        <Pressable
          onPress={() => setProto({ weighedIn: !weighedIn })}
          style={[styles.chip, { borderColor: weighedIn ? colors.line : colors.accent }]}
        >
          <Icon name="weight" size={14} />
          <Text size="sm" color={weighedIn ? "muted" : "accent"}>
            {weighedIn ? weight : "Weigh in"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing[4], borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, gap: spacing[3] },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radii.md,
  },
  ringTile: { flex: 1, alignItems: "center", gap: 2, paddingVertical: spacing[3], borderRadius: radii.md },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.pill,
    borderWidth: 1,
  },
});
