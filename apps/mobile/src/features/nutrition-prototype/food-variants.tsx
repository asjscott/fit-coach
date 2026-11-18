// PROTOTYPE (M7), throwaway: three structurally different Food tabs. Fake data, no saving: taps only change memory
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Icon } from "@/components/icons";
import { Progress, ProgressFilledTrack } from "@/components/progress";
import { Ring } from "@/components/ring";
import { Text } from "@/components/text";
import { radii, spacing, useTheme } from "@/theme";
import { FoodD, FoodE, FoodF } from "./variants-def";
import { eatenBase, fmt, type Meal, meals, nudge, recent, saved, setProto, targets, useProto } from "./prototype-data";

const mealKcal = (m: Meal) => Math.round(m.entries.reduce((t, e) => t + e.kcal, 0));

export function FoodVariant() {
  const { variant } = useProto();
  if (variant === "B") return <FoodB />;
  if (variant === "C") return <FoodC />;
  if (variant === "D") return <FoodD />;
  if (variant === "E") return <FoodE />;
  if (variant === "F") return <FoodF />;
  return <FoodA />;
}

function DayStepper() {
  const [offset, setOffset] = useState(0);
  const label = offset === 0 ? "Today" : offset === -1 ? "Yesterday" : `${-offset} days ago`;
  return (
    <View style={[styles.rowBetween, { paddingVertical: spacing[2] }]}>
      <Pressable disabled={offset <= -6} onPress={() => setOffset(offset - 1)} style={{ padding: spacing[2] }}>
        <Text color={offset <= -6 ? "subtle" : "accent"}>◀</Text>
      </Pressable>
      <Text weight="semiBold">{label}</Text>
      <Pressable disabled={offset >= 0} onPress={() => setOffset(offset + 1)} style={{ padding: spacing[2] }}>
        <Text color={offset >= 0 ? "subtle" : "accent"}>▶</Text>
      </Pressable>
    </View>
  );
}

function WaterButtons() {
  const { colors } = useTheme();
  const { water } = useProto();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={styles.rowBetween}>
        <Text weight="semiBold">Water</Text>
        <Text size="sm" color="muted">{`${(water / 1000).toFixed(2)} of ${(targets.water / 1000).toFixed(2)} L`}</Text>
      </View>
      <Progress value={(water / targets.water) * 100}>
        <ProgressFilledTrack />
      </Progress>
      <View style={{ flexDirection: "row", gap: spacing[2] }}>
        {[250, 500].map((ml) => (
          <Pressable
            key={ml}
            onPress={() => setProto({ water: water + ml })}
            style={[styles.button, { borderColor: colors.accent, flex: 1 }]}
          >
            <Text color="accent" weight="semiBold">{`+${ml} ml`}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// A: the classic diary. Day stepper, slim totals, then one section per meal with its own Add food and Copy from yesterday
function FoodA() {
  const { colors } = useTheme();
  const { water } = useProto();
  const eaten = { ...eatenBase, water };
  return (
    <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 96 }}>
      <DayStepper />
      <View style={{ flexDirection: "row", gap: spacing[3] }}>
        {[
          ["kcal", eaten.kcal, targets.kcal],
          ["protein g", eaten.protein, targets.protein],
          ["fibre g", eaten.fibre, targets.fibre],
        ].map(([label, done, target]) => (
          <View key={label as string} style={{ flex: 1, gap: 4 }}>
            <Text size="sm" weight="semiBold">{`${fmt(done as number)} / ${fmt(target as number)}`}</Text>
            <Progress value={((done as number) / (target as number)) * 100} size="sm">
              <ProgressFilledTrack />
            </Progress>
            <Text size="xs" color="muted">
              {label}
            </Text>
          </View>
        ))}
      </View>
      {meals.map((meal) => (
        <View key={meal.name} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.rowBetween}>
            <Text weight="semiBold">{meal.name}</Text>
            <Text size="sm" color="muted">{`${mealKcal(meal)} kcal`}</Text>
          </View>
          {meal.entries.map((e) => (
            <View key={e.name} style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text size="sm">{e.name}</Text>
                <Text size="xs" color="muted">{`${e.portion} · ${e.protein} g protein`}</Text>
              </View>
              <Text size="sm">{e.kcal}</Text>
            </View>
          ))}
          <View style={{ flexDirection: "row", gap: spacing[4] }}>
            <Text size="sm" color="accent" weight="semiBold">
              + Add food
            </Text>
            <Text size="sm" color="accent">
              Copy from yesterday
            </Text>
          </View>
        </View>
      ))}
      <WaterButtons />
    </ScrollView>
  );
}

// B: totals first. A big "kcal left" header with rings, the day as one running list, and a floating Add food that
// opens a sheet of ways in (scan, search, recent, saved, copy). Water is a row of glasses to tap
function FoodB() {
  const { colors } = useTheme();
  const { water } = useProto();
  const [sheet, setSheet] = useState(false);
  const eaten = { ...eatenBase, water };
  const glasses = Math.ceil(targets.water / 250);
  const full = Math.floor(water / 250);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 160 }}>
        <DayStepper />
        <View style={{ alignItems: "center", gap: spacing[1], paddingVertical: spacing[3] }}>
          <Text size="4xl" weight="bold">
            {fmt(targets.kcal - eaten.kcal)}
          </Text>
          <Text color="muted">kcal left today</Text>
          {nudge(eaten).includes("protein") ? (
            <Text size="sm" weight="semiBold" color="accent">
              {nudge(eaten)}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          {[
            ["Protein", eaten.protein, targets.protein],
            ["Fibre", eaten.fibre, targets.fibre],
          ].map(([label, done, target]) => (
            <View key={label as string} style={{ alignItems: "center", gap: 4 }}>
              <Ring done={done as number} target={target as number} size={64} />
              <Text size="xs" color="muted">{`${label} of ${target} g`}</Text>
            </View>
          ))}
        </View>
        <View style={{ gap: spacing[2] }}>
          <Text
            size="xs"
            color="muted"
            weight="semiBold"
          >{`WATER · ${(water / 1000).toFixed(2)} of ${(targets.water / 1000).toFixed(2)} L`}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {Array.from({ length: glasses }, (_, i) => (
              <Pressable
                key={i}
                onPress={() => setProto({ water: (i + 1) * 250 })}
                style={[
                  styles.glass,
                  { borderColor: colors.accent, backgroundColor: i < full ? colors.accent : "transparent" },
                ]}
              />
            ))}
          </View>
        </View>
        {meals
          .filter((m) => m.entries.length)
          .flatMap((m) => m.entries.map((e) => ({ ...e, meal: m.name })))
          .map((e, i) => (
            <View
              key={i}
              style={[
                styles.rowBetween,
                { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line, paddingBottom: spacing[2] },
              ]}
            >
              <View style={[styles.mealChip, { backgroundColor: colors.raised }]}>
                <Text size="2xs" color="muted">
                  {e.meal}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text size="sm">{e.name}</Text>
                <Text size="xs" color="muted">
                  {e.portion}
                </Text>
              </View>
              <Text size="sm">{`${e.kcal} kcal`}</Text>
            </View>
          ))}
      </ScrollView>
      {sheet ? (
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.rowBetween}>
            <Text weight="semiBold">Add to Dinner</Text>
            <Pressable onPress={() => setSheet(false)}>
              <Icon name="x" size={20} />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: spacing[2] }}>
            {["Scan", "Search", "Copy yesterday's Dinner"].map((l) => (
              <View key={l} style={[styles.button, { borderColor: colors.accent, flex: 1 }]}>
                <Text size="sm" color="accent" weight="semiBold" centered>
                  {l}
                </Text>
              </View>
            ))}
          </View>
          <Text size="xs" color="muted" weight="semiBold">
            RECENT
          </Text>
          {recent.slice(0, 3).map((r) => (
            <Text key={r} size="sm">{`+  ${r}`}</Text>
          ))}
          <Text size="xs" color="muted" weight="semiBold">
            SAVED FOODS
          </Text>
          {saved.map((r) => (
            <Text key={r} size="sm">{`+  ${r}`}</Text>
          ))}
        </View>
      ) : (
        <Pressable onPress={() => setSheet(true)} style={[styles.fab, { backgroundColor: colors.accent }]}>
          <Icon name="plus" size={20} rawColor={colors.onAccent} />
          <Text weight="semiBold" color="onAccent">
            Add food
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// C: search first. The search box and Scan sit at the top as the main way in, Recent and Saved Foods as one-tap chips,
// and the day folds into one line per meal underneath
function FoodC() {
  const { colors } = useTheme();
  const { water } = useProto();
  const [open, setOpen] = useState<string | null>(null);
  const eaten = { ...eatenBase, water };
  return (
    <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 96 }}>
      <DayStepper />
      <View style={{ flexDirection: "row", gap: spacing[2] }}>
        <View style={[styles.search, { borderColor: colors.inputBorder, flex: 1 }]}>
          <Icon name="search" size={18} />
          <TextInput
            placeholder="Search foods"
            placeholderTextColor={colors.subtle}
            style={{ flex: 1, color: colors.text }}
          />
        </View>
        <Pressable style={[styles.scan, { backgroundColor: colors.accent }]}>
          <Text weight="semiBold" color="onAccent">
            Scan
          </Text>
        </Pressable>
      </View>
      <View style={{ gap: spacing[2] }}>
        <Text size="xs" color="muted" weight="semiBold">
          RECENT AND SAVED
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
          {[...saved.map((s) => `★ ${s}`), ...recent].map((r) => (
            <View key={r} style={[styles.chipC, { borderColor: colors.line, backgroundColor: colors.surface }]}>
              <Text size="sm">{r}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={styles.rowBetween}>
          <Text weight="semiBold">Today so far</Text>
          <Text size="sm" color="accent" weight="semiBold">
            {nudge(eaten)}
          </Text>
        </View>
        <Text
          size="sm"
          color="muted"
        >{`${fmt(eaten.kcal)} kcal · ${eaten.protein} g protein · ${eaten.fibre} g fibre`}</Text>
        {meals.map((m) => (
          <View
            key={m.name}
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderColor: colors.line,
              paddingTop: spacing[2],
              gap: spacing[1],
            }}
          >
            <Pressable onPress={() => setOpen(open === m.name ? null : m.name)} style={styles.rowBetween}>
              <Text size="sm" weight="semiBold">
                {m.name}
              </Text>
              <Text size="sm" color="muted">
                {m.entries.length
                  ? `${m.entries.length} foods · ${mealKcal(m)} kcal  ${open === m.name ? "▲" : "▼"}`
                  : "Copy yesterday's"}
              </Text>
            </Pressable>
            {open === m.name
              ? m.entries.map((e) => (
                  <Text key={e.name} size="sm" color="muted">{`${e.name}, ${e.portion} · ${e.kcal} kcal`}</Text>
                ))
              : null}
          </View>
        ))}
        <View
          style={[
            styles.rowBetween,
            { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line, paddingTop: spacing[2] },
          ]}
        >
          <Text size="sm" weight="semiBold">{`Water ${(water / 1000).toFixed(2)} L`}</Text>
          <View style={{ flexDirection: "row", gap: spacing[3] }}>
            <Pressable onPress={() => setProto({ water: water + 250 })}>
              <Text size="sm" color="accent" weight="semiBold">
                +250
              </Text>
            </Pressable>
            <Pressable onPress={() => setProto({ water: water + 500 })}>
              <Text size="sm" color="accent" weight="semiBold">
                +500
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing[4], borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, gap: spacing[3] },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  button: { borderWidth: 1, borderRadius: radii.md, paddingVertical: spacing[2], alignItems: "center" },
  glass: { width: 22, height: 30, borderWidth: 2, borderRadius: 4 },
  mealChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm, width: 72, alignItems: "center" },
  fab: {
    position: "absolute",
    right: spacing[4],
    bottom: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: radii.pill,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing[4],
    paddingBottom: 72,
    gap: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    height: 44,
  },
  scan: { borderRadius: radii.md, paddingHorizontal: spacing[4], justifyContent: "center" },
  chipC: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radii.pill, borderWidth: 1 },
});
