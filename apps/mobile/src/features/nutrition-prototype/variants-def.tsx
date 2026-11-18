// PROTOTYPE (M7), throwaway: Today and Food tab variants D, E and F, each borrowing a structure from an established
// food logger: D a diary with the calorie equation (MyFitnessPal), E foods coloured by calorie density with a coaching
// voice (Noom), F a time-ordered log with a docked quick-log bar and a full targets grid (MacroFactor, Cronometer)
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Icon } from "@/components/icons";
import { Progress, ProgressFilledTrack } from "@/components/progress";
import { Text } from "@/components/text";
import { useWeightUnit } from "@/features/user/current-user-provider";
import { radii, spacing, useTheme } from "@/theme";
import { eatenBase, fmt, type Meal, meals, nudge, recent, setProto, targets, useProto } from "./prototype-data";

const openFood = () => router.navigate("/food");
const mealKcal = (m: Meal) => Math.round(m.entries.reduce((t, e) => t + e.kcal, 0));
const litres = (ml: number) => (ml / 1000).toFixed(2);

function useEaten() {
  const { water } = useProto();
  return { ...eatenBase, water };
}

// Carbs and fat aren't in the fake entries; rough figures so F's full grid has something to show
const carbsFat = { carbs: 132, carbsTarget: 245, fat: 38, fatTarget: 73 };

// ---------------------------------------------------------------------------------------------------------------
// D: the calorie equation. Goal − Food = Remaining, then a plain diary under it

function Equation({ big = false }: { big?: boolean }) {
  const eaten = useEaten();
  const cell = (value: string, label: string, accent = false) => (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text size={big ? "xl" : "lg"} weight="bold" color={accent ? "accent" : "text"}>
        {value}
      </Text>
      <Text size="2xs" color="muted">
        {label}
      </Text>
    </View>
  );
  const op = (s: string) => (
    <Text size="lg" color="muted">
      {s}
    </Text>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {cell(fmt(targets.kcal), "Target")}
      {op("−")}
      {cell(fmt(eaten.kcal), "Food")}
      {op("=")}
      {cell(fmt(targets.kcal - eaten.kcal), "Remaining", true)}
    </View>
  );
}

function SmallBars() {
  const eaten = useEaten();
  const items = [
    ["Protein", eaten.protein, targets.protein, "g"],
    ["Fibre", eaten.fibre, targets.fibre, "g"],
    ["Water", eaten.water / 1000, targets.water / 1000, "L"],
  ] as const;
  return (
    <View style={{ flexDirection: "row", gap: spacing[3] }}>
      {items.map(([label, done, target, unit]) => (
        <View key={label} style={{ flex: 1, gap: 4 }}>
          <Text size="xs" color="muted">
            {label}
          </Text>
          <Progress value={(done / target) * 100} size="sm">
            <ProgressFilledTrack />
          </Progress>
          <Text size="xs">{`${unit === "L" ? done.toFixed(1) : done} / ${unit === "L" ? target.toFixed(1) : target} ${unit}`}</Text>
        </View>
      ))}
    </View>
  );
}

export function TodayD() {
  const { colors } = useTheme();
  const { weighedIn } = useProto();
  const unit = useWeightUnit();
  return (
    <Pressable
      onPress={openFood}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line, marginTop: spacing[3] }]}
    >
      <Text size="xs" color="muted" weight="semiBold">
        CALORIES REMAINING
      </Text>
      <Equation />
      <SmallBars />
      <View
        style={[
          styles.rowBetween,
          { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line, paddingTop: spacing[3] },
        ]}
      >
        <Pressable
          onPress={() => setProto({ weighedIn: !weighedIn })}
          style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
        >
          <Icon name="weight" size={16} />
          <Text size="sm" color={weighedIn ? "muted" : "accent"}>
            {weighedIn ? (unit === "lb" ? "181.6 lb this week" : "82.4 kg this week") : "Weigh in"}
          </Text>
        </Pressable>
        <Text size="sm" color="accent" weight="semiBold">
          Add food
        </Text>
      </View>
    </Pressable>
  );
}

export function FoodD() {
  const { colors } = useTheme();
  const { water } = useProto();
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={[styles.rowBetween, { padding: spacing[3], backgroundColor: colors.surface }]}>
        <Text color="accent">◀</Text>
        <Text weight="semiBold">Today</Text>
        <Text color="subtle">▶</Text>
      </View>
      <View style={{ padding: spacing[4], gap: spacing[4], backgroundColor: colors.surface, marginTop: 1 }}>
        <Equation big />
        <SmallBars />
      </View>
      {meals.map((meal) => (
        <View key={meal.name} style={{ marginTop: spacing[3], backgroundColor: colors.surface }}>
          <View style={[styles.rowBetween, styles.dRow, { borderColor: colors.line }]}>
            <Text weight="semiBold">{meal.name}</Text>
            <Text weight="semiBold">{mealKcal(meal) || ""}</Text>
          </View>
          {meal.entries.map((e) => (
            <View key={e.name} style={[styles.rowBetween, styles.dRow, { borderColor: colors.line }]}>
              <View style={{ flex: 1 }}>
                <Text size="sm">{e.name}</Text>
                <Text size="xs" color="muted">{`${e.portion} · P ${e.protein} g · Fibre ${e.fibre} g`}</Text>
              </View>
              <Text size="sm">{e.kcal}</Text>
            </View>
          ))}
          <View style={[styles.rowBetween, styles.dRow, { borderColor: colors.line }]}>
            <Text size="sm" color="accent" weight="bold">
              ADD FOOD
            </Text>
            <Text size="sm" color="muted">
              ⋯ Copy yesterday's
            </Text>
          </View>
        </View>
      ))}
      <View style={{ marginTop: spacing[3], backgroundColor: colors.surface }}>
        <View style={[styles.rowBetween, styles.dRow, { borderColor: colors.line }]}>
          <Text weight="semiBold">Water</Text>
          <Text weight="semiBold">{`${litres(water)} L`}</Text>
        </View>
        <View style={[styles.dRow, { flexDirection: "row", gap: spacing[5], borderColor: colors.line }]}>
          <Pressable onPress={() => setProto({ water: water + 250 })}>
            <Text size="sm" color="accent" weight="bold">
              + 250 ML
            </Text>
          </Pressable>
          <Pressable onPress={() => setProto({ water: water + 500 })}>
            <Text size="sm" color="accent" weight="bold">
              + 500 ML
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// E: foods coloured by how many calories they pack for their weight, and a coach that talks

type Shade = "green" | "yellow" | "orange";
const SHADES: Record<Shade, string> = { green: "#22C55E", yellow: "#EAB308", orange: "#F97316" };
const shadeOf: Record<string, Shade> = {
  "Eggs, whole, cooked": "yellow",
  "Dempster's 100% Whole Wheat": "orange",
  Raspberries: "green",
  "Chicken breast, roasted": "yellow",
  "Black beans, canned": "green",
  "Brown rice, cooked": "yellow",
  "Greek yogurt, plain 0%": "green",
  Apple: "green",
};
const kcalByShade = () => {
  const t: Record<Shade, number> = { green: 0, yellow: 0, orange: 0 };
  meals.forEach((m) => m.entries.forEach((e) => (t[shadeOf[e.name] ?? "yellow"] += e.kcal)));
  return t;
};

function ShadeBar() {
  const { colors } = useTheme();
  const t = kcalByShade();
  return (
    <View style={{ gap: 6 }}>
      <View
        style={{
          flexDirection: "row",
          height: 14,
          borderRadius: radii.pill,
          overflow: "hidden",
          backgroundColor: colors.line,
        }}
      >
        {(Object.keys(t) as Shade[]).map((s) => (
          <View key={s} style={{ width: `${(t[s] / targets.kcal) * 100}%`, backgroundColor: SHADES[s] }} />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: spacing[3] }}>
        {(Object.keys(t) as Shade[]).map((s) => (
          <View key={s} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={[styles.dot, { backgroundColor: SHADES[s] }]} />
            <Text size="xs" color="muted">{`${Math.round(t[s])} kcal`}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const nextMeal = (meals.find((m) => !m.entries.length)?.name ?? "Snacks").toLowerCase();

export function TodayE() {
  const { colors } = useTheme();
  const eaten = useEaten();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line, marginTop: spacing[3] }]}>
      <View style={{ flexDirection: "row", gap: spacing[3], alignItems: "flex-start" }}>
        <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
          <Icon name="target" size={18} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text weight="semiBold">{`${nudge(eaten)}.`}</Text>
          <Text size="sm" color="muted">
            {`Mostly green so far. ${targets.protein - eaten.protein} g of protein still to go: a palm of chicken or fish at dinner would cover most of it.`}
          </Text>
        </View>
      </View>
      <ShadeBar />
      <Pressable onPress={openFood} style={[styles.bigButton, { backgroundColor: colors.accent }]}>
        <Text weight="semiBold" color="onAccent">{`Log ${nextMeal}`}</Text>
      </Pressable>
    </View>
  );
}

export function FoodE() {
  const { colors } = useTheme();
  const eaten = useEaten();
  const { water } = useProto();
  return (
    <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 120 }}>
      <View style={{ gap: spacing[2] }}>
        <Text size="2xl" weight="bold">{`${fmt(targets.kcal - eaten.kcal)} kcal to go`}</Text>
        <ShadeBar />
        <Text size="xs" color="muted">
          Green foods are light for their weight, orange ones dense. No food is off limits.
        </Text>
      </View>
      {meals.map((meal) =>
        meal.entries.length ? (
          <View key={meal.name} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={styles.rowBetween}>
              <Text weight="semiBold">{meal.name}</Text>
              <Text size="sm" color="muted">{`${mealKcal(meal)} kcal`}</Text>
            </View>
            {meal.entries.map((e) => (
              <View key={e.name} style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
                <View style={[styles.dot, { backgroundColor: SHADES[shadeOf[e.name] ?? "yellow"] }]} />
                <Text size="sm" style={{ flex: 1 }}>
                  {e.name}
                </Text>
                <Text size="sm" color="muted">
                  {e.kcal}
                </Text>
              </View>
            ))}
            <Text size="sm" color="accent">
              + Add more
            </Text>
          </View>
        ) : (
          <Pressable key={meal.name} style={[styles.bigButton, { backgroundColor: colors.accent }]}>
            <Text weight="semiBold" color="onAccent">{`Log ${meal.name.toLowerCase()}`}</Text>
            <Text size="xs" color="onAccent">
              or copy yesterday's
            </Text>
          </Pressable>
        ),
      )}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={styles.rowBetween}>
          <Text weight="semiBold">Water</Text>
          <Text size="sm" color="muted">{`${litres(water)} of ${litres(targets.water)} L`}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: spacing[2] }}>
          {[250, 500].map((ml) => (
            <Pressable
              key={ml}
              onPress={() => setProto({ water: water + ml })}
              style={[styles.outline, { borderColor: colors.accent }]}
            >
              <Text color="accent" weight="semiBold">{`+${ml} ml`}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// F: the week at a glance on Today; on Food, a full targets grid, the day in time order, and a log bar docked above
// the tabs so adding a food is always one tap from anywhere on the page

const week = [2210, 2390, 1980, 2280, 2350, 2190, 1264];
// The last 7 days, ending today
const days = Array.from({ length: 7 }, (_, i) => "SMTWTFS"[(new Date().getDay() + 1 + i) % 7]!);

export function TodayF() {
  const { colors } = useTheme();
  const eaten = useEaten();
  const max = 2600;
  return (
    <Pressable
      onPress={openFood}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line, marginTop: spacing[3] }]}
    >
      <View style={styles.rowBetween}>
        <Text weight="semiBold">Last 7 days</Text>
        <Text size="sm" color="muted">
          avg 2,201 kcal
        </Text>
      </View>
      <View style={{ height: 80, flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: (targets.kcal / max) * 80,
            borderTopWidth: 1,
            borderStyle: "dashed",
            borderColor: colors.muted,
          }}
        />
        {week.map((k, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center", gap: 2 }}>
            <View
              style={{
                width: "70%",
                height: (k / max) * 64,
                borderRadius: 3,
                backgroundColor: i === 6 ? colors.accent : colors.subtle,
              }}
            />
            <Text size="2xs" color={i === 6 ? "accent" : "muted"}>
              {days[i]}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row" }}>
        {[
          [fmt(targets.kcal - eaten.kcal), "kcal left"],
          [`${targets.protein - eaten.protein} g`, "protein left"],
          [`${eaten.fibre} g`, `fibre of ${targets.fibre}`],
          [`${(eaten.water / 1000).toFixed(1)} L`, `water of ${(targets.water / 1000).toFixed(1)}`],
        ].map(([v, l]) => (
          <View key={l} style={{ flex: 1 }}>
            <Text weight="bold">{v}</Text>
            <Text size="2xs" color="muted">
              {l}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const times: Record<string, string> = {
  "Eggs, whole, cooked": "7:40",
  "Dempster's 100% Whole Wheat": "7:40",
  Raspberries: "7:45",
  "Chicken breast, roasted": "12:30",
  "Black beans, canned": "12:30",
  "Brown rice, cooked": "12:30",
  "Greek yogurt, plain 0%": "12:50",
  Apple: "15:15",
};

export function FoodF() {
  const { colors } = useTheme();
  const eaten = useEaten();
  const [allTargets, setAllTargets] = useState(false);
  const grid = [
    ["Calories", eaten.kcal, targets.kcal, "kcal"],
    ["Protein", eaten.protein, targets.protein, "g"],
    ["Fibre", eaten.fibre, targets.fibre, "g"],
    ["Water", eaten.water / 1000, targets.water / 1000, "L"],
    ["Carbs", carbsFat.carbs, carbsFat.carbsTarget, "g"],
    ["Fat", carbsFat.fat, carbsFat.fatTarget, "g"],
  ] as const;
  const shown = allTargets ? grid : grid.slice(0, 4);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: 200 }}>
        <View style={styles.rowBetween}>
          <Text color="accent">◀</Text>
          <Text weight="semiBold">Today</Text>
          <Text color="subtle">▶</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
          {shown.map(([label, done, target, unit]) => (
            <View key={label} style={[styles.gridCell, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Text size="xs" color="muted">
                {label}
              </Text>
              <Text weight="semiBold">{`${unit === "L" ? done.toFixed(2) : fmt(done)} / ${unit === "L" ? target.toFixed(2) : fmt(target)} ${unit}`}</Text>
              <Progress value={(done / target) * 100} size="sm">
                <ProgressFilledTrack />
              </Progress>
            </View>
          ))}
        </View>
        <Pressable onPress={() => setAllTargets(!allTargets)}>
          <Text size="sm" color="accent">
            {allTargets ? "Fewer targets" : "All targets"}
          </Text>
        </Pressable>
        {meals
          .filter((m) => m.entries.length)
          .map((m) => (
            <View key={m.name} style={{ gap: spacing[2] }}>
              <Text size="xs" color="muted" weight="semiBold">{`${m.name.toUpperCase()} · ${mealKcal(m)} kcal`}</Text>
              {m.entries.map((e) => (
                <View key={e.name} style={{ flexDirection: "row", gap: spacing[3], alignItems: "center" }}>
                  <Text size="xs" color="subtle" style={{ width: 36 }}>
                    {times[e.name]}
                  </Text>
                  <View style={{ flex: 1, borderLeftWidth: 2, borderColor: colors.line, paddingLeft: spacing[3] }}>
                    <Text size="sm">{e.name}</Text>
                    <Text size="xs" color="muted">{`${e.portion} · ${e.kcal} kcal · ${e.protein} g P`}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        <Text size="xs" color="muted" weight="semiBold">
          DINNER
        </Text>
        <Text size="sm" color="subtle">
          Nothing yet · Copy yesterday's dinner
        </Text>
      </ScrollView>
      <View style={[styles.dock, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2] }}>
          {["+250 ml water", ...recent.slice(0, 4)].map((r) => (
            <Pressable
              key={r}
              onPress={r.startsWith("+250") ? () => setProto({ water: eaten.water + 250 }) : undefined}
              style={[styles.pill, { borderColor: colors.line }]}
            >
              <Text size="xs">{r}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flexDirection: "row", gap: spacing[2] }}>
          <View style={[styles.search, { borderColor: colors.inputBorder }]}>
            <Icon name="search" size={16} />
            <TextInput
              placeholder="Add to dinner…"
              placeholderTextColor={colors.subtle}
              style={{ flex: 1, color: colors.text }}
            />
          </View>
          <Pressable style={[styles.scanBtn, { backgroundColor: colors.accent }]}>
            <Text size="sm" weight="semiBold" color="onAccent">
              Scan
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing[4], borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, gap: spacing[3] },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  dRow: { paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { width: 10, height: 10, borderRadius: 5 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  bigButton: { borderRadius: radii.md, paddingVertical: spacing[3], alignItems: "center" },
  outline: { flex: 1, borderWidth: 1, borderRadius: radii.md, paddingVertical: spacing[2], alignItems: "center" },
  gridCell: {
    width: "48.5%",
    padding: spacing[3],
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 70,
    padding: spacing[3],
    gap: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pill: { paddingHorizontal: spacing[3], paddingVertical: 6, borderRadius: radii.pill, borderWidth: 1 },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    height: 40,
  },
  scanBtn: { borderRadius: radii.md, paddingHorizontal: spacing[4], justifyContent: "center" },
});
