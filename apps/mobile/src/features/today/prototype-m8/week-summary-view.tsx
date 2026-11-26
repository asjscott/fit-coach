// PROTOTYPE (M8, throwaway): two variants of the Week Summary screen, ?variant=A|B. Made-up data.
import { useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Ring } from "@/components/ring";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { radii, spacing, useTheme, type ColorToken } from "@/theme";
import { ProtoSwitcher } from "./summaries";

const NAMES = { A: "Sections", B: "Scorecard" };

// Sets credited against each Muscle's Weekly Budget
const MUSCLES: [string, number, number][] = [
  ["Chest", 12, 12],
  ["Upper back", 14, 12],
  ["Quads", 11, 12],
  ["Hamstrings", 10, 10],
  ["Glutes", 9, 10],
  ["Shoulders", 6, 10],
  ["Biceps", 7, 8],
  ["Triceps", 8, 8],
  ["Calves", 2, 6],
  ["Core", 8, 8],
  ["Lats", 10, 10],
];
const PRS = ["Floor press · 35.5 lb × 10", "Goblet squat · 44 lb × 12"];
const MOVED = [
  ["One-arm dumbbell row", "↑ 44 lb × 10"],
  ["Romanian deadlift", "↑ 48.5 lb × 10"],
  ["Lateral raise", "↓ back to 15 lb (missed twice)"],
];
const DAYS = [
  ["M", 2510, true],
  ["T", 3050, true],
  ["W", 2880, true],
  ["T", 2900, true],
  ["F", 2640, false],
  ["S", 3320, false],
  ["S", 2790, true],
] as const;

function Bar({ fill, color }: { fill: number; color: ColorToken }) {
  const { colors } = useTheme();
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.raised, flex: 1 }}>
      <View
        style={{ width: `${Math.min(fill, 1) * 100}%`, height: 6, borderRadius: 3, backgroundColor: colors[color] }}
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.section, { borderTopColor: colors.line }]}>
      <Text size="xs" weight="semiBold" color="muted">
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function Pair({ left, right, color = "muted" }: { left: string; right: string; color?: ColorToken }) {
  return (
    <View style={styles.between}>
      <Text>{left}</Text>
      <Text color={color} weight="semiBold">
        {right}
      </Text>
    </View>
  );
}

// A: one long page in sections, Training, Muscles, Food, Body, the order the card reads in
function VariantA() {
  return (
    <View style={{ gap: spacing[2] }}>
      <Text size="sm" color="muted">
        Mon Nov 23 – Sun Nov 29 · Week 3 of your Block
      </Text>
      <Section title="Training">
        <View style={{ flexDirection: "row", gap: spacing[4], alignItems: "center" }}>
          <Ring done={3} target={3} size={64} color="success" />
          <View style={{ gap: 2, flex: 1 }}>
            <Text size="xl" weight="bold">
              3 of 3 Workouts
            </Text>
            <Text color="muted">🔥 4-week streak · 42 Sets · 2 h 31 min</Text>
          </View>
        </View>
        <Text weight="semiBold">2 PRs</Text>
        {PRS.map((p) => (
          <Text key={p} color="muted">{`⭐ ${p}`}</Text>
        ))}
        <Text weight="semiBold">Moved</Text>
        {MOVED.map(([n, m]) => (
          <Pair key={n} left={n} right={m} color={m.startsWith("↑") ? "success" : "warning"} />
        ))}
      </Section>
      <Section title="Weekly Budget · 9 of 11 Muscles met">
        {MUSCLES.map(([m, done, budget]) => (
          <View key={m} style={styles.muscle}>
            <Text size="sm" style={{ width: 92 }}>
              {m}
            </Text>
            <Bar fill={done / budget} color={done >= budget ? "success" : "accent"} />
            <Text size="sm" color="muted" style={{ width: 44, textAlign: "right" }}>{`${done}/${budget}`}</Text>
          </View>
        ))}
      </Section>
      <Section title="Food">
        <Pair left="Calories, daily average" right="2,870 · in range" color="success" />
        <Pair left="Protein, daily average" right="171 g · in range" color="success" />
        <Text size="sm" color="muted">
          5 of 7 days in range for calories · Friday under, Saturday over
        </Text>
      </Section>
      <Section title="Body">
        <Pair left="Weigh-in" right="79.6 kg · −0.4 kg" />
        <Pair left="Readiness, average" right="11.2 · up from 10.4" color="success" />
      </Section>
    </View>
  );
}

// B: a scorecard. One sentence from the Coach on top, a grid of tiles, then the details folded below
function Tile({ big, label, color = "text" }: { big: string; label: string; color?: ColorToken }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: colors.raised }]}>
      <Text size="2xl" weight="bold" color={color}>
        {big}
      </Text>
      <Text size="xs" color="muted">
        {label}
      </Text>
    </View>
  );
}

function VariantB() {
  const { colors } = useTheme();
  const under = MUSCLES.filter(([, d, b]) => d < b);
  return (
    <View style={{ gap: spacing[4] }}>
      <View style={[styles.hero, { backgroundColor: colors.successSoft }]}>
        <Text size="xs" weight="semiBold" color="muted">
          NOV 23 – 29
        </Text>
        <Text size="3xl" weight="extraBold">
          A full week, and two PRs.
        </Text>
        <Text>Every Workout done, food in range on average, and 0.4 kg down.</Text>
      </View>
      <View style={styles.grid}>
        <Tile big="3/3" label="Workouts" color="success" />
        <Tile big="🔥 4" label="Week streak" />
        <Tile big="2,870" label="kcal a day · in range" color="success" />
        <Tile big="171 g" label="protein a day · in range" color="success" />
        <Tile big="−0.4 kg" label="since last Weigh-in" />
        <Tile big="11.2" label="Readiness · ↑ 0.8" />
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text weight="bold">Weekly Budget · 9 of 11 met</Text>
        <Text size="sm" color="muted">
          Short:
        </Text>
        <View style={styles.chips}>
          {under.map(([m, d, b]) => (
            <View key={m} style={[styles.chip, { backgroundColor: colors.accentSoft }]}>
              <Text size="sm">{`${m} ${d}/${b}`}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text weight="bold">Progress</Text>
        {PRS.map((p) => (
          <Text key={p}>{`⭐ PR · ${p}`}</Text>
        ))}
        {MOVED.map(([n, m]) => (
          <Pair key={n} left={n} right={m} color={m.startsWith("↑") ? "success" : "warning"} />
        ))}
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text weight="bold">Calories each day</Text>
        <View style={styles.days}>
          {DAYS.map(([d, kcal, ok], i) => (
            <View key={i} style={{ alignItems: "center", gap: 4, flex: 1 }}>
              <View
                style={{
                  height: (kcal / 3400) * 80,
                  width: 18,
                  borderRadius: 4,
                  backgroundColor: ok ? colors.success : kcal > 3000 ? colors.danger : colors.accent,
                }}
              />
              <Text size="xs" color="muted">
                {d}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function WeekSummaryPrototype() {
  const { variant } = useLocalSearchParams<{ variant?: string }>();
  const v = variant === "B" ? "B" : "A";
  return (
    <>
      <Screen scroll="screen" edges={["bottom"]}>
        {v === "A" ? <VariantA /> : <VariantB />}
        <View style={{ height: 80 }} />
      </Screen>
      <ProtoSwitcher current={v} keys={["A", "B"]} names={NAMES} />
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing[3], paddingVertical: spacing[4], borderTopWidth: StyleSheet.hairlineWidth },
  between: { flexDirection: "row", justifyContent: "space-between", gap: spacing[2] },
  muscle: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  hero: { gap: spacing[2], padding: spacing[5], borderRadius: radii.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  tile: { width: "48.5%", padding: spacing[3], borderRadius: radii.md, gap: 2 },
  card: { padding: spacing[4], gap: spacing[2], borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  chip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  days: { flexDirection: "row", alignItems: "flex-end", height: 110, paddingTop: spacing[2] },
});
